import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Header from '@/components/layout/header';

const mockUseSidebar = jest.fn();
const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockToggleSidebar = jest.fn();
const mockNotificationsRepo = {
  findUnreadByUserId: jest.fn(),
  countUnreadByUserId: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string; src?: string }) => (
    <img alt={props.alt ?? ''} src={props.src ?? ''} />
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => mockUseSidebar(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: { full_name: 'Usuario Test' },
    },
    signOut: mockSignOut,
  }),
}));

jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({
    tier: 'free',
    isPremium: false,
  }),
}));

jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: () => ({
    accounts: [],
  }),
}));

jest.mock('@/providers/repository-provider', () => ({
  useRepository: () => ({
    notifications: mockNotificationsRepo,
  }),
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: () => ({ usd: 1, eur: 1 }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 1,
}));

jest.mock('@/components/currency/rate-selector', () => ({
  __esModule: true,
  default: () => (
    <button
      type="button"
      data-testid="rate-selector-mock"
      className="h-11 min-h-[44px] w-11 min-w-[44px]"
    />
  ),
}));

describe('Header overlay portalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSidebar.mockReturnValue({
      isOpen: true,
      isMobile: false,
      toggleSidebar: mockToggleSidebar,
    });

    mockNotificationsRepo.findUnreadByUserId.mockResolvedValue([]);
    mockNotificationsRepo.countUnreadByUserId.mockResolvedValue(0);
    mockNotificationsRepo.markAsRead.mockResolvedValue(undefined);
    mockNotificationsRepo.markAllAsRead.mockResolvedValue(undefined);

    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  it('portals user menu outside the header and closes by backdrop', async () => {
    render(<Header onMenuClick={() => {}} isMobileMenuOpen={false} />);

    const header = screen.getByRole('banner');
    fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));

    const userMenu = await screen.findByText('Mi Perfil');
    expect(header.contains(userMenu)).toBe(false);

    const panel = document.getElementById('user-menu-desktop');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('z-[55]');

    const backdrop = document.querySelector(
      '[data-overlay-backdrop="desktop-user-menu"]'
    );
    expect(backdrop).toHaveClass('z-[54]');

    fireEvent.click(backdrop as Element);

    await waitFor(() => {
      expect(
        document.getElementById('user-menu-desktop')
      ).not.toBeInTheDocument();
    });
  });

  it('shows notifications inline and closes by clicking the bell again', async () => {
    render(<Header onMenuClick={() => {}} isMobileMenuOpen={false} />);

    const header = screen.getByRole('banner');
    fireEvent.click(screen.getByLabelText('Notificaciones'));

    const notificationsTitle = await screen.findByText('Notificaciones');
    expect(header.contains(notificationsTitle)).toBe(true);

    fireEvent.click(screen.getByLabelText('Notificaciones'));

    await waitFor(() => {
      expect(screen.queryByText('Notificaciones')).not.toBeInTheDocument();
    });
  });

  it('keeps a higher-priority surface interactive over header overlays', async () => {
    const onTopLayerClick = jest.fn();

    render(
      <>
        <Header onMenuClick={() => {}} isMobileMenuOpen={false} />
        <button
          type="button"
          data-testid="top-layer"
          className="fixed z-[60]"
          onClick={onTopLayerClick}
        >
          Top Layer
        </button>
      </>
    );

    fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));
    expect(await screen.findByText('Mi Perfil')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('top-layer'));
    expect(onTopLayerClick).toHaveBeenCalledTimes(1);

    const userPanel = document.getElementById('user-menu-desktop');
    const backdrop = document.querySelector(
      '[data-overlay-backdrop="desktop-user-menu"]'
    );

    expect(userPanel).toHaveClass('z-[55]');
    expect(backdrop).toHaveClass('z-[54]');
  });

  it('keeps the mobile header row shrink-safe on narrow layouts', () => {
    mockUseSidebar.mockReturnValue({
      isOpen: false,
      isMobile: true,
      toggleSidebar: mockToggleSidebar,
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event('resize'));

    render(<Header onMenuClick={() => {}} isMobileMenuOpen={false} />);

    const header = screen.getByRole('banner');
    const safeAreaSpacer = header.firstElementChild;
    const mobileRow = header.lastElementChild;
    const userButton = screen.getByLabelText('Abrir menú de usuario');

    expect(header).toHaveClass('overflow-x-hidden');
    expect(safeAreaSpacer).toHaveAttribute('aria-hidden', 'true');
    expect(mobileRow).toHaveClass(
      'flex',
      'h-14',
      'w-full',
      'shrink-0',
      'items-center',
      'justify-between',
      'px-4'
    );
    expect(userButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
  });
});
