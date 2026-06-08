import { AuthError } from '@/lib/errors/auth-error';

// Mock react cache — execute the wrapped function directly
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: jest.fn((fn: unknown) => fn),
}));

// Mock next/headers (used inside lib/supabase/server.ts)
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
  headers: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(null),
  }),
}));

// Mock the Supabase server client factory
const mockGetUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Import after mocks
const { getAuthenticatedUser } = require('@/lib/auth/get-authenticated-user');

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('failed authentication', () => {
    it('should throw AuthError (not plain Error) when Supabase returns an auth error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(AuthError);
    });

    it('should throw AuthError with statusCode 401 when Supabase auth fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      try {
        await getAuthenticatedUser();
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).statusCode).toBe(401);
      }
    });

    it('should throw AuthError when user is null (no error object)', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getAuthenticatedUser()).rejects.toBeInstanceOf(AuthError);
    });

    it('should NOT throw a plain Error when auth fails', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Expired' },
      });

      try {
        await getAuthenticatedUser();
        fail('expected to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).statusCode).toBe(401);
      }
    });
  });

  describe('successful authentication', () => {
    it('should return the user id when authentication succeeds', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const userId = await getAuthenticatedUser();

      expect(userId).toBe('user-123');
    });

    it('should return a string user id', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'abc-def-123' } },
        error: null,
      });

      const userId = await getAuthenticatedUser();

      expect(typeof userId).toBe('string');
    });
  });
});
