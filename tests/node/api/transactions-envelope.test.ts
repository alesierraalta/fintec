import { GET, POST, PUT, DELETE } from '@/app/api/transactions/route';
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

describe('transactions route - envelope format', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServerAppRepository = createServerAppRepository as jest.MockedFunction<typeof createServerAppRepository>;
  const mockCanCreateTransaction = canCreateTransaction as jest.MockedFunction<typeof canCreateTransaction>;

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
    mockCreateServerAppRepository.mockReturnValue({ transactions } as any);
    mockCanCreateTransaction.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 100,
    });
  });

  function createRequest(url: string, init?: RequestInit) {
    return new Request(url, init) as any;
  }

  describe('GET /api/transactions', () => {
    it('should return success envelope with transactions', async () => {
      const mockTransactions = [{ id: 'tx-1', amount: 1000 }];
      transactions.findAll.mockResolvedValue(mockTransactions);

      const request = createRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.data.transactions).toEqual(mockTransactions);
      expect(data.error).toBeNull();
      expect(data.meta.timestamp).toBeDefined();
    });

    it('should return 401 envelope when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = createRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.data).toBeNull();
      expect(data.error.code).toBe('AUTH_ERROR');
    });

    it('should return 400 envelope for invalid limit', async () => {
      const request = createRequest('http://localhost:3000/api/transactions?limit=-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.data).toBeNull();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/transactions', () => {
    it('should return success envelope with created transaction', async () => {
      const mockTransaction = { id: 'tx-1', amount: 1000 };
      transactions.create.mockResolvedValue(mockTransaction);

      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'acc-1',
          amount: 1000,
          type: 'EXPENSE',
          categoryId: 'cat-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(mockTransaction);
      expect(data.error).toBeNull();
      expect(data.meta.timestamp).toBeDefined();
    });

    it('should return 400 envelope for missing fields', async () => {
      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ accountId: 'acc-1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.data).toBeNull();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 envelope for non-integer amount', async () => {
      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'acc-1',
          amount: 10.50,
          type: 'EXPENSE',
          categoryId: 'cat-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 envelope when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      } as any);

      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'acc-1',
          amount: 1000,
          type: 'EXPENSE',
          categoryId: 'cat-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('PUT /api/transactions', () => {
    it('should return success envelope with updated transaction', async () => {
      const mockTransaction = { id: 'tx-1', amount: 2000 };
      transactions.update.mockResolvedValue(mockTransaction);

      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ id: 'tx-1', amount: 2000 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(data.data).toEqual(mockTransaction);
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope when id is missing', async () => {
      const request = createRequest('http://localhost:3000/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ amount: 2000 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/transactions', () => {
    it('should return success envelope when deleted', async () => {
      transactions.delete.mockResolvedValue(undefined);

      const request = createRequest('http://localhost:3000/api/transactions?id=tx-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope when id is missing', async () => {
      const request = createRequest('http://localhost:3000/api/transactions');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
