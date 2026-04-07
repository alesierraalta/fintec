'use client';

import { MobileMenuFAB } from '@/components/layout/mobile-menu-fab';
import { SidebarProvider } from '@/contexts/sidebar-context';

export function MobileMenuFabRegressionHarness() {
  return (
    <SidebarProvider>
      <div className="min-h-dynamic-screen bg-background text-foreground">
        <main className="px-4 py-6">
          <section className="rounded-3xl border border-border/40 bg-card/90 p-4 shadow-ios backdrop-blur-sm">
            <h1 className="text-lg font-semibold text-foreground">
              Mobile FAB regression harness
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Focused Playwright surface for the móvil Más opciones trigger.
            </p>
          </section>
        </main>

        <MobileMenuFAB />
      </div>
    </SidebarProvider>
  );
}
