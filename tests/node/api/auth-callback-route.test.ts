/**
 * T1.2 — /auth/callback route handler
 * Node integration tests (Jest node project)
 * Satisfies: REQ-03, REQ-04 (SCN-09..SCN-13)
 */

import { GET } from '@/app/auth/callback/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('GET /auth/callback', () => {
  const mockExchangeCodeForSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    } as any);
  });

  describe('SCN-09 — success → redirects to /dashboard', () => {
    it('returns a redirect to /dashboard when code is valid and no next param', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=valid_code'
      );
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('/dashboard');
      // Must not expose the code or any token
      expect(location).not.toContain('valid_code');
      expect(location).not.toContain('token');
    });

    it('calls exchangeCodeForSession with the raw code string', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=abc123'
      );
      await GET(req);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    });
  });

  describe('SCN-10 — success with safe next param → redirects to next', () => {
    it('redirects to /transactions when next=/transactions and exchange succeeds', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=valid_code&next=%2Ftransactions'
      );
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('/transactions');
    });
  });

  describe('SCN-11 — open-redirect blocked', () => {
    it('redirects to /dashboard when next points to an external host', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=valid_code&next=https%3A%2F%2Fevil.com%2Fsteal'
      );
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('/dashboard');
      expect(location).not.toContain('evil.com');
    });

    it('redirects to /dashboard when next is a protocol-relative URL (//evil.com)', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=valid_code&next=%2F%2Fevil.com'
      );
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('/dashboard');
      expect(location).not.toContain('evil.com');
    });
  });

  describe('SCN-12 — missing code → /auth/login?error=missing_code', () => {
    it('redirects to login with missing_code error when no code param', async () => {
      const req = makeRequest('http://localhost:3000/auth/callback');
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('error=missing_code');
      expect(location).toContain('/auth/login');
    });

    it('does NOT call exchangeCodeForSession when code is missing', async () => {
      const req = makeRequest('http://localhost:3000/auth/callback');
      await GET(req);
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe('SCN-13 — exchange failure → /auth/login?error=oauth_exchange_failed', () => {
    it('redirects to login with oauth_exchange_failed when exchange returns error', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'invalid code verifier' },
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=bad_code'
      );
      const response = await GET(req);

      expect([302, 307]).toContain(response.status);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('error=oauth_exchange_failed');
      expect(location).toContain('/auth/login');
    });

    it('does NOT expose raw error message in the redirect URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'invalid code verifier' },
      });

      const req = makeRequest(
        'http://localhost:3000/auth/callback?code=bad_code'
      );
      const response = await GET(req);

      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('invalid code verifier');
    });
  });
});

describe('sanitizeNext (open-redirect guard)', () => {
  it('is exported as a named function for mutation testing', async () => {
    const mod = await import('@/app/auth/callback/route');
    expect(typeof mod.sanitizeNext).toBe('function');
  });

  it('returns undefined for absolute external URLs', async () => {
    const { sanitizeNext } = await import('@/app/auth/callback/route');
    expect(sanitizeNext('https://evil.com')).toBeUndefined();
    expect(sanitizeNext('http://evil.com/path')).toBeUndefined();
  });

  it('returns undefined for protocol-relative URLs', async () => {
    const { sanitizeNext } = await import('@/app/auth/callback/route');
    expect(sanitizeNext('//evil.com')).toBeUndefined();
  });

  it('returns the path for safe relative paths', async () => {
    const { sanitizeNext } = await import('@/app/auth/callback/route');
    expect(sanitizeNext('/dashboard')).toBe('/dashboard');
    expect(sanitizeNext('/transactions')).toBe('/transactions');
    expect(sanitizeNext('/accounts/123')).toBe('/accounts/123');
  });

  it('returns undefined for null/undefined input', async () => {
    const { sanitizeNext } = await import('@/app/auth/callback/route');
    expect(sanitizeNext(null)).toBeUndefined();
    expect(sanitizeNext(undefined)).toBeUndefined();
  });
});
