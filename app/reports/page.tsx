'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { LazyReportsContent } from '@/components/reports/lazy-reports-content';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function ReportsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <LazyReportsContent />
      </MainLayout>
    </AuthGuard>
  );
}
