/**
 * OAuth provider seam — REQ-10 (SCN-15, SCN-16)
 *
 * Adding a second provider (e.g. 'apple') requires only appending one entry
 * to OAUTH_PROVIDERS. No changes to login/register pages or AuthContext needed.
 */

export type OAuthProviderId = 'google';

export interface OAuthProviderConfig {
  id: OAuthProviderId;
  /** Human-readable label rendered on the sign-in button. */
  label: string;
  /** OAuth scopes to request. */
  scopes: string;
  /** Icon key for the provider logo (used by GoogleSignInButton). */
  iconKey: 'google';
}

export const OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [
  {
    id: 'google',
    label: 'Continuar con Google',
    scopes: 'email profile',
    iconKey: 'google',
  },
] as const;

/**
 * Build the OAuth redirectTo URL.
 *
 * Pure function — deterministic given the same (origin, next) pair.
 * Returns `{origin}/auth/callback` with an optional `?next=` param
 * for post-login destination.
 *
 * @param origin - App origin e.g. `https://app.fintec.com` or
 *   `window.location.origin` on the client side.
 * @param next   - Optional relative path to redirect after login
 *   (e.g. `/transactions`). External URLs are NOT accepted here —
 *   open-redirect sanitisation is the responsibility of the callback route.
 */
export function getOAuthRedirectTo(origin: string, next?: string): string {
  const base = `${origin}/auth/callback`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
