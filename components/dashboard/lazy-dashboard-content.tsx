'use client';

import { lazy, Suspense } from 'react';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';

// Lazy load the heavy dashboard components
const DashboardContent = lazy(() => import('./dashboard-content').then(module => ({ default: module.DashboardContent })));

export function LazyDashboardContent() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

export default LazyDashboardContent;
