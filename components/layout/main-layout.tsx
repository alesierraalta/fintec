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
import { useModal, useViewportHeight } from '@/hooks';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { TransactionType } from '@/types';
import { AIChatFab } from '@/components/ai/ai-chat-fab';
import { AIChatModal } from '@/components/ai/ai-chat-modal';
import { AIChatProvider } from '@/contexts/ai-chat-context';

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

  // Hide floating button on add transaction page
  const shouldShowFloatingButton = !pathname.includes('/transactions/add');

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
      <div className="flex h-full relative no-horizontal-scroll">
        {/* Mobile Backdrop */}
        {clientIsMobile && isOpen && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div 
          className={`
            ${clientIsMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
            ${clientIsMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
            ${clientIsMobile ? 'w-64' : (isOpen ? 'w-64' : 'w-16')}
            overflow-hidden
          `}
          data-tutorial="sidebar"
        >
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 no-horizontal-scroll">
          <Header />
          
          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-auto bg-background no-horizontal-scroll",
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
      {shouldShowFloatingButton && (
        <div className="fixed bottom-24 right-6 z-40">
          <button
            onClick={() => window.location.href = '/transactions/add'}
            className="w-14 h-14 rounded-full shadow-ios-lg bg-green-500 hover:bg-green-600 text-white hover:scale-110 active:scale-95 transition-ios flex items-center justify-center backdrop-blur-sm"
            title="Agregar transacción"
            style={{ zIndex: 9999 }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* AI Chat FAB (solo para usuarios premium) */}
      <AIChatFab />

      {/* AI Chat Modal (oculto en página de chats) */}
      {pathname !== '/chats' && <AIChatModal />}

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
      <AIChatProvider>
        <MainLayoutContent>
          {children}
        </MainLayoutContent>
      </AIChatProvider>
    </SidebarProvider>
  );
}
