import { createServiceClient } from '@/lib/supabase/admin';
import { ValidationError } from '@/lib/errors/validation-error';
import type { PageVisitsDTO, VisitsRange } from './types';

const DAYS: Record<VisitsRange, number> = { '7d': 7, '30d': 30, '90d': 90 };
export function parseVisitsRange(value: string | null | undefined): {
  range: VisitsRange;
  days: number;
} {
  const range = (value || '30d') as VisitsRange;
  if (!(range in DAYS))
    throw new ValidationError('Unsupported visits range', { range: value });
  return { range, days: DAYS[range] };
}
function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
export function materializeVisits(
  range: VisitsRange,
  startDate: string,
  endDate: string,
  dailyRows: Array<{
    date: string;
    page_views?: number;
    unique_visitors?: number;
  }>,
  routes: Array<{ path: string; page_views?: number }>
): PageVisitsDTO {
  const daily = Array.from({ length: DAYS[range] }, (_, index) => {
    const date = dateOnly(addDays(new Date(`${startDate}T00:00:00Z`), index));
    const row = dailyRows.find((item) => item.date === date);
    return {
      date,
      pageViews: Number(row?.page_views ?? 0),
      uniqueVisitors: Number(row?.unique_visitors ?? 0),
    };
  });
  const peak = (key: 'pageViews' | 'uniqueVisitors') =>
    daily.reduce<{ date: string; value: number } | null>(
      (best, row) =>
        row[key] > (best?.value ?? 0)
          ? { date: row.date, value: row[key] }
          : best,
      null
    );
  return {
    range,
    startDate,
    endDate,
    totalPageViews: daily.reduce((sum, row) => sum + row.pageViews, 0),
    totalUniqueVisitors: daily.reduce(
      (sum, row) => sum + row.uniqueVisitors,
      0
    ),
    daily,
    topRoutes: routes.slice(0, 20).map((row) => ({
      path: row.path,
      pageViews: Number(row.page_views ?? 0),
    })),
    peaks: {
      pageViews: peak('pageViews'),
      uniqueVisitors: peak('uniqueVisitors'),
    },
  };
}

export async function getPageVisits(
  range: VisitsRange
): Promise<PageVisitsDTO> {
  const { days } = parseVisitsRange(range);
  const today = new Date();
  const start = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - days + 1
    )
  );
  const end = addDays(start, days);
  const client = createServiceClient();
  const { data, error } = await (client as any).rpc('aggregate_page_visits', {
    start_date: dateOnly(start),
    end_date: dateOnly(end),
  });
  if (error) throw error;
  const result = data ?? { daily: [], routes: [] };
  return materializeVisits(
    range,
    dateOnly(start),
    dateOnly(end),
    result.daily ?? [],
    result.routes ?? []
  );
}
