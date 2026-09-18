import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '@/components/layout/header';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/transactions',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
    signOut: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-is-native', () => ({
  useIsNative: () => false,
}));

jest.mock('@/components/branding/fintec-logo', () => ({
  FinTecLogo: () => <span>FinTec</span>,
}));

jest.mock('@/components/currency/rate-selector', () => ({
  __esModule: true,
  default: () => <span data-testid="rate-selector" />,
}));

jest.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <span>Notifications</span>,
}));

jest.mock('@/components/subscription/premium-status-card', () => ({
  PremiumStatusCard: () => <span>Premium</span>,
}));

jest.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <span>Theme</span>,
}));

describe('Header desktop add menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.innerWidth = 1200;
  });

  it('navigates individual transactions to the canonical add route', async () => {
    render(<Header onMenuClick={jest.fn()} isMobileMenuOpen={false} />);

    const trigger = await waitFor(() => screen.getByTitle('Añadir nuevo'));
    fireEvent.click(trigger);
    fireEvent.click(
      await waitFor(() =>
        screen.getByRole('button', { name: /nueva transacción/i })
      )
    );

    expect(mockPush).toHaveBeenCalledWith('/transactions/add');
    expect(mockPush).not.toHaveBeenCalledWith('/transactions?action=add');
  });

  it('keeps batch transactions on the existing action route', async () => {
    render(<Header onMenuClick={jest.fn()} isMobileMenuOpen={false} />);

    fireEvent.click(await waitFor(() => screen.getByTitle('Añadir nuevo')));
    fireEvent.click(
      await waitFor(() =>
        screen.getByRole('button', { name: /agregar en lote/i })
      )
    );

    expect(mockPush).toHaveBeenCalledWith('/transactions?action=batch');
  });
});
