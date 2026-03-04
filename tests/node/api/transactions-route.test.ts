import { GET, POST } from '@/app/api/transactions/route';
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

describe('GET /api/transactions', () => {
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

    mockCanCreateTransaction.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 0,
    });
  });

  it('applies SQL-level limit in unfiltered query', async () => {
    const findAll = jest
      .fn()
      .mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }]);
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findAll,
      },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/transactions?limit=2') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findAll).toHaveBeenCalledWith(2);
    expect(body.count).toBe(2);
  });

  it('forwards limit as pagination when filtering by account', async () => {
    const findByAccountId = jest.fn().mockResolvedValue({
      data: [{ id: 'tx-1' }],
      total: 8,
    });
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findByAccountId,
      },
    } as any);

    const response = await GET(
      new Request(
        'http://localhost/api/transactions?accountId=acc-1&limit=5'
      ) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findByAccountId).toHaveBeenCalledWith('acc-1', {
      page: 1,
      limit: 5,
    });
    expect(body.totalCount).toBe(8);
  });

  it('returns 400 for invalid limit values', async () => {
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        findAll: jest.fn(),
      },
    } as any);

    const response = await GET(
      new Request('http://localhost/api/transactions?limit=0') as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('limit must be a positive integer');
  });

  it('creates debt transaction with OPEN status payload', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'tx-open' });
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        create,
      },
    } as any);

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
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 2500,
        isDebt: true,
        debtDirection: 'OWE',
        debtStatus: 'OPEN',
        counterpartyName: 'Juan',
      })
    );
  });

  it('creates debt transaction with SETTLED status payload', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'tx-settled' });
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        create,
      },
    } as any);

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
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        isDebt: true,
        debtDirection: 'OWED_TO_ME',
        debtStatus: 'SETTLED',
        settledAt: '2026-03-04T00:00:00.000Z',
      })
    );
  });

  it('rejects debt payload without debtDirection', async () => {
    const create = jest.fn();
    mockCreateServerAppRepository.mockReturnValue({
      transactions: {
        create,
      },
    } as any);

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
    expect(create).not.toHaveBeenCalled();
  });
});
