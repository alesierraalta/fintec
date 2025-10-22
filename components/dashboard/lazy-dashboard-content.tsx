'use client';

import { lazy, Suspense } from 'react';
import { DashboardLoading } from '@/components/ui/suspense-loading';

// Lazy load the heavy dashboard components
const DashboardContent = lazy(() => import('./dashboard-content').then(module => ({ default: module.DashboardContent })));

export function LazyDashboardContent() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

export default LazyDashboardContent;
