'use client';

import { lazy, Suspense } from 'react';
import { ChartLoading } from '@/components/ui/suspense-loading';

// Lazy load the heavy chart component
const SpendingChart = lazy(() => import('./spending-chart').then(module => ({ default: module.SpendingChart })));

export function LazySpendingChart() {
  return (
    <Suspense fallback={<ChartLoading />}>
      <SpendingChart />
    </Suspense>
  );
}

export default LazySpendingChart;