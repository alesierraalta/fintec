'use client';

import Header from '@/components/layout/header';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';

function HarnessContent() {
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
  return <div className="min-h-dynamic-screen bg-background text-foreground">
    <Header onMenuClick={toggleSidebar} isMobileMenuOpen={isOpen} />
    <MobileDrawer open={isOpen} onClose={closeSidebar} />
    <main className="px-4 py-6"><h1 className="text-lg font-semibold">Mobile navigation regression harness</h1></main>
  </div>;
}

export function MobileNavigationRegressionHarness() {
  return <SidebarProvider><HarnessContent /></SidebarProvider>;
}
