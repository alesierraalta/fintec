'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { FormLoading } from '@/components/ui/suspense-loading';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { MobileMenuFAB } from './mobile-menu-fab';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { TransactionForm } from '@/components/forms';
import { useModal, useViewportHeight, useMobileInputAutoScroll } from '@/hooks';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { TransactionType } from '@/types';
import { FloatingActionButton } from '@/components/ui/floating-action-button';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, isMobile, closeSidebar } = useSidebar();
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();
  const [mounted, setMounted] = useState(false);
  const viewportHeight = useViewportHeight();

  // Auto-scroll global para todos los inputs en móvil
  useMobileInputAutoScroll();

  // Estado local sincronizado para evitar problemas de hidratación
  // Se inicializa como false (consistente con SSR) y se sincroniza después del mount
  const [clientIsMobile, setClientIsMobile] = useState(false);

  // Efecto para establecer mounted solo una vez al montar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Efecto separado para sincronizar clientIsMobile cuando isMobile cambia
  // Esto evita que el componente se desmonte/remonte al cambiar el breakpoint
  useEffect(() => {
    setClientIsMobile(isMobile);
  }, [isMobile]);

  // Hide floating button on specific pages that have their own FABs
  // Logic for Global FAB (New Transaction)
  // We use an Allowlist approach: Only show on Dashboard and Transactions page.
  // This prevents conflicts on all other pages (Goals, Budgets, Chat, etc.) automatically.
  const showGlobalFab =
    (pathname === '/' || pathname === '/dashboard' || pathname === '/transactions') &&
    !pathname.includes('/add');

  if (!mounted) {
    return null;
  }

  // Aplicar height dinámico después del mount y cuando el height esté disponible
  // Esto evita hydration mismatch y layout shift
  // Mejorado: aplicar incluso sin visualViewport si tenemos el height del hook
  const dynamicHeight =
    mounted &&
      viewportHeight !== null &&
      typeof window !== 'undefined'
      ? { height: `${viewportHeight}px` }
      : undefined;

  return (
    <div
      className={cn(
        "h-dynamic-screen bg-background text-foreground overflow-hidden no-horizontal-scroll",
        clientIsMobile && "mobile-app"
      )}
      style={dynamicHeight}
    >
      <div className="flex h-full no-horizontal-scroll">
        {/* Mobile Backdrop */}
        {clientIsMobile && isOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={closeSidebar}
          />
        )}

        {/* Desktop Sidebar - Only render on desktop */}
        {!clientIsMobile && (
          <div
            className={`flex flex-shrink-0 ${isOpen ? 'w-64' : 'w-16'} overflow-hidden transition-ios`}
            data-tutorial="sidebar"
          >
            <Sidebar />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 no-horizontal-scroll">
          <Header />

          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-auto bg-background no-horizontal-scroll overscroll-y-contain",
            clientIsMobile ? "pb-24" : ""
          )}>
            <div className={cn(
              clientIsMobile
                ? "px-4 py-6 no-horizontal-scroll" // Mobile app-like padding
                : "px-6 py-8 max-w-7xl mx-auto no-horizontal-scroll" // Desktop padding
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Mobile Menu FAB */}
      <MobileMenuFAB />

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
      <Suspense fallback={<FormLoading />}>
        <TransactionForm
          isOpen={isModalOpen}
          onClose={closeModal}
          type={TransactionType.EXPENSE}
        />
      </Suspense>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>
        {children}
      </MainLayoutContent>
    </SidebarProvider>
  );
}
