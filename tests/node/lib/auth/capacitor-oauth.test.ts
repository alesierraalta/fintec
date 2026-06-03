/**
 * T2.1 — capacitor-oauth module: Browser.open  (REQ-11)
 * T2.2 — deep-link handler: appUrlOpen          (REQ-12)
 * TDD layer: node (Jest node project)
 *
 * Mocking strategy: jest.mock() stubs for @capacitor/browser, @capacitor/app,
 * and @capacitor/core so tests compile and run without a native runtime.
 * The real modules are installed (^8.x) so TypeScript types resolve correctly.
 */

// --- Module mocks (must be hoisted before imports) ---

const mockBrowserOpen = jest.fn().mockResolvedValue(undefined);
const mockBrowserClose = jest.fn().mockResolvedValue(undefined);
jest.mock('@capacitor/browser', () => ({
  Browser: {
    open: (...args: unknown[]) => mockBrowserOpen(...args),
    close: (...args: unknown[]) => mockBrowserClose(...args),
  },
}));

type AppUrlOpenCallback = (event: { url: string }) => void;
let capturedAppUrlOpenCallback: AppUrlOpenCallback | null = null;
const mockAppAddListener = jest.fn(
  (event: string, cb: AppUrlOpenCallback) => {
    if (event === 'appUrlOpen') capturedAppUrlOpenCallback = cb;
    return Promise.resolve({ remove: jest.fn() });
  }
);
const mockAppRemoveAllListeners = jest.fn().mockResolvedValue(undefined);
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) =>
      mockAppAddListener(...(args as [string, AppUrlOpenCallback])),
    removeAllListeners: (...args: unknown[]) =>
      mockAppRemoveAllListeners(...args),
  },
}));

let isNative = false;
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
  },
}));

// --- Supabase client mock ---

const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
    },
  },
}));

// --- Router mock ---

const mockRouterPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// --- Imports (after mocks) ---

import {
  signInWithGoogleNative,
  parseDeepLinkCode,
  registerDeepLinkHandler,
} from '@/lib/auth/capacitor-oauth';

// ============================================================
// T2.1 — signInWithGoogleNative
// ============================================================

describe('signInWithGoogleNative', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAppUrlOpenCallback = null;
  });

  describe('when isNativePlatform() === true', () => {
    beforeEach(() => {
      isNative = true;
    });

    it('calls supabase.auth.signInWithOAuth with provider google, skipBrowserRedirect:true, redirectTo fintec://auth/callback', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/auth?code=xyz' },
        error: null,
      });

      await signInWithGoogleNative();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          skipBrowserRedirect: true,
          redirectTo: 'fintec://auth/callback',
        }),
      });
    });

    it('calls Browser.open with the URL returned by signInWithOAuth', async () => {
      const oauthUrl = 'https://accounts.google.com/o/oauth2/auth?code=xyz';
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      });

      await signInWithGoogleNative();

      expect(mockBrowserOpen).toHaveBeenCalledWith({ url: oauthUrl });
    });

    it('does not call Browser.open when signInWithOAuth returns an error', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth error' },
      });

      await signInWithGoogleNative();

      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('does not call Browser.open when signInWithOAuth returns a null URL', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: null,
      });

      await signInWithGoogleNative();

      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('returns the error from signInWithOAuth when one occurs', async () => {
      const oauthError = { message: 'Unauthorized' };
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: oauthError,
      });

      const result = await signInWithGoogleNative();

      expect(result.error).toEqual(oauthError);
    });

    it('accepts an optional next parameter and includes it in scopes (does not break)', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/auth' },
        error: null,
      });

      await signInWithGoogleNative('/dashboard');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );
    });
  });

  describe('when isNativePlatform() === false (web guard)', () => {
    beforeEach(() => {
      isNative = false;
    });

    it('does not call Browser.open on web', async () => {
      await signInWithGoogleNative();
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('does not call signInWithOAuth on web', async () => {
      await signInWithGoogleNative();
      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// T2.2 — parseDeepLinkCode (pure helper)
// ============================================================

describe('parseDeepLinkCode', () => {
  it('extracts the code query param from a fintec://auth/callback?code= URL', () => {
    expect(
      parseDeepLinkCode('fintec://auth/callback?code=abc123')
    ).toBe('abc123');
  });

  it('returns null when the URL has no code param', () => {
    expect(parseDeepLinkCode('fintec://auth/callback')).toBeNull();
  });

  it('returns null for a non-auth URL (e.g. fintec://other/path)', () => {
    expect(parseDeepLinkCode('fintec://other/path?code=xyz')).toBeNull();
  });

  it('returns null for an unrecognised scheme', () => {
    expect(parseDeepLinkCode('https://evil.com?code=steal')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseDeepLinkCode('')).toBeNull();
  });

  it('returns the full code value including URL-encoded chars', () => {
    expect(
      parseDeepLinkCode('fintec://auth/callback?code=abc%2Bxyz%3D')
    ).toBe('abc+xyz=');
  });
});

// ============================================================
// T2.2 — registerDeepLinkHandler
// ============================================================

describe('registerDeepLinkHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAppUrlOpenCallback = null;
    isNative = true;
  });

  it('calls App.addListener with "appUrlOpen"', async () => {
    await registerDeepLinkHandler(mockRouterPush);
    expect(mockAppAddListener).toHaveBeenCalledWith(
      'appUrlOpen',
      expect.any(Function)
    );
  });

  it('calls exchangeCodeForSession with the extracted code on a valid deep-link URL', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    await registerDeepLinkHandler(mockRouterPush);

    // Simulate the OS triggering appUrlOpen
    await capturedAppUrlOpenCallback!({
      url: 'fintec://auth/callback?code=AUTH_CODE_123',
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('AUTH_CODE_123');
  });

  it('navigates to /dashboard after a successful code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    await registerDeepLinkHandler(mockRouterPush);
    await capturedAppUrlOpenCallback!({
      url: 'fintec://auth/callback?code=CODE',
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('closes the browser after a successful exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    await registerDeepLinkHandler(mockRouterPush);
    await capturedAppUrlOpenCallback!({
      url: 'fintec://auth/callback?code=CODE',
    });

    expect(mockBrowserClose).toHaveBeenCalled();
  });

  it('does NOT navigate to /dashboard when exchangeCodeForSession returns an error', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid code' },
    });

    await registerDeepLinkHandler(mockRouterPush);
    await capturedAppUrlOpenCallback!({
      url: 'fintec://auth/callback?code=BAD',
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('surfaces the error when exchange fails', async () => {
    const exchangeError = { message: 'code expired' };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: exchangeError,
    });

    await registerDeepLinkHandler(mockRouterPush);
    const result = await capturedAppUrlOpenCallback!({
      url: 'fintec://auth/callback?code=EXPIRED',
    });

    // Result carries the error (handler returns it)
    expect(result).toEqual(expect.objectContaining({ error: exchangeError }));
  });

  it('does NOT call exchangeCodeForSession for a non-auth deep-link URL', async () => {
    await registerDeepLinkHandler(mockRouterPush);
    await capturedAppUrlOpenCallback!({ url: 'fintec://other/path' });

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('returns a handle with a remove() function', async () => {
    const handle = await registerDeepLinkHandler(mockRouterPush);
    expect(handle).toHaveProperty('remove');
    expect(typeof handle.remove).toBe('function');
  });
});
