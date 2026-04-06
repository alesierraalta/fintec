import { ensureCanonicalAuthUser } from '@/tests/support/auth/ensure-canonical-auth-user';
import * as admin from '@/lib/supabase/admin';
import * as canonicalUser from '@/tests/support/auth/canonical-user';

jest.mock('@/lib/supabase/admin');
jest.mock('@/tests/support/auth/canonical-user');

describe('ensureCanonicalAuthUser', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    jest.resetAllMocks();

    mockAuth = {
      admin: {
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUserById: jest.fn(),
      },
    };

    mockSupabase = {
      auth: mockAuth,
    };

    (admin.createServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    (canonicalUser.getCanonicalTestUserConfig as jest.Mock).mockReturnValue({
      email: 'test@fintec.com',
      password: 'test-password-placeholder',
      displayName: 'Test User',
      baseCurrency: 'USD',
      authRequiredLane: 'auth-required',
      displayLabels: ['Test User', 'Dashboard'],
    });

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('fails fast when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    (admin.createServiceClient as jest.Mock).mockImplementation(() => {
      throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
    });

    await expect(ensureCanonicalAuthUser()).rejects.toThrow(
      'Missing env.SUPABASE_SERVICE_ROLE_KEY'
    );
  });

  it('creates the user if they do not exist', async () => {
    mockAuth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    mockAuth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'new-user-123', email: 'test@fintec.com' } },
      error: null,
    });

    await ensureCanonicalAuthUser();

    expect(mockAuth.admin.listUsers).toHaveBeenCalled();
    expect(mockAuth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@fintec.com',
        password: 'test-password-placeholder',
        email_confirm: true,
        user_metadata: {
          isCanonicalTestUser: true,
          displayName: 'Test User',
        },
      })
    );
  });

  it('suceeds if user exists with correct metadata', async () => {
    mockAuth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'existing-user',
            email: 'test@fintec.com',
            user_metadata: {
              isCanonicalTestUser: true,
              displayName: 'Test User',
            },
          },
        ],
      },
      error: null,
    });

    await ensureCanonicalAuthUser();

    expect(mockAuth.admin.listUsers).toHaveBeenCalled();
    expect(mockAuth.admin.createUser).not.toHaveBeenCalled();
    expect(mockAuth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('repairs metadata if user exists but metadata is incomplete', async () => {
    mockAuth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'existing-user',
            email: 'test@fintec.com',
            user_metadata: {}, // Missing isCanonicalTestUser
          },
        ],
      },
      error: null,
    });

    mockAuth.admin.updateUserById.mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    await ensureCanonicalAuthUser();

    expect(mockAuth.admin.updateUserById).toHaveBeenCalledWith(
      'existing-user',
      {
        user_metadata: {
          isCanonicalTestUser: true,
          displayName: 'Test User',
        },
      }
    );
  });

  it('fails fast on duplicate or conflict scenarios', async () => {
    mockAuth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'user1', email: 'test@fintec.com' },
          { id: 'user2', email: 'test@fintec.com' },
        ],
      },
      error: null,
    });

    await expect(ensureCanonicalAuthUser()).rejects.toThrow(
      /Multiple users found for canonical email/
    );
  });
});
