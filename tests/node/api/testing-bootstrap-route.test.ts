import { POST } from '@/app/api/testing/bootstrap/route';
import { createClient } from '@/lib/supabase/server';
import {
  createServerAppRepository,
  createServerUsersProfileRepository,
} from '@/repositories/factory';
import { ensureCanonicalUserFixtures } from '@/lib/testing/canonical-fixtures';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
  createServerUsersProfileRepository: jest.fn(),
}));

jest.mock('@/lib/testing/canonical-fixtures', () => ({
  ensureCanonicalUserFixtures: jest.fn(),
}));

describe('POST /api/testing/bootstrap', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;
  const mockCreateServerUsersProfileRepository =
    createServerUsersProfileRepository as jest.MockedFunction<
      typeof createServerUsersProfileRepository
    >;
  const mockEnsureCanonicalUserFixtures =
    ensureCanonicalUserFixtures as jest.MockedFunction<
      typeof ensureCanonicalUserFixtures
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('rejects bootstrap calls in production', async () => {
    process.env.NODE_ENV = 'production';

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Testing bootstrap is disabled in production.');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects bootstrap when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Missing SUPABASE_SERVICE_ROLE_KEY prerequisite');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockEnsureCanonicalUserFixtures).not.toHaveBeenCalled();
  });

  it('returns 401 when auth layer errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'expired' },
        }),
      },
    } as any);

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it('returns deterministic fixture details for authenticated users', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'test@fintec.com',
              user_metadata: { name: 'Test User' },
            },
          },
          error: null,
        }),
      },
    };
    const appRepository = {
      accounts: {},
      categories: {},
    };
    const usersProfileRepository = {
      upsert: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(supabase as any);
    mockCreateServerAppRepository.mockReturnValue(appRepository as any);
    mockCreateServerUsersProfileRepository.mockReturnValue(
      usersProfileRepository as any
    );
    mockEnsureCanonicalUserFixtures.mockResolvedValue({
      account: { id: 'account-1', name: 'Fintec Canonical Cash' },
      incomeCategory: { id: 'income-1', name: 'Fintec Canonical Income' },
      expenseCategory: { id: 'expense-1', name: 'Fintec Canonical Expense' },
      created: {
        account: true,
        incomeCategory: false,
        expenseCategory: true,
      },
      profile: {
        email: 'test@fintec.com',
        displayName: 'Test User',
        baseCurrency: 'USD',
      },
    } as any);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateServerAppRepository).toHaveBeenCalledWith({ supabase });
    expect(mockCreateServerUsersProfileRepository).toHaveBeenCalledWith({
      supabase,
    });
    expect(mockEnsureCanonicalUserFixtures).toHaveBeenCalledWith({
      authUser: {
        id: 'user-1',
        email: 'test@fintec.com',
        user_metadata: { name: 'Test User' },
      },
      appRepository,
      usersProfileRepository,
    });
    expect(body.success).toBe(true);
  });

  it('normalizes non-string metadata names to undefined before fixture bootstrap', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'test@fintec.com',
              user_metadata: { name: 42 },
            },
          },
          error: null,
        }),
      },
    };

    mockCreateClient.mockResolvedValue(supabase as any);
    mockCreateServerAppRepository.mockReturnValue({} as any);
    mockCreateServerUsersProfileRepository.mockReturnValue({} as any);
    mockEnsureCanonicalUserFixtures.mockResolvedValue({} as any);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mockEnsureCanonicalUserFixtures).toHaveBeenCalledWith(
      expect.objectContaining({
        authUser: expect.objectContaining({
          user_metadata: { name: undefined },
        }),
      })
    );
  });

  it('returns 500 when bootstrap reconciliation fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'test@fintec.com',
              user_metadata: { name: 'Test User' },
            },
          },
          error: null,
        }),
      },
    } as any);
    mockCreateServerAppRepository.mockReturnValue({} as any);
    mockCreateServerUsersProfileRepository.mockReturnValue({} as any);
    mockEnsureCanonicalUserFixtures.mockRejectedValue(
      new Error('bootstrap failed')
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('bootstrap failed');
  });
});
