import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MobileDrawer } from '@/components/layout/mobile-drawer';

const mockCloseSidebar = jest.fn();
jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => ({
    isMobile: true,
    isOpen: true,
    closeSidebar: mockCloseSidebar,
    toggleSidebar: jest.fn(),
  }),
}));

jest.mock('@/contexts/admin-access-context', () => ({
  useAdminAccess: () => false,
}));

jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({
    isPremium: true,
  }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('@/components/providers/native-back-navigation', () => ({
  useNativeBackNavigation: () => jest.fn(() => jest.fn()),
}));

describe('MobileDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly when open and displays title and navigation items', () => {
    render(<MobileDrawer open={true} onClose={mockCloseSidebar} />);

    expect(screen.getByTestId('mobile-drawer-root')).toBeInTheDocument();
    expect(screen.getByText('Más opciones')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-drawer-close')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<MobileDrawer open={true} onClose={mockCloseSidebar} />);

    const closeBtn = screen.getByTestId('mobile-drawer-close');
    fireEvent.click(closeBtn);

    expect(mockCloseSidebar).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key press', () => {
    render(<MobileDrawer open={true} onClose={mockCloseSidebar} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockCloseSidebar).toHaveBeenCalledTimes(1);
  });

  it('uses lightweight solid background and GPU transforms without heavy backdrop-blur filters', () => {
    render(<MobileDrawer open={true} onClose={mockCloseSidebar} />);

    const root = screen.getByTestId('mobile-drawer-root');
    const aside = root.querySelector('aside');
    const backdrop = root.querySelector('button');

    // Performance regression check: MUST NOT use glass-card or backdrop-blur
    expect(aside?.className).not.toContain('glass-card');
    expect(aside?.className).not.toContain('backdrop-blur');
    expect(backdrop?.className).not.toContain('backdrop-blur');

    // Must use GPU transform and will-change
    expect(aside?.className).toContain('transform-gpu');
    expect(aside?.className).toContain('will-change-transform');
  });

  it('unmounts cleanly when open becomes false after animation timer', () => {
    const { rerender } = render(
      <MobileDrawer open={true} onClose={mockCloseSidebar} />
    );
    expect(screen.getByTestId('mobile-drawer-root')).toBeInTheDocument();

    rerender(<MobileDrawer open={false} onClose={mockCloseSidebar} />);

    // Before timer completes, it initiates exit animation
    act(() => {
      jest.advanceTimersByTime(230);
    });

    expect(screen.queryByTestId('mobile-drawer-root')).not.toBeInTheDocument();
  });
});
