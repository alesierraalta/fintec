'use client';

import { lazy, Suspense } from 'react';
import { ReportsLoading } from '@/components/ui/suspense-loading';

// Lazy load the heavy reports components
const ReportsContent = lazy(() => import('./reports-content').then(module => ({ default: module.ReportsContent })));

export function LazyReportsContent() {
  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsContent />
    </Suspense>
  );
}

export default LazyReportsContent;