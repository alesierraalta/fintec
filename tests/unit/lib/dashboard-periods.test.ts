import dayjs from '@/lib/dates/dayjs';
import {
  DASHBOARD_PERIOD_OPTIONS,
  filterByDashboardPeriod,
  getDashboardPeriodLabel,
  matchesDashboardPeriod,
  resolveDashboardPeriod,
} from '@/lib/dates/dashboard-periods';

describe('dashboard periods', () => {
  const now = dayjs('2026-01-12T15:30:00');
  const record = (date?: string) => ({ date });

  it('exposes the five synchronized options and labels', () => {
    expect(DASHBOARD_PERIOD_OPTIONS).toEqual([
      { id: 'today', label: 'Hoy' },
      { id: 'this_week', label: 'Esta semana' },
      { id: 'this_month', label: 'Este mes' },
      { id: 'last_month', label: 'Mes anterior' },
      { id: 'all', label: 'Histórico' },
    ]);
    expect(DASHBOARD_PERIOD_OPTIONS.map(({ id }) => id)).not.toContain('last_30_days');
  });

  it.each([
    ['today', '2026-01-12', true],
    ['today', '2026-01-11T23:59:59', false],
    ['this_week', '2026-01-12', true],
    ['this_week', '2026-01-04T23:59:59', false],
    ['this_month', '2026-01-01', true],
    ['last_month', '2025-12-31T23:59:59.999', true],
    ['last_month', '2026-01-01', false],
  ] as const)('matches %s boundaries', (period, date, expected) => {
    expect(matchesDashboardPeriod(record(date), period, now)).toBe(expected);
  });

  it('excludes future and malformed dates from bounded periods but keeps them in all', () => {
    expect(matchesDashboardPeriod(record('2026-01-12T15:30:01'), 'today', now)).toBe(false);
    expect(matchesDashboardPeriod(record('not-a-date'), 'today', now)).toBe(false);
    expect(matchesDashboardPeriod(record(), 'this_month', now)).toBe(false);
    expect(matchesDashboardPeriod(record('not-a-date'), 'all', now)).toBe(true);
    expect(filterByDashboardPeriod([record(), record('2026-01-12')], 'all', now)).toHaveLength(2);
  });

  it('computes Monday explicitly and resolves prior-year month', () => {
    expect(resolveDashboardPeriod('this_week', dayjs('2026-01-11T12:00:00')).start?.format('YYYY-MM-DD')).toBe('2026-01-05');
    expect(resolveDashboardPeriod('last_month', dayjs('2026-01-05T12:00:00')).start?.format('YYYY-MM-DD')).toBe('2025-12-01');
    expect(getDashboardPeriodLabel('all')).toBe('Histórico');
  });
});
