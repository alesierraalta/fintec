'use client';

import dynamic from 'next/dynamic';
import { ChartLoading } from '@/components/ui/suspense-loading';

// Dynamic import of the heavy Recharts-based component
// This reduces the initial bundle size by loading Recharts only when needed
const SpendingChart = dynamic(
  () => import('./spending-chart').then((mod) => ({ default: mod.SpendingChart })),
  {
    loading: () => <ChartLoading />,
    ssr: false,
  }
);

export function LazySpendingChart() {
  return <SpendingChart />;
}

export default LazySpendingChart;
