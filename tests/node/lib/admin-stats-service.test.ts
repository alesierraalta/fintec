import { getAdminStats } from '@/lib/admin-stats/service';
import { isTestUserEmail, getTestUserPatterns } from '@/lib/admin/test-users';
import { createServiceClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));

type Row = Record<string, unknown>;
let rejectedTable: string | null = null;
const rows: Record<string, Row[]> = {
  users: [
    {
      id: 'u1',
      email: 'test@fintec.com',
      created_at: '2025-01-02T10:00:00.000Z',
      last_activity_at: '2025-01-31T12:00:00.000Z',
    },
    {
      id: 'u2',
      email: 'real@fintec.com',
      created_at: '2025-01-03T10:00:00.000Z',
      last_activity_at: '2025-01-31T12:00:00.000Z',
    },
    {
      id: 'u3',
      created_at: '2024-12-01T10:00:00.000Z',
      last_activity_at: null,
    },
  ],
  accounts: [
    { id: 'a1', user_id: 'u1' },
    { id: 'a2', user_id: null },
  ],
  transactions: [{ account_id: 'a1' }, { account_id: 'a2' }],
  budgets: [{ user_id: 'u1' }],
  goals: [{ user_id: 'u2' }],
  subscriptions: [{ user_id: 'u1' }],
  feedbacks: [{ user_id: 'u2' }],
  usage_tracking: [
    {
      month_year: '2025-01',
      transaction_count: 2,
      backup_count: 3,
      api_calls: 4,
      export_count: 5,
      ai_requests: 6,
    },
  ],
};

function clientFixture() {
  return {
    from: jest.fn((table: string) => {
      const query: any = {
        select: jest.fn(() => query),
        gte: jest.fn(() => query),
        lte: jest.fn(() => query),
        lt: jest.fn(() => query),
        not: jest.fn(() => query),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: rejectedTable === table ? null : (rows[table] ?? []),
            error:
              rejectedTable === table
                ? { code: 'PGRST205', message: `Missing table ${table}` }
                : null,
          }).then(resolve),
      };
      return query;
    }),
  };
}

describe('test-user matcher', () => {
  const original = process.env.TEST_USER_EMAIL_PATTERNS;

  afterEach(() => {
    if (original === undefined) delete process.env.TEST_USER_EMAIL_PATTERNS;
    else process.env.TEST_USER_EMAIL_PATTERNS = original;
    jest.restoreAllMocks();
  });

  it('matches reviewed defaults case-insensitively and as whole emails', () => {
    delete process.env.TEST_USER_EMAIL_PATTERNS;
    expect(isTestUserEmail('TEST@FINTEC.COM')).toBe(true);
    expect(isTestUserEmail('eval-fixture-run-1@fintec.local')).toBe(true);
    expect(isTestUserEmail('eval-fixture-run-1@fintec.local.evil')).toBe(false);
    expect(isTestUserEmail(null)).toBe(false);
    expect(isTestUserEmail('')).toBe(false);
  });

  it('uses valid overrides as replacements and treats wildcard syntax literally', () => {
    process.env.TEST_USER_EMAIL_PATTERNS =
      'qa+*@fintec.local,fixture-%@fintec.local';
    expect(getTestUserPatterns()).toEqual([
      'qa+*@fintec.local',
      'fixture-%@fintec.local',
    ]);
    expect(isTestUserEmail('qa+run@fintec.local')).toBe(true);
    expect(isTestUserEmail('test@fintec.com')).toBe(false);
    process.env.TEST_USER_EMAIL_PATTERNS = 'a[bc]@fintec.local';
    expect(isTestUserEmail('a[bc]@fintec.local')).toBe(true);
    expect(isTestUserEmail('abc@fintec.local')).toBe(false);
  });

  it('falls back safely for malformed overrides without logging the value', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    process.env.TEST_USER_EMAIL_PATTERNS = 'qa*@fintec.local,,bad\\\\pattern';
    expect(getTestUserPatterns()).toEqual([
      'test@fintec.com',
      'eval-fixture-*@fintec.local',
    ]);
    expect(isTestUserEmail('test@fintec.com')).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).not.toContain('qa');
  });
});

describe('admin stats service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-31T23:00:00.000Z'));
    rejectedTable = null;
    (createServiceClient as jest.Mock).mockReturnValue(clientFixture());
  });
  afterEach(() => jest.useRealTimers());

  it('returns aggregate-only metrics with UTC activity and nullable transaction ownership excluded', async () => {
    const result = await getAdminStats('30d');
    expect(result.window).toBe('30d');
    expect(result.users.total).toBe(2);
    expect(result.resources.perUserCounts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 'u1' })])
    );
    expect(
      result.users.newByDay.find((bucket) => bucket.date === '2025-01-03')
        ?.count
    ).toBe(1);
    expect(result.users.dau).toBe(1);
    expect(result.users.peakDailyActive).toBe(1);
    expect(result.users.peakDate).toBe('2025-01-31');
    expect(result.users.activityBasis).toBe('last_activity_at_session_refresh');
    expect(result.resources.totals).toEqual({
      accounts: 1,
      transactions: 0,
      budgets: 0,
      goals: 1,
      subscriptions: 0,
      feedbacks: 1,
    });
    expect(result.resources.perUserCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u2', goals: 1, feedbacks: 1 }),
      ])
    );
    expect(result.usage.byMonth[0]).toEqual({
      monthYear: '2025-01',
      transactionCount: 2,
      backupCount: 3,
      apiCalls: 4,
      exportCount: 5,
      aiRequests: 6,
    });
    expect(JSON.stringify(result)).not.toMatch(/email|name|description/);
  });

  it('degrades an unavailable feedbacks family without fabricating a zero', async () => {
    rejectedTable = 'feedbacks';
    const result = await getAdminStats('30d');
    expect(result.resources.totals.feedbacks).toEqual({
      status: 'unavailable',
      reason: 'query_failed',
    });
    expect(result.resources.totals.accounts).toBe(1);
    expect(result.resources.totals.budgets).toBe(0);
    expect(result.resources.totals.feedbacks).not.toBe(0);
    expect(result.resources.perUserCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u2', goals: 1 }),
      ])
    );
  });

  it('keeps core users metrics fail-closed', async () => {
    rejectedTable = 'users';
    await expect(getAdminStats('30d')).rejects.toMatchObject({
      code: 'PGRST205',
    });
  });

  it('includes activity from 60 days ago in the 90-day peak', async () => {
    const originalUsers = rows.users;
    rows.users = [
      {
        id: 'u60',
        created_at: '2024-12-01T00:00:00Z',
        last_activity_at: '2024-12-02T12:00:00Z',
      },
    ];
    try {
      const result = await getAdminStats('90d');
      expect(result.users.peakDailyActive).toBe(1);
      expect(result.users.peakDate).toBe('2024-12-02');
    } finally {
      rows.users = originalUsers;
    }
  });

  it('keeps unavailable families unavailable for users introduced later', async () => {
    const originalBudgets = rows.budgets;
    rejectedTable = 'accounts';
    rows.budgets = [{ user_id: 'new-user' }];
    try {
      const result = await getAdminStats('30d');
      expect(result.resources.perUserCounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'new-user',
            accounts: { status: 'unavailable', reason: 'query_failed' },
            budgets: 1,
          }),
        ])
      );
    } finally {
      rows.budgets = originalBudgets;
    }
  });

  it('returns empty activity rather than invented values', async () => {
    rows.users = [
      { id: 'u1', created_at: '2025-01-01T00:00:00Z', last_activity_at: null },
    ];
    const result = await getAdminStats('7d');
    expect(result.users).toMatchObject({
      dau: 0,
      wau: 0,
      mau: 0,
      peakDailyActive: 0,
      peakDate: null,
      activityStatus: 'empty',
    });
  });
});
