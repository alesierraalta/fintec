'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { FormLoading } from '@/components/ui/suspense-loading';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { TransactionForm } from '@/components/forms';
import { useModal } from '@/hooks';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { TransactionType } from '@/types';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, isMobile, closeSidebar } = useSidebar();
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide floating button on add transaction page
  const shouldShowFloatingButton = !pathname.includes('/transactions/add');

  if (!mounted) {
    return null;
  }

  return (
    <div className={cn(
      "h-screen bg-background text-foreground overflow-hidden transition-ios",
      isMobile && "mobile-app"
    )}>
      <div className="flex h-full relative">
        {/* Mobile Backdrop */}
        {isMobile && isOpen && (
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div 
          className={`
            ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
            ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
            ${isMobile ? 'w-64' : (isOpen ? 'w-64' : 'w-16')}
            transition-all duration-300 ease-in-out overflow-hidden
          `}
          data-tutorial="sidebar"
        >
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          
          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-auto bg-background",
            isMobile ? "pb-24" : ""
          )}>
            <div className={cn(
              isMobile 
                ? "px-4 py-6" // Mobile app-like padding
                : "px-6 py-8 max-w-7xl mx-auto" // Desktop padding
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Floating Add Transaction Button */}
      {shouldShowFloatingButton && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => window.location.href = '/transactions/add'}
            className="w-14 h-14 rounded-full shadow-ios-lg bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-110 active:scale-95 transition-ios flex items-center justify-center backdrop-blur-sm"
            title="Agregar transacción"
            style={{ zIndex: 9999 }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
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
