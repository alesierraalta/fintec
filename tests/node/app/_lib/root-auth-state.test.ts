import { getRootAuthState } from '@/app/_lib/root-auth-state';
import { createClient } from '@/lib/supabase/server';
import { isFrontendAuthBypassEnabled } from '@/lib/auth/is-frontend-auth-bypass-enabled';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/auth/is-frontend-auth-bypass-enabled', () => ({
  isFrontendAuthBypassEnabled: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockIsFrontendAuthBypassEnabled = isFrontendAuthBypassEnabled as jest.MockedFunction<typeof isFrontendAuthBypassEnabled>;

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalBypassFlag = env.FRONTEND_AUTH_BYPASS;

describe('getRootAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  it('returns authenticated when user exists', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as any);
    mockIsFrontendAuthBypassEnabled.mockReturnValue(false);

    const result = await getRootAuthState();

    expect(result).toBe('authenticated');
  });

  it('returns landing when no user and no bypass', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);
    mockIsFrontendAuthBypassEnabled.mockReturnValue(false);

    const result = await getRootAuthState();

    expect(result).toBe('landing');
  });

  it('returns authenticated when no user but bypass enabled', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as any);
    mockIsFrontendAuthBypassEnabled.mockReturnValue(true);

    const result = await getRootAuthState();

    expect(result).toBe('authenticated');
  });

  it('returns landing when getUser returns error', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Session expired'),
        }),
      },
    } as any);
    mockIsFrontendAuthBypassEnabled.mockReturnValue(false);

    const result = await getRootAuthState();

    expect(result).toBe('landing');
  });

  it('rejects bypass in production', async () => {
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
    // isFrontendAuthBypassEnabled returns false in production
    mockIsFrontendAuthBypassEnabled.mockReturnValue(false);

    const result = await getRootAuthState();

    expect(result).toBe('landing');
  });
});
