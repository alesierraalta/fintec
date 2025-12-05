'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { AddTransactionContent } from '@/components/transactions/add-transaction-content';

export default function AddTransactionPage() {
  return (
    <MainLayout>
      <AddTransactionContent />
    </MainLayout>
  );
}
