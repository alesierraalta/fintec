'use client';

import dynamic from 'next/dynamic';
import { ChartLoading } from '@/components/ui/suspense-loading';
import type { AdminStats } from '@/lib/admin-stats/types';

// Recharts is ~290 KB minified; load it only when the admin dashboard
// renders its charts (see lazy-spending-chart.tsx for the same pattern).
const AdminChartsSection = dynamic(
  () =>
    import('./admin-charts-section').then((mod) => ({
      default: mod.AdminChartsSection,
    })),
  {
    loading: () => <ChartLoading />,
    ssr: false,
  }
);

export function LazyAdminCharts({ data }: { data: AdminStats }) {
  return <AdminChartsSection data={data} />;
}
