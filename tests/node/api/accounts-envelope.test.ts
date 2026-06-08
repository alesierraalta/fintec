import { GET, POST, PUT, DELETE } from '@/app/api/accounts/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

describe('accounts route - envelope format', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockCreateServerAppRepository = createServerAppRepository as jest.MockedFunction<typeof createServerAppRepository>;

  const accounts = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
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
    mockCreateServerAppRepository.mockReturnValue({ accounts } as any);
  });

  function createRequest(url: string, init?: RequestInit) {
    return new Request(url, init) as any;
  }

  describe('GET /api/accounts', () => {
    it('should return success envelope with accounts', async () => {
      const mockAccounts = [{ id: 'acc-1', name: 'Savings' }];
      accounts.findAll.mockResolvedValue(mockAccounts);

      const request = createRequest('http://localhost:3000/api/accounts');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.accounts).toEqual(mockAccounts);
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

      const request = createRequest('http://localhost:3000/api/accounts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('POST /api/accounts', () => {
    it('should return success envelope with created account', async () => {
      const mockAccount = { id: 'acc-1', name: 'Savings' };
      accounts.create.mockResolvedValue(mockAccount);

      const request = createRequest('http://localhost:3000/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Savings',
          type: 'SAVINGS',
          currencyCode: 'USD',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(mockAccount);
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope for missing fields', async () => {
      const request = createRequest('http://localhost:3000/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Savings' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/accounts', () => {
    it('should return success envelope when deleted', async () => {
      accounts.delete.mockResolvedValue(undefined);

      const request = createRequest('http://localhost:3000/api/accounts?id=acc-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope when id is missing', async () => {
      const request = createRequest('http://localhost:3000/api/accounts');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
