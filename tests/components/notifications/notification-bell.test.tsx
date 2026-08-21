import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '@/components/notifications/notification-bell';

const mockPush = jest.fn();
const mockUseUnreadPolling = jest.fn();
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

jest.mock('@/hooks/use-unread-polling', () => ({
  useUnreadPolling: (...args: unknown[]) => mockUseUnreadPolling(...args),
}));

jest.mock('@/repositories/supabase/notifications-repository-impl', () => ({
  SupabaseNotificationsRepository: jest.fn().mockImplementation(() => ({
    countUnreadByUserId: jest.fn(),
    findUnreadByUserId: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  })),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: { info: jest.fn() },
}));

describe('NotificationBell positioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockUseUnreadPolling.mockImplementation(
      (options: { queryKey: readonly unknown[] }) =>
        options.queryKey[1] === 'unread-count'
          ? { data: 0 }
          : { data: [], isLoading: false }
    );
  });

  it('opens the fixed mobile panel above the trigger', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    const trigger = await screen.findByRole('button', {
      name: 'Notificaciones',
    });
    await user.click(trigger);

    expect(trigger.parentElement).toHaveClass('relative', 'flex-col');
    expect(trigger.parentElement?.parentElement).toHaveClass(
      'fixed',
      'bottom-5',
      'right-5',
      'lg:hidden'
    );
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toHaveClass(
      'absolute',
      'bottom-full',
      'right-0',
      'mb-3'
    );
    expect(screen.getByRole('dialog')).not.toHaveClass('mt-3');
  });

  it('opens the header panel below the trigger', async () => {
    const user = userEvent.setup();
    render(<NotificationBell variant="header" />);

    const trigger = await screen.findByRole('button', {
      name: 'Notificaciones',
    });
    await user.click(trigger);

    expect(trigger.parentElement).toHaveClass('relative', 'flex-col');
    expect(trigger.parentElement).not.toHaveClass('fixed');
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toHaveClass(
      'mt-3'
    );
    expect(screen.getByRole('dialog')).not.toHaveClass('absolute');
  });
});
