/**
 * Capacitor mobile OAuth helpers  — REQ-11, REQ-12
 *
 * signInWithGoogleNative  — opens system browser via @capacitor/browser
 * registerDeepLinkHandler — listens for appUrlOpen, extracts code, exchanges session
 * parseDeepLinkCode        — pure helper: fintec://auth/callback?code= → code string
 *
 * CRITICAL: must use the SAME supabase client instance as AuthContext
 * (@/repositories/supabase/client) so the PKCE verifier cookie matches.
 */

import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/repositories/supabase/client';

// ---------------------------------------------------------------------------
// T2.1 — signInWithGoogleNative
// ---------------------------------------------------------------------------

/**
 * Initiate Google sign-in on a native Capacitor platform.
 *
 * - Returns early (no-op) when running in a web browser.
 * - Uses skipBrowserRedirect:true so Supabase returns the URL without
 *   auto-navigating; we then open it in the system browser ourselves.
 * - redirectTo uses the fintec:// custom scheme so the OS delivers the
 *   callback back to the app via the appUrlOpen deep-link event.
 */
export async function signInWithGoogleNative(
  _next?: string
): Promise<{ error: unknown | null }> {
  if (!Capacitor.isNativePlatform()) {
    return { error: null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      skipBrowserRedirect: true,
      redirectTo: 'fintec://auth/callback',
      scopes: 'email profile',
    },
  });

  if (error || !data?.url) {
    return { error: error ?? new Error('signInWithOAuth returned no URL') };
  }

  await Browser.open({ url: data.url });
  return { error: null };
}

// ---------------------------------------------------------------------------
// T2.2 — parseDeepLinkCode (pure helper)
// ---------------------------------------------------------------------------

/**
 * Extract the OAuth code query param from a fintec://auth/callback?code= URL.
 *
 * Returns null for:
 * - Non-fintec:// schemes
 * - Non-auth/callback paths
 * - Missing or empty code param
 */
export function parseDeepLinkCode(url: string): string | null {
  if (!url) return null;

  // Only handle our custom scheme
  if (!url.startsWith('fintec://')) return null;

  // Only handle the auth/callback path
  // fintec://auth/callback?code=... → strip scheme, split on ?
  const withoutScheme = url.slice('fintec://'.length); // "auth/callback?code=..."
  const questionMark = withoutScheme.indexOf('?');
  const path =
    questionMark === -1
      ? withoutScheme
      : withoutScheme.slice(0, questionMark);

  if (path !== 'auth/callback') return null;
  if (questionMark === -1) return null;

  const queryString = withoutScheme.slice(questionMark + 1);
  const params = new URLSearchParams(queryString);
  const code = params.get('code');
  return code ?? null;
}

// ---------------------------------------------------------------------------
// T2.2 — registerDeepLinkHandler
// ---------------------------------------------------------------------------

export interface DeepLinkHandle {
  remove: () => void;
}

type NavigateFn = (path: string) => void;

/**
 * Register a one-time-setup listener for the Capacitor App 'appUrlOpen' event.
 *
 * When the OS delivers fintec://auth/callback?code=<CODE>:
 * 1. Parse the code from the URL.
 * 2. Exchange it for a Supabase session.
 * 3. Close the system browser.
 * 4. Navigate to /dashboard on success.
 *
 * Non-auth URLs are silently ignored.
 *
 * @param navigate - A router push function (e.g. from useRouter().push).
 *   Injected so the module stays testable without a React context.
 */
export async function registerDeepLinkHandler(
  navigate: NavigateFn
): Promise<DeepLinkHandle> {
  const listenerHandle = await App.addListener(
    'appUrlOpen',
    async (event: { url: string }) => {
      const code = parseDeepLinkCode(event.url);
      if (!code) return;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // Surface the error to the caller's callback context
        return { error };
      }

      await Browser.close();
      navigate('/dashboard');
    }
  );

  return {
    remove: () => {
      listenerHandle.remove();
    },
  };
}
