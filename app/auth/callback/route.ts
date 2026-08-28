/**
 * OAuth callback route — REQ-03, REQ-04 (SCN-09..SCN-13)
 *
 * Server-side GET handler for the Supabase PKCE OAuth callback.
 * Exchanges the authorization code for a session using the SSR server client
 * (cookie adapter) so session cookies are set server-side before the redirect.
 *
 * Security: open-redirect guard via sanitizeNext rejects any `next` value
 * that resolves to an external host or protocol-relative path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeNext } from '@/lib/auth/sanitize-next';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 *
 * Handles the OAuth PKCE code exchange after Google redirects back to the app.
 * Flow:
 *   1. Read `code` and optional `next` from search params.
 *   2. If no code → redirect to /auth/login?error=missing_code.
 *   3. Exchange code via server Supabase client (PKCE verifier is in the cookie).
 *   4. On failure → redirect to /auth/login?error=oauth_exchange_failed.
 *   5. On success → redirect to sanitized `next` or /dashboard.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next');
  const next = sanitizeNext(rawNext);

  const origin = url.origin;

  // No authorization code — cannot proceed with exchange
  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=missing_code`,
      { status: 302 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Do NOT expose the raw error detail in the redirect URL
    return NextResponse.redirect(
      `${origin}/auth/login?error=oauth_exchange_failed`,
      { status: 302 }
    );
  }

  // Success — redirect to the requested destination or dashboard
  const destination = next ?? '/dashboard';
  return NextResponse.redirect(`${origin}${destination}`, { status: 302 });
}
