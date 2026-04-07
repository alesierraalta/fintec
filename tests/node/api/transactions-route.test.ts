import { DELETE, GET, POST, PUT } from '@/app/api/transactions/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import { canCreateTransaction } from '@/lib/subscriptions/check-limit';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

jest.mock('@/lib/subscriptions/check-limit', () => ({
  canCreateTransaction: jest.fn(),
}));

describe('transactions route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;
  const mockCanCreateTransaction = canCreateTransaction as jest.MockedFunction<
    typeof canCreateTransaction
  >;

  const transactions = {
    findAll: jest.fn(),
    findByAccountId: jest.fn(),
    findByCategoryId: jest.fn(),
    findByDateRange: jest.fn(),
    findByType: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as any);

    mockCreateServerAppRepository.mockReturnValue({
      transactions,
    } as any);

    mockCanCreateTransaction.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 0,
    } as any);
  });

  describe('GET /api/transactions', () => {
    it('applies SQL-level limit in unfiltered query', async () => {
      transactions.findAll.mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }]);

      const response = await GET(
        new Request('http://localhost/api/transactions?limit=2') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(transactions.findAll).toHaveBeenCalledWith(2);
      expect(body.count).toBe(2);
      expect(body.totalCount).toBe(2);
    });

    it('forwards limit as pagination when filtering by account', async () => {
      transactions.findByAccountId.mockResolvedValue({
        data: [{ id: 'tx-1' }],
        total: 8,
      });

      const response = await GET(
        new Request(
          'http://localhost/api/transactions?accountId=acc-1&limit=5'
        ) as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(transactions.findByAccountId).toHaveBeenCalledWith('acc-1', {
        page: 1,
        limit: 5,
      });
      expect(body.totalCount).toBe(8);
    });

    it('queries category filter when categoryId is provided', async () => {
      transactions.findByCategoryId.mockResolvedValue({
        data: [{ id: 'tx-cat' }],
        total: 1,
      });

      const response = await GET(
        new Request('http://localhost/api/transactions?categoryId=cat-1') as any
      );

      expect(response.status).toBe(200);
      expect(transactions.findByCategoryId).toHaveBeenCalledWith(
        'cat-1',
        undefined
      );
    });

    it('queries date range when startDate and endDate are provided', async () => {
      transactions.findByDateRange.mockResolvedValue({ data: [], total: 0 });

      const response = await GET(
        new Request(
          'http://localhost/api/transactions?startDate=2026-01-01&endDate=2026-01-31&limit=3'
        ) as any
      );

      expect(response.status).toBe(200);
      expect(transactions.findByDateRange).toHaveBeenCalledWith(
        '2026-01-01',
        '2026-01-31',
        { page: 1, limit: 3 }
      );
    });

    it('queries type filter when provided', async () => {
      transactions.findByType.mockResolvedValue({
        data: [{ id: 'tx-expense' }],
        total: 1,
      });

      const response = await GET(
        new Request('http://localhost/api/transactions?type=EXPENSE') as any
      );

      expect(response.status).toBe(200);
      expect(transactions.findByType).toHaveBeenCalledWith(
        'EXPENSE',
        undefined
      );
    });

    it('prioritizes accountId over other filters', async () => {
      transactions.findByAccountId.mockResolvedValue({ data: [], total: 0 });

      const response = await GET(
        new Request(
          'http://localhost/api/transactions?accountId=acc-1&type=INCOME&categoryId=cat-1'
        ) as any
      );

      expect(response.status).toBe(200);
      expect(transactions.findByAccountId).toHaveBeenCalledWith(
        'acc-1',
        undefined
      );
      expect(transactions.findByType).not.toHaveBeenCalled();
      expect(transactions.findByCategoryId).not.toHaveBeenCalled();
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const response = await GET(
        new Request('http://localhost/api/transactions') as any
      );

      expect(response.status).toBe(401);
      expect(transactions.findAll).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid limit values', async () => {
      const response = await GET(
        new Request('http://localhost/api/transactions?limit=0') as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('limit must be a positive integer');
    });

    it('returns 500 when repository lookup fails', async () => {
      transactions.findAll.mockRejectedValue(new Error('db offline'));

      const response = await GET(
        new Request('http://localhost/api/transactions') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to fetch transactions');
      expect(body.details).toBe('db offline');
    });
  });

  describe('POST /api/transactions', () => {
    it('creates debt transaction with OPEN status payload', async () => {
      transactions.create.mockResolvedValue({ id: 'tx-open' });

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 2500,
            type: 'EXPENSE',
            categoryId: 'cat-1',
            isDebt: true,
            debtDirection: 'OWE',
            debtStatus: 'OPEN',
            counterpartyName: 'Juan',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMinor: 2500,
          isDebt: true,
          debtDirection: 'OWE',
          debtStatus: 'OPEN',
          counterpartyName: 'Juan',
        })
      );
    });

    it('applies sensible defaults for non-debt transactions', async () => {
      transactions.create.mockResolvedValue({ id: 'tx-defaults' });

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 5100,
            type: 'INCOME',
            categoryId: 'cat-2',
            tags: 'invalid-tags',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMinor: 5100,
          currencyCode: 'USD',
          description: '',
          tags: undefined,
          isDebt: false,
          debtStatus: undefined,
        })
      );
      expect(
        new Date(transactions.create.mock.calls[0][0].date).toString()
      ).not.toBe('Invalid Date');
    });

    it('creates debt transaction with SETTLED status payload', async () => {
      transactions.create.mockResolvedValue({ id: 'tx-settled' });

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 5100,
            type: 'INCOME',
            categoryId: 'cat-2',
            isDebt: true,
            debtDirection: 'OWED_TO_ME',
            debtStatus: 'SETTLED',
            settledAt: '2026-03-04T00:00:00.000Z',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isDebt: true,
          debtDirection: 'OWED_TO_ME',
          debtStatus: 'SETTLED',
          settledAt: '2026-03-04T00:00:00.000Z',
        })
      );
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any
      );

      expect(response.status).toBe(401);
    });

    it('rejects missing required fields', async () => {
      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({ amount: 1000 }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        'Missing required fields: accountId, amount, type, categoryId'
      );
    });

    it('rejects non-integer amount payloads', async () => {
      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 10.5,
            type: 'EXPENSE',
            categoryId: 'cat-1',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('amount must be an integer in minor units');
    });

    it('rejects debt payload without debtDirection', async () => {
      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 1000,
            type: 'EXPENSE',
            categoryId: 'cat-1',
            isDebt: true,
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('debtDirection is required when isDebt=true');
      expect(transactions.create).not.toHaveBeenCalled();
    });

    it('rejects settled debt payload without settledAt', async () => {
      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 1000,
            type: 'EXPENSE',
            categoryId: 'cat-1',
            isDebt: true,
            debtDirection: 'OWE',
            debtStatus: 'SETTLED',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('settledAt is required when debtStatus=SETTLED');
    });

    it('returns 403 when subscription limit is reached', async () => {
      mockCanCreateTransaction.mockResolvedValue({
        allowed: false,
        reason: 'Plan limit reached',
        current: 100,
        limit: 100,
      } as any);

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 1000,
            type: 'EXPENSE',
            categoryId: 'cat-1',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.limitReached).toBe(true);
      expect(transactions.create).not.toHaveBeenCalled();
    });

    it('returns 500 when repository create fails', async () => {
      transactions.create.mockRejectedValue(new Error('write failed'));

      const response = await POST(
        new Request('http://localhost/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'acc-1',
            amount: 1000,
            type: 'EXPENSE',
            categoryId: 'cat-1',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('write failed');
    });
  });

  describe('PUT /api/transactions', () => {
    it('updates a transaction with a valid body id', async () => {
      transactions.update.mockResolvedValue({ id: 'tx-1' });

      const response = await PUT(
        new Request('http://localhost/api/transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'tx-1', description: 'Updated' }),
        }) as any
      );

      expect(response.status).toBe(200);
      expect(transactions.update).toHaveBeenCalledWith('tx-1', {
        id: 'tx-1',
        description: 'Updated',
      });
    });

    it('returns 401 when update is unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await PUT(
        new Request('http://localhost/api/transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'tx-1' }),
        }) as any
      );

      expect(response.status).toBe(401);
      expect(transactions.update).not.toHaveBeenCalled();
    });

    it('returns 400 when id is missing', async () => {
      const response = await PUT(
        new Request('http://localhost/api/transactions', {
          method: 'PUT',
          body: JSON.stringify({ description: 'Updated' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Transaction ID is required');
    });

    it('returns 500 when update fails', async () => {
      transactions.update.mockRejectedValue(new Error('update failed'));

      const response = await PUT(
        new Request('http://localhost/api/transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'tx-1' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('update failed');
    });
  });

  describe('DELETE /api/transactions', () => {
    it('deletes a transaction by query id', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/transactions?id=tx-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(transactions.delete).toHaveBeenCalledWith('tx-1');
      expect(body.message).toBe('Transaction deleted successfully');
    });

    it('returns 401 when delete is unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await DELETE(
        new Request('http://localhost/api/transactions?id=tx-1') as any
      );

      expect(response.status).toBe(401);
      expect(transactions.delete).not.toHaveBeenCalled();
    });

    it('returns 400 when id query param is missing', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/transactions') as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Transaction ID is required');
    });

    it('returns 500 when delete fails', async () => {
      transactions.delete.mockRejectedValue(new Error('delete failed'));

      const response = await DELETE(
        new Request('http://localhost/api/transactions?id=tx-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('delete failed');
    });
  });
});
