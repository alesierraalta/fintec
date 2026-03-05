import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import { createClient } from '@/lib/supabase/server';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('requireAuthenticatedUser', () => {
  const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalBypassFlag = env.FRONTEND_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;

    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  it('returns the authenticated user when session is valid', async () => {
    const user = { id: 'user-123', email: 'test@fintec.com' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user },
          error: null,
        }),
      },
    } as any);

    const result = await requireAuthenticatedUser();

    expect(result).toEqual(user);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to login when bypass is not enabled', async () => {
    env.NODE_ENV = 'test';
    env.FRONTEND_AUTH_BYPASS = '';

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    await expect(requireAuthenticatedUser()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });

  it('allows page guard bypass in non-production when explicitly enabled', async () => {
    env.NODE_ENV = 'test';
    env.FRONTEND_AUTH_BYPASS = '1';

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    const result = await requireAuthenticatedUser();

    expect(result.id).toBe('frontend-auth-bypass-user');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('rejects bypass activation in production and keeps login redirect', async () => {
    env.NODE_ENV = 'production';
    env.FRONTEND_AUTH_BYPASS = '1';

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);

    await expect(requireAuthenticatedUser()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
  });
});
