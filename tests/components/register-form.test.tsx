/**
 * T1.6 — RegisterForm: Google sign-in button integration
 * Unit tests (dom/jsdom project)
 * Satisfies: REQ-01, REQ-02 (SCN-02 unit portion)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RegisterForm } from '@/components/auth/register-form';
import { useAuth } from '@/hooks/use-auth';

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockClearAuthError = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      variants: _variants,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

// Mock GoogleSignInButton so we don't need to mock all of its dependencies here
jest.mock('@/components/auth/google-sign-in-button', () => ({
  GoogleSignInButton: ({
    disabled,
    next: _next,
  }: {
    disabled?: boolean;
    next?: string;
  }) => (
    <button
      type="button"
      aria-label="Continue with Google"
      disabled={disabled}
    >
      Continue with Google
    </button>
  ),
}));

jest.mock('@/components/ui', () => ({
  Button: ({ children, icon, loading: _loading, ...props }: any) => (
    <button {...props}>
      {icon}
      {children}
    </button>
  ),
  Input: ({ label, id, ...props }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...props} />
    </div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignUp.mockResolvedValue({ error: null });
  mockSignInWithGoogle.mockResolvedValue({ error: null });
  mockUseAuth.mockReturnValue({
    signUp: mockSignUp,
    signIn: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    resendVerification: jest.fn(),
    updateProfile: jest.fn(),
    signInWithGoogle: mockSignInWithGoogle,
    user: null,
    session: null,
    loading: false,
    baseCurrency: 'USD',
    authError: null,
    clearAuthError: mockClearAuthError,
  } as any);
});

describe('RegisterForm — Google sign-in button (T1.6)', () => {
  it('renders without crashing', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('button', { name: /registrarme/i })).toBeInTheDocument();
  });

  it('renders the GoogleSignInButton with accessible text', () => {
    render(<RegisterForm />);
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it('renders a divider (or) between submit and Google button', () => {
    render(<RegisterForm />);
    expect(screen.getByText(/^o$/i)).toBeInTheDocument();
  });

  it('Google button is enabled by default', () => {
    render(<RegisterForm />);
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeEnabled();
  });

  it('existing register button is still present alongside Google button', () => {
    render(<RegisterForm />);
    // Both buttons should be present
    expect(screen.getByRole('button', { name: /registrarme/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
  });
});
