import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/sidebar';
import { AdminAccessProvider } from '@/contexts/admin-access-context';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => ({
    closeSidebar: jest.fn(),
    isMobile: false,
    isOpen: true,
  }),
}));
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({ isPremium: false }),
}));
jest.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));
jest.mock('@/components/branding/fintec-logo', () => ({
  FinTecLogo: () => null,
}));
jest.mock('@/components/subscription/upgrade-button', () => ({
  UpgradeButton: () => null,
}));
jest.mock('@/components/subscription/premium-status-card', () => ({
  PremiumStatusCard: () => null,
}));

describe('admin sidebar visibility', () => {
  it.each([true, false])(
    'renders admin link only for server-derived access=%s',
    (isAdmin) => {
      render(
        <AdminAccessProvider isAdmin={isAdmin}>
          <Sidebar />
        </AdminAccessProvider>
      );
      const links = screen.queryAllByRole('link', { name: /Admin/i });
      expect(links).toHaveLength(isAdmin ? 1 : 0);
      if (isAdmin) expect(links[0]).toHaveAttribute('href', '/admin');
    }
  );
});
