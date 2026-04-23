import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileNav } from '@/components/layout/mobile-nav';

const mockUsePathname = jest.fn(() => '/transactions');
const mockUseSidebar = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next/link', () => {
  return ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => mockUseSidebar(),
}));

describe('Mobile navigation layout contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSidebar.mockReturnValue({ isMobile: true });

    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    document.getElementById('modal-root')?.remove();
  });

  it('renders a safe-area-aware mobile nav with fully tappable actions', () => {
    render(<MobileNav />);

    const nav = screen.getByRole('navigation', {
      name: 'Navegación móvil principal',
    });
    const links = screen.getAllByRole('link');
    const activeLink = screen.getByRole('link', { name: 'Gastos' });

    expect(nav).toBeInTheDocument();
    expect(nav).toHaveStyle({
      paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
      paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
    });
    expect(links).toHaveLength(6);
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    for (const link of links) {
      expect(link).toHaveClass(
        'min-h-[52px]',
        'min-w-0',
        'basis-0',
        'px-1',
        'py-1.5'
      );
    }
  });

  it('does not render outside mobile mode', () => {
    mockUseSidebar.mockReturnValue({ isMobile: false });

    render(<MobileNav />);

    expect(
      screen.queryByRole('navigation', { name: 'Navegación móvil principal' })
    ).not.toBeInTheDocument();
  });
});
