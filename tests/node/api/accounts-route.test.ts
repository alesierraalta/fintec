import { DELETE, GET, POST, PUT } from '@/app/api/accounts/route';
import {
  DELETE as DELETE_BY_ID,
  GET as GET_BY_ID,
  PATCH,
  PUT as PUT_BY_ID,
} from '@/app/api/accounts/[id]/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('accounts route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const accounts = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    updateBalance: jest.fn(),
  };

  const params = (id: string) => ({ params: Promise.resolve({ id }) });

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

  describe('GET /api/accounts', () => {
    it('lists all accounts by default', async () => {
      accounts.findAll.mockResolvedValue([{ id: 'acc-1' }]);

      const response = await GET(
        new Request('http://localhost/api/accounts') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(accounts.findAll).toHaveBeenCalled();
      expect(body.count).toBe(1);
    });

    it('filters by type, active, and currency branches', async () => {
      accounts.findByType.mockResolvedValue([{ id: 'typed' }]);
      accounts.findActive.mockResolvedValue([{ id: 'active' }]);
      accounts.findByCurrency.mockResolvedValue([{ id: 'usd' }]);

      await GET(new Request('http://localhost/api/accounts?type=CASH') as any);
      await GET(
        new Request('http://localhost/api/accounts?active=true') as any
      );
      await GET(
        new Request('http://localhost/api/accounts?currency=USD') as any
      );

      expect(accounts.findByType).toHaveBeenCalledWith('CASH');
      expect(accounts.findActive).toHaveBeenCalled();
      expect(accounts.findByCurrency).toHaveBeenCalledWith('USD');
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
        new Request('http://localhost/api/accounts') as any
      );

      expect(response.status).toBe(401);
      expect(accounts.findAll).not.toHaveBeenCalled();
    });

    it('returns 500 when repository lookup fails', async () => {
      accounts.findAll.mockRejectedValue(new Error('db offline'));

      const response = await GET(
        new Request('http://localhost/api/accounts') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('db offline');
    });
  });

  describe('POST /api/accounts', () => {
    it('creates an account with defaults', async () => {
      accounts.create.mockResolvedValue({ id: 'acc-1' });

      const response = await POST(
        new Request('http://localhost/api/accounts', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Cash Wallet',
            type: 'CASH',
            currencyCode: 'USD',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(accounts.create).toHaveBeenCalledWith({
        name: 'Cash Wallet',
        type: 'CASH',
        currencyCode: 'USD',
        balance: 0,
        active: true,
      });
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await POST(
        new Request('http://localhost/api/accounts', {
          method: 'POST',
          body: JSON.stringify({ name: 'Cash Wallet' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        'Missing required fields: name, type, currencyCode'
      );
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await POST(
        new Request('http://localhost/api/accounts', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/accounts', () => {
    it('updates by body id', async () => {
      accounts.update.mockResolvedValue({ id: 'acc-1' });

      const response = await PUT(
        new Request('http://localhost/api/accounts', {
          method: 'PUT',
          body: JSON.stringify({ id: 'acc-1', name: 'Updated' }),
        }) as any
      );

      expect(response.status).toBe(200);
      expect(accounts.update).toHaveBeenCalledWith('acc-1', {
        id: 'acc-1',
        name: 'Updated',
      });
    });

    it('returns 400 when id is missing', async () => {
      const response = await PUT(
        new Request('http://localhost/api/accounts', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        }) as any
      );

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/accounts', () => {
    it('deletes by query id', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/accounts?id=acc-1') as any
      );

      expect(response.status).toBe(200);
      expect(accounts.delete).toHaveBeenCalledWith('acc-1');
    });

    it('returns 400 when id query param is missing', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/accounts') as any
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/accounts/[id]', () => {
    it('returns account details', async () => {
      accounts.findById.mockResolvedValue({ id: 'acc-1' });

      const response = await GET_BY_ID(
        new Request('http://localhost/api/accounts/acc-1') as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual({ id: 'acc-1' });
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await GET_BY_ID(
        new Request('http://localhost/api/accounts/acc-1') as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 when route param id is missing', async () => {
      const response = await GET_BY_ID(
        new Request('http://localhost/api/accounts') as any,
        params('') as any
      );

      expect(response.status).toBe(400);
    });

    it('returns 404 when account is missing', async () => {
      accounts.findById.mockResolvedValue(null);

      const response = await GET_BY_ID(
        new Request('http://localhost/api/accounts/missing') as any,
        params('missing') as any
      );

      expect(response.status).toBe(404);
    });

    it('returns 500 when account lookup crashes', async () => {
      accounts.findById.mockRejectedValue(new Error('account lookup failed'));

      const response = await GET_BY_ID(
        new Request('http://localhost/api/accounts/acc-1') as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('account lookup failed');
    });
  });

  describe('PUT /api/accounts/[id]', () => {
    it('merges route id into update payload', async () => {
      accounts.update.mockResolvedValue({ id: 'acc-1' });

      const response = await PUT_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Savings' }),
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(200);
      expect(accounts.update).toHaveBeenCalledWith('acc-1', {
        id: 'acc-1',
        name: 'Savings',
      });
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await PUT_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Savings' }),
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 when route param id is missing', async () => {
      const response = await PUT_BY_ID(
        new Request('http://localhost/api/accounts', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Savings' }),
        }) as any,
        params('') as any
      );

      expect(response.status).toBe(400);
    });

    it('returns 500 when update crashes', async () => {
      accounts.update.mockRejectedValue(new Error('update crashed'));

      const response = await PUT_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Savings' }),
        }) as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('update crashed');
    });
  });

  describe('DELETE /api/accounts/[id]', () => {
    it('checks existence before deleting', async () => {
      accounts.findById.mockResolvedValue({ id: 'acc-1' });

      const response = await DELETE_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'DELETE',
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(200);
      expect(accounts.findById).toHaveBeenCalledWith('acc-1');
      expect(accounts.delete).toHaveBeenCalledWith('acc-1');
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await DELETE_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'DELETE',
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 when route param id is missing', async () => {
      const response = await DELETE_BY_ID(
        new Request('http://localhost/api/accounts', {
          method: 'DELETE',
        }) as any,
        params('') as any
      );

      expect(response.status).toBe(400);
    });

    it('returns 404 when deleting a missing account', async () => {
      accounts.findById.mockResolvedValue(null);

      const response = await DELETE_BY_ID(
        new Request('http://localhost/api/accounts/acc-404', {
          method: 'DELETE',
        }) as any,
        params('acc-404') as any
      );

      expect(response.status).toBe(404);
      expect(accounts.delete).not.toHaveBeenCalled();
    });

    it('returns 500 when delete crashes', async () => {
      accounts.findById.mockResolvedValue({ id: 'acc-1' });
      accounts.delete.mockRejectedValue(new Error('delete crashed'));

      const response = await DELETE_BY_ID(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'DELETE',
        }) as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('delete crashed');
    });
  });

  describe('PATCH /api/accounts/[id]', () => {
    it('updates account balance', async () => {
      accounts.updateBalance.mockResolvedValue({ id: 'acc-1', balance: 55 });

      const response = await PATCH(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PATCH',
          body: JSON.stringify({ balance: 55 }),
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(200);
      expect(accounts.updateBalance).toHaveBeenCalledWith('acc-1', 55);
    });

    it('returns 401 when unauthenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as any);

      const response = await PATCH(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PATCH',
          body: JSON.stringify({ balance: 55 }),
        }) as any,
        params('acc-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 when route param id is missing', async () => {
      const response = await PATCH(
        new Request('http://localhost/api/accounts', {
          method: 'PATCH',
          body: JSON.stringify({ balance: 55 }),
        }) as any,
        params('') as any
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 when balance is not numeric', async () => {
      const response = await PATCH(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PATCH',
          body: JSON.stringify({ balance: 'bad' }),
        }) as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Balance must be a number');
    });

    it('returns 500 when balance update crashes', async () => {
      accounts.updateBalance.mockRejectedValue(
        new Error('balance update failed')
      );

      const response = await PATCH(
        new Request('http://localhost/api/accounts/acc-1', {
          method: 'PATCH',
          body: JSON.stringify({ balance: 55 }),
        }) as any,
        params('acc-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('balance update failed');
    });
  });
});
