import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '@/components/layout/main-layout';

const mockUsePathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/dynamic', () => () => () => null);

jest.mock('framer-motion', () => ({
  MotionConfig: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/contexts/sidebar-context', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSidebar: () => ({
    isOpen: false,
    isMobile: false,
    closeSidebar: jest.fn(),
  }),
}));

jest.mock('@/hooks', () => ({
  useModal: () => ({ isOpen: false, closeModal: jest.fn() }),
  useViewportHeight: jest.fn(),
  useMobileInputAutoScroll: jest.fn(),
}));

jest.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

jest.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock('@/components/layout/mobile-nav', () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}));

jest.mock('@/components/layout/mobile-menu-fab', () => ({
  MobileMenuFAB: () => <div data-testid="mobile-menu-fab" />,
}));

describe('App shell scroll contracts', () => {
  it('renders app-shell main without nested overflow scrolling classes', () => {
    const { container } = render(
      <MainLayout>
        <div>Dashboard content</div>
      </MainLayout>
    );

    const appShellMain = document.querySelector('main.app-shell-main');
    const appShellContainer = container.querySelector(
      'div.no-horizontal-scroll.h-full'
    );

    expect(appShellContainer).toBeInTheDocument();
    expect(appShellContainer).not.toHaveAttribute('style');
    expect(appShellMain).toBeInTheDocument();
    expect(appShellMain).toHaveClass('app-shell-main');
    expect(appShellMain).not.toHaveClass('overflow-auto');
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
