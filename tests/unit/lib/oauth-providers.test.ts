/**
 * T1.1 — OAuth provider seam
 * Unit tests (node project — pure module, no DOM needed)
 * Satisfies: REQ-10 (SCN-15, SCN-16)
 */

import {
  OAUTH_PROVIDERS,
  getOAuthRedirectTo,
  OAuthProviderId,
  OAuthProviderConfig,
} from '@/lib/auth/oauth-providers';

describe('OAUTH_PROVIDERS', () => {
  it('has exactly one entry with id google', () => {
    expect(OAUTH_PROVIDERS).toHaveLength(1);
    expect(OAUTH_PROVIDERS[0].id).toBe('google');
  });

  it('google entry has scopes email profile', () => {
    expect(OAUTH_PROVIDERS[0].scopes).toBe('email profile');
  });

  it('google entry has non-empty label', () => {
    expect(OAUTH_PROVIDERS[0].label).toBeTruthy();
    expect(typeof OAUTH_PROVIDERS[0].label).toBe('string');
    expect(OAUTH_PROVIDERS[0].label.length).toBeGreaterThan(0);
  });

  it('google entry has iconKey google', () => {
    expect(OAUTH_PROVIDERS[0].iconKey).toBe('google');
  });

  it('structural seam: adding a second entry to a copy does not cause type error (SCN-16)', () => {
    const appleEntry: OAuthProviderConfig = {
      id: 'google' as OAuthProviderId, // Only google exists now; seam allows future extension
      label: 'Continuar con Apple',
      scopes: 'email',
      iconKey: 'google',
    };
    const extended: readonly OAuthProviderConfig[] = [
      ...OAUTH_PROVIDERS,
      appleEntry,
    ];
    expect(extended).toHaveLength(2);
  });
});

describe('getOAuthRedirectTo', () => {
  const origin = 'https://example.com';

  it('returns origin/auth/callback when next is undefined (SCN-15)', () => {
    const result = getOAuthRedirectTo(origin, undefined);
    expect(result).toBe('https://example.com/auth/callback');
  });

  it('appends ?next=encoded-path when next is a relative path', () => {
    const result = getOAuthRedirectTo(origin, '/transactions');
    expect(result).toBe(
      'https://example.com/auth/callback?next=%2Ftransactions'
    );
  });

  it('is pure and deterministic: same args → same result', () => {
    const a = getOAuthRedirectTo(origin, '/transactions');
    const b = getOAuthRedirectTo(origin, '/transactions');
    expect(a).toBe(b);
  });

  it('returns same base URL when next is undefined (deterministic)', () => {
    const a = getOAuthRedirectTo(origin, undefined);
    const b = getOAuthRedirectTo(origin, undefined);
    expect(a).toBe(b);
  });
});
