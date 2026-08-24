import { buildFeatureUsage } from '@/lib/admin-stats/feature-usage';

describe('feature usage reducers', () => {
  const now = new Date('2026-02-20T12:00:00.000Z');
  const input = {
    transactions: [
      { created_at: '2026-02-20T00:00:00Z' },
      { created_at: '2026-01-01T00:00:00Z' },
    ],
    budgets: [{ created_at: '2026-02-19T00:00:00Z' }],
    goals: [{ created_at: '2026-02-18T00:00:00Z' }],
    feedbacks: [
      { created_at: '2026-02-19T00:00:00Z' },
      { created_at: '2026-02-10T00:00:00Z' },
    ],
    aiSessions: [{ started_at: '2026-02-17T00:00:00Z' }],
    aiMessages: [{ created_at: '2026-02-16T00:00:00Z' }],
    usage: [
      {
        month_year: '2026-02',
        transaction_count: 4,
        backup_count: 2,
        api_calls: 3,
        export_count: 1,
        ai_requests: 5,
      },
    ],
  };

  it('counts all six timestamp-backed families within the UTC window', () => {
    const result = buildFeatureUsage(input, { now, window: '7d', days: 7 });
    expect(result.status).toBe('available');
    expect(result.items.map((item) => item.key)).toEqual([
      'transactions_created',
      'budgets_created',
      'goals_created',
      'feedbacks_submitted',
      'ai_sessions',
      'ai_messages',
    ]);
    expect(
      result.items.find((item) => item.key === 'transactions_created')
    ).toMatchObject({ count: 1, basis: 'selected_window' });
    expect(
      result.items.find((item) => item.key === 'feedbacks_submitted')
    ).toMatchObject({ count: 1, recentCount: 1 });
  });

  it('creates a complete UTC transaction day series and keeps monthly counters independent', () => {
    const result = buildFeatureUsage(input, { now, window: '7d', days: 7 });
    const transactions = result.items.find(
      (item) => item.key === 'transactions_created'
    );
    expect(transactions?.byDay).toHaveLength(7);
    expect(result.monthlyCounters.items).toEqual([
      expect.objectContaining({ monthYear: '2026-02', transactionCount: 4 }),
    ]);
    expect(result.monthlyCounters.items[0]).toMatchObject({
      source: 'usage_tracking',
      basis: 'month_based',
    });
  });

  it('distinguishes unavailable sources and unusable timestamps from empty sources', () => {
    const result = buildFeatureUsage(
      { ...input, aiSessions: null, goals: [{ created_at: null }] },
      { now, window: '30d', days: 30 }
    );
    expect(
      result.items.find((item) => item.key === 'ai_sessions')
    ).toMatchObject({ status: 'unavailable', reason: 'source_unavailable' });
    expect(
      result.items.find((item) => item.key === 'goals_created')
    ).toMatchObject({ status: 'partial' });
    expect(
      result.items.find((item) => item.key === 'budgets_created')
    ).toMatchObject({ status: 'available', count: 1 });
  });
});
