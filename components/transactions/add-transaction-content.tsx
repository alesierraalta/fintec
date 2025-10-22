'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { MobileAddTransaction } from './mobile-add-transaction';
import { DesktopAddTransaction } from './desktop-add-transaction';

export function AddTransactionContent() {
  const { isMobile } = useSidebar();

  if (isMobile) {
    return <MobileAddTransaction />;
  }

  return <DesktopAddTransaction />;
}
