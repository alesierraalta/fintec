'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { AddTransactionContent } from '@/components/transactions/add-transaction-content';
import { useSidebar } from '@/contexts/sidebar-context';

export default function AddTransactionPage() {
  return (
    <MainLayout>
      <AddTransactionContent />
    </MainLayout>
  );
}
