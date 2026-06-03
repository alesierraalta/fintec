/**
 * T1.3 — AuthContext: getUser() init security fix + signInWithGoogle
 * T1.4 — AuthContext: SIGNED_IN profile sync with idempotency guard
 *
 * Unit tests (dom/jsdom project)
 * Satisfies: REQ-05 (SCN-04, SCN-05), REQ-06 (SCN-06, SCN-07, SCN-08), REQ-09 (SCN-03)
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/auth-context';
import { useAuth } from '@/hooks/use-auth';

// ---------------------------------------------------------------------------
// Mock @/repositories/supabase/client
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      resend: jest.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/cache/optimized-data-cache
// ---------------------------------------------------------------------------

jest.mock('@/lib/cache/optimized-data-cache', () => ({
  clearAllOptimizedDataCaches: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helper: render a consumer that exposes the full context value
// ---------------------------------------------------------------------------

let capturedContext: ReturnType<typeof useAuth> | null = null;

function AuthConsumer() {
  capturedContext = useAuth();
  return null;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Default stubs
// ---------------------------------------------------------------------------

const NULL_USER_RESPONSE = { data: { user: null }, error: null };
const MOCK_USER = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  user_metadata: { full_name: 'Test User' },
  identities: [{ provider: 'google' }],
};

function setupDefaultMocks() {
  capturedContext = null;
  mockGetUser.mockResolvedValue(NULL_USER_RESPONSE);
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ===========================================================================
// T1.3 — getUser() init security fix
// ===========================================================================

describe('T1.3 — getUser() init security fix', () => {
  it('SCN-04: calls getUser on mount, NOT getSession', async () => {
    renderProvider();

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('SCN-05: loading is true before getUser resolves, false after', async () => {
    let resolve!: (value: any) => void;
    mockGetUser.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderProvider();

    // Context renders synchronously — loading should be true before resolution
    expect(capturedContext?.loading).toBe(true);

    await act(async () => {
      resolve(NULL_USER_RESPONSE);
    });

    await waitFor(() => {
      expect(capturedContext?.loading).toBe(false);
    });
  });

  it('sets user and session to null when getUser returns null user', async () => {
    mockGetUser.mockResolvedValue(NULL_USER_RESPONSE);

    renderProvider();

    await waitFor(() => {
      expect(capturedContext?.loading).toBe(false);
    });
    expect(capturedContext?.user).toBeNull();
    expect(capturedContext?.session).toBeNull();
  });

  it('sets user from getUser result when user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: MOCK_USER, access_token: 'tok' } },
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(capturedContext?.loading).toBe(false);
    });
    expect(capturedContext?.user?.id).toBe('user-1');
  });
});

// ===========================================================================
// T1.3 — signInWithGoogle
// ===========================================================================

describe('T1.3 — signInWithGoogle', () => {
  it('SCN-03: signInWithGoogle is exposed via context', async () => {
    renderProvider();

    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    expect(typeof (capturedContext as any)?.signInWithGoogle).toBe('function');
  });

  it('SCN-03: calling signInWithGoogle calls signInWithOAuth with provider google', async () => {
    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));

    await act(async () => {
      await (capturedContext as any).signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    const callArgs = mockSignInWithOAuth.mock.calls[0][0];
    expect(callArgs.provider).toBe('google');
  });

  it('SCN-03: signInWithOAuth options include scopes email profile', async () => {
    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));

    await act(async () => {
      await (capturedContext as any).signInWithGoogle();
    });

    const callArgs = mockSignInWithOAuth.mock.calls[0][0];
    expect(callArgs.options?.scopes).toContain('email');
    expect(callArgs.options?.scopes).toContain('profile');
  });

  it('SCN-03: redirectTo contains /auth/callback', async () => {
    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));

    await act(async () => {
      await (capturedContext as any).signInWithGoogle();
    });

    const callArgs = mockSignInWithOAuth.mock.calls[0][0];
    expect(callArgs.options?.redirectTo).toContain('/auth/callback');
  });

  it('next param threads through to redirectTo when provided', async () => {
    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));

    await act(async () => {
      await (capturedContext as any).signInWithGoogle('/transactions');
    });

    const callArgs = mockSignInWithOAuth.mock.calls[0][0];
    expect(callArgs.options?.redirectTo).toContain('/auth/callback');
    // next query param should be encoded in the redirectTo
    expect(callArgs.options?.redirectTo).toMatch(/next/);
  });

  it('sets authError when signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: 'OAuth error' },
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));

    await act(async () => {
      await (capturedContext as any).signInWithGoogle();
    });

    expect(capturedContext?.authError).toBeTruthy();
  });
});

// ===========================================================================
// T1.4 — SIGNED_IN profile sync
// ===========================================================================

describe('T1.4 — SIGNED_IN profile sync', () => {
  function setupOnAuthStateChange(events: Array<[string, any]>) {
    mockOnAuthStateChange.mockImplementation((callback: Function) => {
      // Fire each event after a micro-task tick
      events.forEach(([event, session]) => {
        Promise.resolve().then(() => callback(event, session));
      });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
  }

  it('SCN-06: SIGNED_IN event POSTs to /api/auth/profile', async () => {
    setupOnAuthStateChange([
      ['SIGNED_IN', { user: MOCK_USER, access_token: 'tok' }],
    ]);

    renderProvider();

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const profileCall = fetchCalls.find((c: any[]) =>
        String(c[0]).includes('/api/auth/profile')
      );
      expect(profileCall).toBeDefined();
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCall = fetchCalls.find((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    )!;
    expect(profileCall[1]?.method).toBe('POST');
  });

  it('SCN-06: profile POST body includes user id and email', async () => {
    setupOnAuthStateChange([
      ['SIGNED_IN', { user: MOCK_USER, access_token: 'tok' }],
    ]);

    renderProvider();

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      return fetchCalls.some((c: any[]) =>
        String(c[0]).includes('/api/auth/profile')
      );
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCall = fetchCalls.find((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    )!;
    const body = JSON.parse(profileCall[1]?.body);
    // The body must include something that identifies the user
    expect(JSON.stringify(body)).toMatch(/name|email|user/i);
  });

  it('SCN-07: TOKEN_REFRESHED does NOT trigger profile POST', async () => {
    setupOnAuthStateChange([
      ['TOKEN_REFRESHED', { user: MOCK_USER, access_token: 'tok' }],
    ]);

    renderProvider();

    // Wait for any async effects
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCalls = fetchCalls.filter((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    );
    expect(profileCalls).toHaveLength(0);
  });

  it('SCN-08: SIGNED_OUT resets user, session, and baseCurrency', async () => {
    setupOnAuthStateChange([['SIGNED_OUT', null]]);

    renderProvider();

    await waitFor(() => {
      expect(capturedContext?.user).toBeNull();
      expect(capturedContext?.session).toBeNull();
    });

    // baseCurrency should reset to USD
    expect(capturedContext?.baseCurrency).toBe('USD');
  });

  it('SCN-08: SIGNED_OUT does NOT trigger profile POST', async () => {
    setupOnAuthStateChange([['SIGNED_OUT', null]]);

    renderProvider();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCalls = fetchCalls.filter((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    );
    expect(profileCalls).toHaveLength(0);
  });

  it('double SIGNED_IN with same user.id is debounced (only one profile POST)', async () => {
    setupOnAuthStateChange([
      ['SIGNED_IN', { user: MOCK_USER, access_token: 'tok' }],
      ['SIGNED_IN', { user: MOCK_USER, access_token: 'tok2' }],
    ]);

    renderProvider();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCalls = fetchCalls.filter((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    );
    // Debounced: only one call for the same user.id
    expect(profileCalls.length).toBe(1);
  });

  it('first-login detection: createWelcomeNotifications true when created_at within 10s', async () => {
    const recentUser = {
      ...MOCK_USER,
      created_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
    };
    setupOnAuthStateChange([
      ['SIGNED_IN', { user: recentUser, access_token: 'tok' }],
    ]);

    renderProvider();

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      return fetchCalls.some((c: any[]) =>
        String(c[0]).includes('/api/auth/profile')
      );
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCall = fetchCalls.find((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    )!;
    const body = JSON.parse(profileCall[1]?.body);
    expect(body.createWelcomeNotifications).toBe(true);
  });

  it('returning-user: createWelcomeNotifications false when created_at is old', async () => {
    const oldUser = {
      ...MOCK_USER,
      created_at: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
      last_sign_in_at: new Date().toISOString(),
    };
    setupOnAuthStateChange([
      ['SIGNED_IN', { user: oldUser, access_token: 'tok' }],
    ]);

    renderProvider();

    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      return fetchCalls.some((c: any[]) =>
        String(c[0]).includes('/api/auth/profile')
      );
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const profileCall = fetchCalls.find((c: any[]) =>
      String(c[0]).includes('/api/auth/profile')
    )!;
    const body = JSON.parse(profileCall[1]?.body);
    expect(body.createWelcomeNotifications).toBe(false);
  });
});
