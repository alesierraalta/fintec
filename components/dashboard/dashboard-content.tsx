'use client';

import { useState, useCallback } from 'react';
import dayjs from '@/lib/dates/dayjs';
import type { DashboardPeriod } from '@/lib/dates/dashboard-periods';
import { useSidebar } from '@/contexts/sidebar-context';
import { MobileDashboard } from './mobile-dashboard';
import { DesktopDashboard } from './desktop-dashboard';

export function DashboardContent() {
  const { isMobile } = useSidebar();
  const [selection, setSelection] = useState({
    period: 'this_month' as DashboardPeriod,
    referenceNow: dayjs(),
  });
  const onPeriodChange = useCallback((period: DashboardPeriod) => {
    setSelection({ period, referenceNow: dayjs() });
  }, []);
  const props = { ...selection, onPeriodChange };
  return isMobile ? (
    <MobileDashboard {...props} />
  ) : (
    <DesktopDashboard {...props} />
  );
}
