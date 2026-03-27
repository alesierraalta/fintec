import { POST } from '@/app/api/clear-account/route';
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
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('clear account route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const repository = {
    accounts: {
      findByUserId: jest.fn(),
      deleteMany: jest.fn(),
    },
    transactions: {
      findAll: jest.fn(),
      deleteMany: jest.fn(),
    },
    budgets: {
      findAll: jest.fn(),
      deleteMany: jest.fn(),
    },
    goals: {
      findAll: jest.fn(),
      deleteMany: jest.fn(),
    },
    notifications: {
      deleteByUserId: jest.fn(),
    },
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
    mockCreateServerAppRepository.mockReturnValue(repository as any);
    repository.accounts.findByUserId.mockResolvedValue([{ id: 'acc-1' }]);
    repository.transactions.findAll.mockResolvedValue([
      { id: 'tx-1', accountId: 'acc-1' },
      { id: 'tx-2', accountId: 'other' },
    ]);
    repository.budgets.findAll.mockResolvedValue([
      { id: 'budget-1', userId: 'user-1' },
      { id: 'budget-2', userId: 'other' },
    ]);
    repository.goals.findAll.mockResolvedValue([
      { id: 'goal-1', accountId: 'acc-1' },
      { id: 'goal-2', accountId: 'other' },
    ]);
    repository.notifications.deleteByUserId.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated users and invalid confirmation text', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const unauthorized = await POST(
      new Request('http://localhost/api/clear-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'VACIAR CUENTA' }),
      }) as any
    );
    const invalid = await POST(
      new Request('http://localhost/api/clear-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'BORRAR' }),
      }) as any
    );

    expect(unauthorized.status).toBe(401);
    expect(invalid.status).toBe(400);
  });

  it('deletes user-owned data in dependency-safe order', async () => {
    const response = await POST(
      new Request('http://localhost/api/clear-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'VACIAR CUENTA' }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(repository.transactions.deleteMany).toHaveBeenCalledWith(['tx-1']);
    expect(repository.budgets.deleteMany).toHaveBeenCalledWith(['budget-1']);
    expect(repository.goals.deleteMany).toHaveBeenCalledWith(['goal-1']);
    expect(repository.accounts.deleteMany).toHaveBeenCalledWith(['acc-1']);
    expect(body.deleted).toEqual({
      transactions: 1,
      budgets: 1,
      goals: 1,
      accounts: 1,
      notifications: 0,
    });
  });

  it('tolerates notification cleanup failures', async () => {
    repository.notifications.deleteByUserId.mockRejectedValue(
      new Error('table missing')
    );

    const response = await POST(
      new Request('http://localhost/api/clear-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'VACIAR CUENTA' }),
      }) as any
    );

    expect(response.status).toBe(200);
  });

  it('returns 500 when destructive cleanup fails', async () => {
    repository.transactions.findAll.mockRejectedValue(new Error('db offline'));

    const response = await POST(
      new Request('http://localhost/api/clear-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'VACIAR CUENTA' }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.details).toBe('db offline');
  });
});
