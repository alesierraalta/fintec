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
      name: null,
      created_at: '2025-01-03T10:00:00.000Z',
      last_activity_at: '2025-01-31T12:00:00.000Z',
    },
    {
      id: 'u3',
      email: null,
      name: 'Nullable activity',
      created_at: '2025-01-03T10:00:00.000Z',
      last_activity_at: null,
    },
    {
      id: 'u4',
      email: 'admin@fintec.com',
      name: 'Configured admin',
      created_at: '2025-01-04T10:00:00.000Z',
      last_activity_at: '2025-01-31T12:00:00.000Z',
    },
  ],
  accounts: [
    { id: 'a1', user_id: 'u1' },
    { id: 'a2', user_id: null },
    { id: 'a4', user_id: 'u4' },
  ],
  transactions: [
    { account_id: 'a1' },
    { account_id: 'a2' },
    { account_id: 'a4', created_at: '2025-01-31T12:00:00.000Z' },
  ],
  budgets: [{ user_id: 'u1' }, { user_id: 'u4' }],
  goals: [{ user_id: 'u2' }, { user_id: 'u4' }],
  subscriptions: [{ user_id: 'u1' }, { user_id: 'u4' }],
  feedbacks: [{ user_id: 'u2' }, { user_id: 'u4' }],
  usage_tracking: [
    {
      user_id: 'u2',
      month_year: '2025-01',
      transaction_count: 2,
      backup_count: 3,
      api_calls: 4,
      export_count: 5,
      ai_requests: 6,
    },
    {
      user_id: 'u4',
      month_year: '2025-01',
      transaction_count: 20,
      backup_count: 30,
      api_calls: 40,
      export_count: 50,
      ai_requests: 60,
    },
  ],
  ai_conversation_sessions: [
    { user_id: 'u4', started_at: '2025-01-31T12:00:00.000Z', message_count: 4 },
  ],
  ai_conversation_messages: [
    { user_id: 'u4', created_at: '2025-01-31T12:00:00.000Z' },
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
    expect(isTestUserEmail('perf-test-36@fintec.test')).toBe(true);
    expect(isTestUserEmail('perf-test-99@other-host.dev')).toBe(true);
    expect(isTestUserEmail('someone@fintec.test')).toBe(true);
    expect(isTestUserEmail('someone@sub.fintec.test')).toBe(true);
    expect(isTestUserEmail('fintec-smoke+migration-prepush-...@example.com')).toBe(true);
    expect(isTestUserEmail('jest-test-1784126350767@example.com')).toBe(true);
    expect(isTestUserEmail('debug-1784126319459@example.com')).toBe(true);
    expect(isTestUserEmail('fixture-1784123633774@real-run-test.fintec')).toBe(true);
    expect(isTestUserEmail('uhook-1784149137577-349525@x.com')).toBe(true);
    expect(isTestUserEmail('demo.screenshots@fintec.app')).toBe(true);
    expect(isTestUserEmail('eval-fixture-run-1@fintec.local.evil')).toBe(false);
    expect(isTestUserEmail('clean.user@gmail.com')).toBe(false);
    expect(isTestUserEmail('debugging-fan@hotmail.com')).toBe(false);
    expect(isTestUserEmail('mysmoke@a.com')).toBe(false);
    expect(isTestUserEmail('demo.other@fintec.app')).toBe(false);
    expect(isTestUserEmail('real.user@example.net')).toBe(false);
    expect(isTestUserEmail('user@fintec.tester')).toBe(false);
    expect(isTestUserEmail('user@fintec.commercial')).toBe(false);
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
      'perf-test-*@*',
      '*@*.test',
      '*@example.com',
      'jest-test-*@*',
      'debug-*@*',
      'fixture-*@*',
      'uhook-*@*',
      'fintec-smoke+*@*',
      'demo.screenshots@fintec.app',
    ]);
    expect(isTestUserEmail('test@fintec.com')).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).not.toContain('qa');
  });
});

describe('admin stats service', () => {
  const originalAdminIds = process.env.ADMIN_USER_IDS;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-31T23:00:00.000Z'));
    rejectedTable = null;
    delete process.env.ADMIN_USER_IDS;
    (createServiceClient as jest.Mock).mockReturnValue(clientFixture());
  });
  afterEach(() => {
    if (originalAdminIds === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = originalAdminIds;
    jest.useRealTimers();
  });

  it('returns aggregate-only metrics with UTC activity and nullable transaction ownership excluded', async () => {
    const result = await getAdminStats('30d');
    expect(result.window).toBe('30d');
    expect(result.users.total).toBe(3);
    expect(result.users.list.map((user) => user.id)).toEqual([
      'u4',
      'u2',
      'u3',
    ]);
    expect(result.users.list[1]).toMatchObject({ name: null, isAdmin: false });
    expect(result.users.list[2]).toMatchObject({
      email: null,
      lastActivityAt: null,
    });
    expect(Object.keys(result.users.list[0])).toEqual([
      'id',
      'name',
      'email',
      'createdAt',
      'lastActivityAt',
      'isAdmin',
    ]);
    expect(result.resources.perUserCounts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 'u1' })])
    );
    expect(
      result.users.newByDay.find((bucket) => bucket.date === '2025-01-03')
        ?.count
    ).toBe(2);
    expect(result.users.dau).toBe(2);
    expect(result.users.peakDailyActive).toBe(2);
    expect(result.users.peakDate).toBe('2025-01-31');
    expect(result.users.activityBasis).toBe('last_activity_at_session_refresh');
    expect(result.resources.totals).toEqual({
      accounts: 2,
      transactions: 1,
      budgets: 1,
      goals: 2,
      subscriptions: 1,
      feedbacks: 2,
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
  });

  it('excludes configured admins from every metric while retaining them in the roster', async () => {
    process.env.ADMIN_USER_IDS = ' u4 ';
    const result = await getAdminStats('30d');

    expect(result.users.total).toBe(2);
    expect(
      result.users.newByDay.find((bucket) => bucket.date === '2025-01-04')
        ?.count
    ).toBe(0);
    expect(result.users.dau).toBe(1);
    expect(result.users.wau).toBe(1);
    expect(result.users.mau).toBe(1);
    expect(result.users.peakDailyActive).toBe(1);
    expect(result.resources.totals).toEqual({
      accounts: 1,
      transactions: 0,
      budgets: 0,
      goals: 1,
      subscriptions: 0,
      feedbacks: 1,
    });
    expect(result.resources.perUserCounts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 'u4' })])
    );
    expect(result.usage.byMonth).toEqual([
      expect.objectContaining({
        transactionCount: 2,
        backupCount: 3,
        apiCalls: 4,
        exportCount: 5,
        aiRequests: 6,
      }),
    ]);
    expect(result.users.list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'u4',
          isAdmin: true,
          name: 'Configured admin',
        }),
      ])
    );
  });

  it('treats empty administrator configuration as a no-op', async () => {
    process.env.ADMIN_USER_IDS = '';
    const result = await getAdminStats('30d');
    expect(result.users.total).toBe(3);
    expect(result.users.list.map((user) => user.id)).toContain('u4');
  });

  it('degrades an unavailable feedbacks family without fabricating a zero', async () => {
    rejectedTable = 'feedbacks';
    const result = await getAdminStats('30d');
    expect(result.resources.totals.feedbacks).toEqual({
      status: 'unavailable',
      reason: 'query_failed',
    });
    expect(result.resources.totals.accounts).toBe(2);
    expect(result.resources.totals.budgets).toBe(1);
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
