import { GET, POST, DELETE } from '@/app/api/transfers/route';
import { createClient } from '@/lib/supabase/server';
import { createServerTransfersRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerTransfersRepository: jest.fn(),
}));

describe('transfers route - envelope format', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServerTransfersRepository = createServerTransfersRepository as jest.MockedFunction<typeof createServerTransfersRepository>;

  const transfers = {
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
    mockCreateServerTransfersRepository.mockReturnValue(transfers as any);
  });

  function createRequest(url: string, init?: RequestInit) {
    return new Request(url, init) as any;
  }

  describe('GET /api/transfers', () => {
    it('should return success envelope with transfers', async () => {
      const mockTransfers = [
        {
          id: 'tr-1',
          fromTransaction: { id: 'tx-1', amountMinor: 1000 },
          toTransaction: { id: 'tx-2', amountMinor: 1000 },
          amountMinor: 1000,
          date: '2026-01-01',
          description: 'Test transfer',
        },
      ];
      transfers.listByUserId.mockResolvedValue(mockTransfers);

      const request = createRequest('http://localhost:3000/api/transfers');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.transfers).toHaveLength(1);
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

      const request = createRequest('http://localhost:3000/api/transfers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('POST /api/transfers', () => {
    it('should return success envelope with created transfer', async () => {
      const mockTransfer = { id: 'tr-1' };
      transfers.create.mockResolvedValue(mockTransfer);

      const request = createRequest('http://localhost:3000/api/transfers', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 1000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(mockTransfer);
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope for missing fields', async () => {
      const request = createRequest('http://localhost:3000/api/transfers', {
        method: 'POST',
        body: JSON.stringify({ fromAccountId: 'acc-1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 envelope for same account transfer', async () => {
      const request = createRequest('http://localhost:3000/api/transfers', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId: 'acc-1',
          toAccountId: 'acc-1',
          amount: 1000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/transfers', () => {
    it('should return success envelope when deleted', async () => {
      transfers.delete.mockResolvedValue(undefined);

      const request = createRequest('http://localhost:3000/api/transfers?id=tr-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope when id is missing', async () => {
      const request = createRequest('http://localhost:3000/api/transfers');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
