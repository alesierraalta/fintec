import { render, screen, waitFor } from '@testing-library/react';
import { AdminStatsDashboard } from '@/components/admin/admin-stats-dashboard';

jest.mock('@/components/admin/admin-stats-charts', () => ({
  AdminStatsCharts: () => <div>charts</div>,
}));
jest.mock('@/components/admin/admin-feature-usage', () => ({
  AdminFeatureUsage: () => <div>feature usage</div>,
}));

const stats = {
  window: '30d' as const,
  users: {
    total: 1,
    newByDay: [],
    dau: 0,
    wau: 0,
    mau: 0,
    peakDailyActive: 0,
    peakDate: null,
    activityBasis: 'last_activity_at_session_refresh' as const,
    activityStatus: 'empty' as const,
    list: [
      {
        id: 'u1',
        name: 'Roster User',
        email: 'roster@example.com',
        createdAt: null,
        lastActivityAt: null,
        isAdmin: false,
      },
    ],
  },
  resources: {
    totals: {
      accounts: 0,
      transactions: 0,
      budgets: 0,
      goals: 0,
      subscriptions: 0,
      feedbacks: 0,
    },
    perUserCounts: [],
  },
  usage: { byMonth: [] },
  featureUsage: {
    status: 'empty' as const,
    window: '30d' as const,
    items: [],
    monthlyCounters: {
      status: 'empty' as const,
      source: 'usage_tracking' as const,
      basis: 'month_based' as const,
      items: [],
    },
  },
};

describe('AdminStatsDashboard roster wiring', () => {
  it('uses DashboardLoading while pending and renders the roster after loading', async () => {
    let resolve: (value: Response) => void = () => undefined;
    jest.spyOn(global, 'fetch').mockReturnValue(
      new Promise((res) => {
        resolve = res;
      })
    );

    render(<AdminStatsDashboard />);
    expect(screen.getByText('Cargando dashboard...')).toBeInTheDocument();

    resolve({
      ok: true,
      json: async () => ({ data: stats }),
    } as Response);
    await waitFor(() =>
      expect(screen.getByText('Roster User')).toBeInTheDocument()
    );
    expect(screen.getByText('feature usage')).toBeInTheDocument();
  });
});
