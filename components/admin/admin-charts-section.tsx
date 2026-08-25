'use client';

import { AdminStatsCharts } from './admin-stats-charts';
import { AdminFeatureUsage } from './admin-feature-usage';
import type { AdminStats } from '@/lib/admin-stats/types';

/**
 * Single lazy boundary for every recharts-based admin section.
 * Importing both chart components through one module keeps recharts in a
 * single shared async chunk instead of duplicating it per import graph.
 */
export function AdminChartsSection({ data }: { data: AdminStats }) {
  return (
    <>
      <AdminStatsCharts data={data} />
      <AdminFeatureUsage featureUsage={data.featureUsage} />
    </>
  );
}
