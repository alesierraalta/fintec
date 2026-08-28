import dayjs from '@/lib/dates/dayjs';
import type { Dayjs } from 'dayjs';

export type DashboardPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'all';

export const DASHBOARD_PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoy' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'all', label: 'Histórico' },
] as const satisfies ReadonlyArray<{ id: DashboardPeriod; label: string }>;

export interface DashboardPeriodRange {
  start?: Dayjs;
  end?: Dayjs;
}

export function resolveDashboardPeriod(
  period: DashboardPeriod,
  referenceNow: Dayjs
): DashboardPeriodRange {
  if (period === 'all') return {};
  const today = referenceNow.startOf('day');
  switch (period) {
    case 'today':
      return { start: today, end: referenceNow };
    case 'this_week': {
      const daysSinceMonday = (referenceNow.day() + 6) % 7;
      return {
        start: today.subtract(daysSinceMonday, 'day'),
        end: referenceNow,
      };
    }
    case 'this_month':
      return { start: referenceNow.startOf('month'), end: referenceNow };
    case 'last_month': {
      const previousMonth = referenceNow.subtract(1, 'month');
      return {
        start: previousMonth.startOf('month'),
        end: previousMonth.endOf('month'),
      };
    }
  }
}

function parseDashboardDate(value: string): Dayjs {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? dayjs(value, 'YYYY-MM-DD', true)
    : dayjs(value);
}

export function matchesDashboardPeriod<T extends { date?: string | null }>(
  record: T,
  period: DashboardPeriod,
  referenceNow: Dayjs
): boolean {
  if (period === 'all') return true;
  if (!record.date) return false;
  const date = parseDashboardDate(record.date);
  const { start, end } = resolveDashboardPeriod(period, referenceNow);
  return Boolean(
    date.isValid() &&
      start &&
      end &&
      !date.isBefore(start) &&
      !date.isAfter(end)
  );
}

export function filterByDashboardPeriod<T extends { date?: string | null }>(
  records: T[],
  period: DashboardPeriod,
  referenceNow: Dayjs
): T[] {
  if (period === 'all') return records;
  const range = resolveDashboardPeriod(period, referenceNow);
  return records.filter((record) => {
    if (!record.date) return false;
    const date = parseDashboardDate(record.date);
    return Boolean(
      date.isValid() &&
        range.start &&
        range.end &&
        !date.isBefore(range.start) &&
        !date.isAfter(range.end)
    );
  });
}

export function getDashboardPeriodLabel(period: DashboardPeriod): string {
  return (
    DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ??
    'Este mes'
  );
}
