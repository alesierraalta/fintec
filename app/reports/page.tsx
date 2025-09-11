'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { LazyReportsContent } from '@/components/reports/lazy-reports-content';

export default function ReportsPage() {
  return (
    <MainLayout>
      <LazyReportsContent />
    </MainLayout>
  );
}
