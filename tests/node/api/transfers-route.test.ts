import { DELETE, GET, POST } from '@/app/api/transfers/route';
import { createClient } from '@/lib/supabase/server';
import { createServerTransfersRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerTransfersRepository: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('transfers route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerTransfersRepository =
    createServerTransfersRepository as jest.MockedFunction<
      typeof createServerTransfersRepository
    >;

  const repository = {
    listByUserId: jest.fn(),
    create: jest.fn(),
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
    mockCreateServerTransfersRepository.mockReturnValue(repository as any);
  });

  describe('GET /api/transfers', () => {
    it('lists transfers with normalized transaction amounts and filters', async () => {
      repository.listByUserId.mockResolvedValue([
        {
          id: 'tr-1',
          amountMinor: 200,
          date: '2026-01-10',
          description: 'Move',
          fromTransaction: { id: 'from-1', amountMinor: 200, exchangeRate: 36 },
          toTransaction: {
            id: 'to-1',
            amountMinor: 7200,
            amountBaseMinor: 200,
          },
        },
      ]);

      const response = await GET(
        new Request(
          'http://localhost/api/transfers?accountId=acc-1&startDate=2026-01-01&endDate=2026-01-31&limit=5'
        ) as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(repository.listByUserId).toHaveBeenCalledWith('user-1', {
        accountId: 'acc-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        limit: 5,
      });
      expect(body.data[0].amount).toBe(200);
      expect(body.data[0].toTransaction.amountBaseMinor).toBe(200);
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await GET(
        new Request('http://localhost/api/transfers') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 500 for unexpected listing failures', async () => {
      repository.listByUserId.mockRejectedValue(new Error('list failed'));

      const response = await GET(
        new Request('http://localhost/api/transfers') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('list failed');
    });
  });

  describe('POST /api/transfers', () => {
    it('creates a transfer', async () => {
      repository.create.mockResolvedValue({ id: 'tr-1' });

      const response = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 15.5,
            description: 'Payroll split',
            date: '2026-01-11',
            exchangeRate: 36,
            rateSource: 'manual',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(repository.create).toHaveBeenCalledWith('user-1', {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amountMajor: 15.5,
        description: 'Payroll split',
        date: '2026-01-11',
        exchangeRate: 36,
        rateSource: 'manual',
      });
    });

    it('rejects missing required fields and same-account transfers', async () => {
      const missing = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({ fromAccountId: 'acc-1' }),
        }) as any
      );
      const same = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-1',
            amount: 10,
          }),
        }) as any
      );

      expect(missing.status).toBe(400);
      expect(same.status).toBe(400);
    });

    it('returns 401 when authentication fails', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 10,
          }),
        }) as any
      );

      expect(response.status).toBe(401);
    });

    it('maps domain not-found and balance failures to 404/400', async () => {
      repository.create
        .mockRejectedValueOnce(new Error('Account not found'))
        .mockRejectedValueOnce(new Error('Insufficient balance'));

      const notFound = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 10,
          }),
        }) as any
      );
      const insufficient = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 10,
          }),
        }) as any
      );

      expect(notFound.status).toBe(404);
      expect(insufficient.status).toBe(400);
    });

    it('returns 500 for unexpected creation failures', async () => {
      repository.create.mockRejectedValue(new Error('transfer crashed'));

      const response = await POST(
        new Request('http://localhost/api/transfers', {
          method: 'POST',
          body: JSON.stringify({
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 10,
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('transfer crashed');
    });
  });

  describe('DELETE /api/transfers', () => {
    it('deletes a transfer by id', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/transfers?id=tr-1', {
          method: 'DELETE',
        }) as any
      );

      expect(response.status).toBe(200);
      expect(repository.delete).toHaveBeenCalledWith('user-1', 'tr-1');
    });

    it('returns 401 when authentication fails', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await DELETE(
        new Request('http://localhost/api/transfers?id=tr-1', {
          method: 'DELETE',
        }) as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing id and 404 for missing transfer', async () => {
      repository.delete.mockRejectedValueOnce(new Error('Transfer not found'));

      const missing = await DELETE(
        new Request('http://localhost/api/transfers', {
          method: 'DELETE',
        }) as any
      );
      const notFound = await DELETE(
        new Request('http://localhost/api/transfers?id=tr-404', {
          method: 'DELETE',
        }) as any
      );

      expect(missing.status).toBe(400);
      expect(notFound.status).toBe(404);
    });

    it('returns 500 for unexpected delete failures', async () => {
      repository.delete.mockRejectedValue(new Error('delete exploded'));

      const response = await DELETE(
        new Request('http://localhost/api/transfers?id=tr-1', {
          method: 'DELETE',
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('delete exploded');
    });
  });
});
