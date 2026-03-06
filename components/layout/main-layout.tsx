'use client';

import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FormLoading } from '@/components/ui/suspense-loading';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { MobileMenuFAB } from './mobile-menu-fab';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { useModal, useViewportHeight, useMobileInputAutoScroll } from '@/hooks';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { TransactionType } from '@/types';

const TransactionForm = dynamic(
  () =>
    import('@/components/forms/transaction-form').then(
      (mod) => mod.TransactionForm
    ),
  { loading: () => <FormLoading />, ssr: false }
);

const FloatingActionButton = dynamic(
  () =>
    import('@/components/ui/floating-action-button').then(
      (mod) => mod.FloatingActionButton
    ),
  { ssr: false }
);

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, isMobile, closeSidebar } = useSidebar();
  const { isOpen: isModalOpen, closeModal } = useModal();
  useViewportHeight();

  // Auto-scroll global para todos los inputs en móvil
  useMobileInputAutoScroll();

  // Usar isMobile directamente para evitar retrasos de render

  // Hide floating button on specific pages that have their own FABs
  // Logic for Global FAB (New Transaction)
  // We use an Allowlist approach: Only show on Dashboard and Transactions page.
  // This prevents conflicts on all other pages (Goals, Budgets, Chat, etc.) automatically.
  const showGlobalFab =
    (pathname === '/' ||
      pathname === '/dashboard' ||
      pathname === '/transactions') &&
    !pathname.includes('/add');
  const hideMobileChrome = pathname.startsWith('/transactions/add');

  return (
    <div
      className={cn(
        'no-horizontal-scroll h-full bg-background text-foreground',
        isMobile && 'mobile-app'
      )}
    >
      <div className="no-horizontal-scroll flex h-full">
        {/* Mobile Backdrop */}
        {isMobile && isOpen && (
          <div
            className="fixed inset-0 z-40 animate-fade-in bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Desktop Sidebar - Only render on desktop */}
        {!isMobile && (
          <div
            className={`flex flex-shrink-0 ${isOpen ? 'w-64' : 'w-16'} transition-ios overflow-hidden`}
            data-tutorial="sidebar"
          >
            <Sidebar />
          </div>
        )}

        {/* Main Content */}
        <div className="no-horizontal-scroll flex min-w-0 flex-1 flex-col">
          <Header />

          {/* Page Content */}
          <main
            className={cn(
              'app-shell-main no-horizontal-scroll flex-1 bg-background',
              isMobile && !hideMobileChrome ? 'pb-24' : ''
            )}
          >
            <div
              className={cn(
                isMobile
                  ? 'no-horizontal-scroll px-4 py-6' // Mobile app-like padding
                  : 'no-horizontal-scroll mx-auto max-w-7xl px-6 py-8' // Desktop padding
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      {!hideMobileChrome && <MobileNav />}

      {/* Mobile Menu FAB */}
      {!hideMobileChrome && <MobileMenuFAB />}

      {/* Floating Add Transaction Button */}
      {showGlobalFab && (
        <FloatingActionButton
          onClick={() => router.push('/transactions/add')}
          label="Nueva"
          icon={<Plus className="h-6 w-6" />}
          mobileOnly={true}
          position="bottom-right"
          variant="success"
          className="z-40"
        />
      )}

      {/* Transaction Form Modal */}
      {isModalOpen && (
        <TransactionForm
          isOpen={isModalOpen}
          onClose={closeModal}
          type={TransactionType.EXPENSE}
        />
      )}
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
