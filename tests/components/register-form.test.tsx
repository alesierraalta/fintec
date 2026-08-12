/**
 * T1.6 — RegisterForm: Google sign-in button integration
 * Unit tests (dom/jsdom project)
 * Satisfies: REQ-01, REQ-02 (SCN-02 unit portion)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    <button type="button" aria-label="Continue with Google" disabled={disabled}>
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
  Input: ({ label, id, hint, ...props }: any) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} {...props} />
      {hint && <p id={`${id}-hint`}>{hint}</p>}
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
    expect(
      screen.getByRole('button', { name: /registrarme/i })
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole('button', { name: /registrarme/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
  });
});

describe('RegisterForm — password policy and validation (T-fix)', () => {
  async function fillAndSubmit(options: {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    const user = userEvent.setup();
    if (options.fullName !== undefined) {
      await user.type(
        screen.getByLabelText(/nombre completo/i),
        options.fullName
      );
    }
    if (options.email !== undefined) {
      await user.type(screen.getByLabelText(/email/i), options.email);
    }
    if (options.password !== undefined) {
      await user.type(screen.getByLabelText(/contraseña/i), options.password);
    }
    if (options.confirmPassword !== undefined) {
      await user.type(
        screen.getByLabelText(/confirmar/i),
        options.confirmPassword
      );
    }
    await user.click(screen.getByRole('button', { name: /registrarme/i }));
  }

  it('shows the app-known password requirement before submit', () => {
    render(<RegisterForm />);
    expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
  });

  it('accepts a 6-character password at the boundary and submits it unchanged', async () => {
    render(<RegisterForm />);
    await fillAndSubmit({
      fullName: 'Test User',
      email: 'test@example.com',
      password: '123456',
      confirmPassword: '123456',
    });
    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignUp.mock.calls[0][1]).toBe('123456');
  });

  it('rejects a password shorter than 6 characters without calling signUp', async () => {
    render(<RegisterForm />);
    await fillAndSubmit({
      fullName: 'Test User',
      email: 'test@example.com',
      password: '12345',
      confirmPassword: '12345',
    });
    expect(
      screen.getByText('La contraseña debe tener al menos 6 caracteres')
    ).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling signUp', async () => {
    render(<RegisterForm />);
    await fillAndSubmit({
      fullName: 'Test User',
      email: 'test@example.com',
      password: '123456',
      confirmPassword: '654321',
    });
    expect(
      screen.getByText('Las contraseñas no coinciden')
    ).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
