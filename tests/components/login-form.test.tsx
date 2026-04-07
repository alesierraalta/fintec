import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth';

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSignIn = jest.fn();
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
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileHover?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks', () => ({
  useMobileInputAutoScroll: jest.fn(),
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
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      user: null,
      session: null,
      loading: false,
      authError: null,
      clearAuthError: mockClearAuthError,
    } as any);
  });

  it('shows explicit validation when email and password are missing', () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', {
      name: /entrar/i,
    });
    const form = submitButton.closest('form');

    if (!form) {
      throw new Error('Login form not found');
    }

    fireEvent.submit(form);

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ingresa tu email y contraseña.'
    );
  });

  it('renders auth-context login errors visibly for the user', () => {
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      user: null,
      session: null,
      loading: false,
      authError: 'Credenciales incorrectas. Verifica tu email y contraseña.',
      clearAuthError: mockClearAuthError,
    } as any);

    render(<LoginForm />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Credenciales incorrectas. Verifica tu email y contraseña.'
    );
  });

  it('shows a fallback error when signIn returns an error without a visible auth message', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.'
    );
  });

  it('shows a fallback error when submit throws unexpectedly', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue(new Error('network down'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado al iniciar sesión. Intentá de nuevo.'
    );
  });
});
