import type { Dayjs } from 'dayjs';
import type { DashboardPeriod } from '@/lib/dates/dashboard-periods';

export interface DashboardPeriodControllerProps {
  period: DashboardPeriod;
  referenceNow: Dayjs;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export interface DashboardPeriodFilterProps {
  period?: DashboardPeriod;
  referenceNow?: Dayjs;
}
