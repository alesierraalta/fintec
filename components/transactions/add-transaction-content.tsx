'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/contexts/sidebar-context';
import { MobileAddTransaction } from './mobile-add-transaction';

// Disable SSR for DesktopAddTransaction to prevent hydration errors
const DesktopAddTransaction = dynamic(
  () =>
    import('./desktop-add-transaction').then((mod) => ({
      default: mod.DesktopAddTransaction,
    })),
  { ssr: false }
);

const subscribe = () => () => {};

export function AddTransactionContent() {
  const { isMobile } = useSidebar();
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">
          Cargando...
        </div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileAddTransaction />;
  }

  return <DesktopAddTransaction />;
}
