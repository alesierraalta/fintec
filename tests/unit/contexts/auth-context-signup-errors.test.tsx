/**
 * T-fix — AuthContext signUp error translation
 *
 * The old translator matched substrings of the English error message
 * (`includes('Password')`), which mislabeled non-password server errors as
 * "weak password (8 chars + upper/lower/numbers)" and claimed a policy that
 * the app does not configure. These tests lock the structured-code behavior:
 * translate by `error.code`, render weak-password `reasons` honestly, and keep
 * unknown server errors safe and generic — never blaming the password without
 * evidence and never leaking submitted values.
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
const mockOnAuthStateChange = jest.fn();
const mockSignUp = jest.fn();

jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
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

function setupDefaultMocks() {
  capturedContext = null;
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
}

async function signUpThroughContext(
  email: string,
  password: string
): Promise<void> {
  await act(async () => {
    await capturedContext!.signUp(email, password, { full_name: 'Test User' });
  });
}

// Realistic AuthError shapes as produced by @supabase/auth-js handleError().
function weakPasswordError(reasons: string[]) {
  return {
    name: 'AuthWeakPasswordError',
    code: 'weak_password',
    status: 422,
    message: 'Password should be at least 6 characters.',
    reasons,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

describe('signUp — structured error translation', () => {
  it('weak_password: renders structured reasons honestly, no fictional policy, no password leakage', async () => {
    const password = 'Abc123!';
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: weakPasswordError(['length']),
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', password);

    expect(capturedContext?.authError).toMatch(/más caracteres/i);
    expect(capturedContext?.authError).not.toMatch(/8 caracteres|mayúsculas/i);
    expect(capturedContext?.authError).not.toContain(password);
  });

  it('weak_password: surfaces every server-provided unmet reason', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: weakPasswordError(['characters', 'pwned']),
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).toMatch(/tipos de caracteres/i);
    expect(capturedContext?.authError).toMatch(/filtraci/i);
  });

  it('weak_password with no reasons: falls back to a safe generic message', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: weakPasswordError([]),
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).toMatch(/no cumple los requisitos/i);
  });

  it('signup_requires_valid_password (contains the word "Password") is NOT relabeled as a weak-password claim', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        code: 'signup_requires_valid_password',
        status: 422,
        message: 'Signup requires a valid password',
      },
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).not.toMatch(/8 caracteres|mayúsculas/i);
    expect(capturedContext?.authError).toMatch(/No pudimos crear tu cuenta/);
  });

  it('generic server error that merely contains the word "Password" is not blamed on the password', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        code: 'unexpected_failure',
        status: 500,
        message: 'Database error while storing the Password hash for user',
      },
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).not.toMatch(/8 caracteres|mayúsculas/i);
    expect(capturedContext?.authError).toMatch(/No pudimos crear tu cuenta/);
  });

  it('email_exists maps to the already-registered message', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        code: 'email_exists',
        status: 422,
        message: 'A user with this email address has already been registered',
      },
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).toMatch(/ya está registrado/i);
  });

  it('unknown error without a code: safe generic message, no raw English leakage', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        code: undefined,
        status: 500,
        message: 'Database error saving new user',
      },
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', 'Abc123!');

    expect(capturedContext?.authError).toMatch(/No pudimos crear tu cuenta/);
    expect(capturedContext?.authError).not.toContain(
      'Database error saving new user'
    );
  });

  it('success: passes email and password bytes to supabase.auth.signUp unchanged', async () => {
    const password = 'AbC12!xYz-456';
    mockSignUp.mockResolvedValue({
      data: {
        user: {
          id: 'user-new',
          email: 'new@example.com',
          identities: [{ provider: 'email' }],
        },
        session: null,
      },
      error: null,
    });

    renderProvider();
    await waitFor(() => expect(capturedContext?.loading).toBe(false));
    await signUpThroughContext('new@example.com', password);

    const callArgs = mockSignUp.mock.calls[0][0];
    expect(callArgs.email).toBe('new@example.com');
    expect(callArgs.password).toBe(password);
    expect(callArgs.options?.data).toEqual({ full_name: 'Test User' });
  });
});
