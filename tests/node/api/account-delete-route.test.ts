import { POST } from '@/app/api/account/delete/route';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { purgeUserData } from '@/lib/legal/user-data';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/legal/user-data', () => ({
  purgeUserData: jest.fn(),
}));

describe('account delete route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServiceClient = createServiceClient as jest.MockedFunction<
    typeof createServiceClient
  >;
  const mockPurgeUserData = purgeUserData as jest.MockedFunction<
    typeof purgeUserData
  >;

  const deleteUser = jest.fn();

  const buildRequest = (body: unknown) =>
    ({ json: jest.fn().mockResolvedValue(body) }) as any;

  const authenticate = (user: { id: string } | null) => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user },
          error: user ? null : new Error('no session'),
        }),
      },
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deleteUser.mockResolvedValue({ error: null });
    mockCreateServiceClient.mockReturnValue({
      auth: { admin: { deleteUser } },
    } as any);
    mockPurgeUserData.mockResolvedValue({
      transactions: 2,
      budgets: 0,
      goals: 0,
      accounts: 1,
    });
  });

  it('rejects unauthenticated requests', async () => {
    authenticate(null);

    const response = await POST(
      buildRequest({ confirmationText: 'ELIMINAR CUENTA' })
    );

    expect(response.status).toBe(401);
    expect(mockPurgeUserData).not.toHaveBeenCalled();
  });

  it('refuses to delete without the exact confirmation text', async () => {
    authenticate({ id: 'user-1' });

    const response = await POST(buildRequest({ confirmationText: 'eliminar' }));

    expect(response.status).toBe(400);
    expect(mockPurgeUserData).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('purges the data and removes the auth identity', async () => {
    authenticate({ id: 'user-1' });

    const response = await POST(
      buildRequest({ confirmationText: 'ELIMINAR CUENTA' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockPurgeUserData).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(body.success).toBe(true);
  });

  it('reports failure when the identity cannot be removed', async () => {
    authenticate({ id: 'user-1' });
    deleteUser.mockResolvedValue({ error: new Error('service role missing') });

    const response = await POST(
      buildRequest({ confirmationText: 'ELIMINAR CUENTA' })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
