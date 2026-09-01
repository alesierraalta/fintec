import { createServiceClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import { isTestUserEmail } from '@/lib/admin/test-users';
import { getAdminUserIds } from '@/lib/payment-orders/admin-utils';
import {
  mergeResourceCounts,
  buildActivity,
  buildNewByDay,
} from './aggregates';
import { buildFeatureUsage } from './feature-usage';
import {
  parseStatsWindow,
  type AdminStats,
  type FamilyResult,
  type StatsWindow,
  type UnavailableResult,
} from './types';

type Row = Record<string, unknown>;
let serviceClient: ReturnType<typeof createServiceClient> | undefined;
function getClient() {
  serviceClient ??= createServiceClient();
  return serviceClient;
}
async function read(table: string, columns: string): Promise<Row[]> {
  const { data, error } = await (getClient() as any)
    .from(table)
    .select(columns);
  if (error) throw error;
  return (data ?? []) as Row[];
}
const unavailable = (): UnavailableResult => ({
  status: 'unavailable',
  reason: 'query_failed',
});
async function readOptional<T extends Row[]>(
  table: string,
  columns: string,
  family: string
): Promise<FamilyResult<T>> {
  try {
    return (await read(table, columns)) as T;
  } catch {
    logger.warn(
      `[AdminStatsService] ${family} family unavailable: query_failed`
    );
    return unavailable();
  }
}
function grouped(rows: Row[], field: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const userId = row[field];
    if (typeof userId === 'string')
      counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return [...counts].map(([user_id, count]) => ({ user_id, count }));
}
function includedRows(
  value: FamilyResult<Row[]>,
  excluded: Set<string>
): Row[] | UnavailableResult {
  return Array.isArray(value)
    ? value.filter(
        (row) => typeof row.user_id !== 'string' || !excluded.has(row.user_id)
      )
    : value;
}
function asFeatureRows(
  value: FamilyResult<Row[]>,
  excluded: Set<string>
): Row[] | null {
  return Array.isArray(value)
    ? value.filter(
        (row) => typeof row.user_id !== 'string' || !excluded.has(row.user_id)
      )
    : null;
}

export async function getAdminStats(
  window: StatsWindow = '30d'
): Promise<AdminStats> {
  const parsed = parseStatsWindow(window);
  const now = new Date();
  try {
    const users = await read(
      'users',
      'id,name,email,created_at,last_activity_at'
    );
    const testExcludedIds = new Set(
      users
        .filter((row) =>
          isTestUserEmail(typeof row.email === 'string' ? row.email : null)
        )
        .map((row) => String(row.id))
    );
    const adminIds = new Set(getAdminUserIds());
    const excluded = new Set([...testExcludedIds, ...adminIds]);
    const includedUsers = users.filter((row) => !excluded.has(String(row.id)));
    const includedIds = new Set(includedUsers.map((row) => String(row.id)));
    const rosterList = users
      .filter((row) => !testExcludedIds.has(String(row.id)))
      .map((row) => ({
        id: String(row.id),
        name: typeof row.name === 'string' ? row.name : null,
        email: typeof row.email === 'string' ? row.email : null,
        createdAt: typeof row.created_at === 'string' ? row.created_at : null,
        lastActivityAt:
          typeof row.last_activity_at === 'string'
            ? row.last_activity_at
            : null,
        isAdmin: adminIds.has(String(row.id)),
      }))
      .sort((a, b) => {
        if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
        if (a.createdAt === null) return 1;
        if (b.createdAt === null) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    const [
      accountsRaw,
      transactionsRaw,
      budgetsRaw,
      goalsRaw,
      subscriptionsRaw,
      feedbacksRaw,
      usageRaw,
      aiSessionsRaw,
      aiMessagesRaw,
    ] = await Promise.all([
      readOptional<Row[]>('accounts', 'id,user_id', 'accounts'),
      readOptional<Row[]>(
        'transactions',
        'account_id,created_at',
        'transactions'
      ),
      readOptional<Row[]>('budgets', 'user_id,created_at', 'budgets'),
      readOptional<Row[]>('goals', 'user_id,created_at', 'goals'),
      readOptional<Row[]>('subscriptions', 'user_id', 'subscriptions'),
      readOptional<Row[]>('feedbacks', 'user_id,created_at', 'feedbacks'),
      readOptional<Row[]>(
        'usage_tracking',
        'user_id,month_year,transaction_count,backup_count,api_calls,export_count,ai_requests',
        'usage_tracking'
      ),
      readOptional<Row[]>(
        'ai_conversation_sessions',
        'user_id,started_at,message_count',
        'ai_sessions'
      ),
      readOptional<Row[]>(
        'ai_conversation_messages',
        'user_id,created_at',
        'ai_messages'
      ),
    ]);

    let transactionRows: Row[] | UnavailableResult = unavailable();
    let transactionFeatureRows: Row[] | null = null;
    if (Array.isArray(accountsRaw) && Array.isArray(transactionsRaw)) {
      const owners = new Map(
        accountsRaw.map((row) => [String(row.id), row.user_id as string | null])
      );
      transactionFeatureRows = transactionsRaw.flatMap((row) => {
        const userId = owners.get(String(row.account_id));
        return userId && includedIds.has(userId)
          ? [{ ...row, user_id: userId }]
          : [];
      });
      transactionRows = grouped(transactionFeatureRows, 'user_id');
    }

    const accounts = Array.isArray(accountsRaw)
      ? [
          ...grouped(
            accountsRaw.filter(
              (row) => row.user_id == null || !excluded.has(String(row.user_id))
            ),
            'user_id'
          ),
          {
            user_id: null,
            count: accountsRaw.filter((row) => row.user_id == null).length,
          },
        ]
      : accountsRaw;
    const resources = mergeResourceCounts({
      accounts,
      transactions: transactionRows,
      budgets: Array.isArray(budgetsRaw)
        ? grouped(includedRows(budgetsRaw, excluded) as Row[], 'user_id')
        : budgetsRaw,
      goals: Array.isArray(goalsRaw)
        ? grouped(includedRows(goalsRaw, excluded) as Row[], 'user_id')
        : goalsRaw,
      subscriptions: Array.isArray(subscriptionsRaw)
        ? grouped(includedRows(subscriptionsRaw, excluded) as Row[], 'user_id')
        : subscriptionsRaw,
      feedbacks: Array.isArray(feedbacksRaw)
        ? grouped(includedRows(feedbacksRaw, excluded) as Row[], 'user_id')
        : feedbacksRaw,
    });
    const usage = Array.isArray(usageRaw)
      ? usageRaw
          .filter(
            (row) =>
              typeof row.user_id !== 'string' ||
              !excluded.has(String(row.user_id))
          )
          .map((row) => ({
            monthYear: String(row.month_year),
            transactionCount: Number(row.transaction_count ?? 0),
            backupCount: Number(row.backup_count ?? 0),
            apiCalls: Number(row.api_calls ?? 0),
            exportCount: Number(row.export_count ?? 0),
            aiRequests: Number(row.ai_requests ?? 0),
          }))
      : usageRaw;
    const featureUsage = buildFeatureUsage(
      {
        transactions: transactionFeatureRows,
        budgets: asFeatureRows(budgetsRaw, excluded),
        goals: asFeatureRows(goalsRaw, excluded),
        feedbacks: asFeatureRows(feedbacksRaw, excluded),
        aiSessions: asFeatureRows(aiSessionsRaw, excluded),
        aiMessages: asFeatureRows(aiMessagesRaw, excluded),
        usage: Array.isArray(usageRaw)
          ? usageRaw.filter(
              (row) =>
                typeof row.user_id !== 'string' ||
                !excluded.has(String(row.user_id))
            )
          : null,
      },
      { now, window: parsed.window, days: parsed.days }
    );
    return {
      window: parsed.window,
      users: {
        total: includedUsers.length,
        newByDay: buildNewByDay(includedUsers as any, now, parsed.days),
        ...buildActivity(includedUsers as any, now, parsed.window, parsed.days),
        list: rosterList,
      },
      resources,
      usage: { byMonth: usage },
      featureUsage: featureUsage as unknown as AdminStats['featureUsage'],
    };
  } catch (error) {
    logger.error('[AdminStatsService] aggregate read failed', error);
    throw error;
  }
}

export async function getAdminStatsDebug(window: StatsWindow = '30d') {
  const users = await read('users', 'id,email,created_at');
  const testIds = new Set(
    users
      .filter((row) =>
        isTestUserEmail(typeof row.email === 'string' ? row.email : null)
      )
      .map((row) => String(row.id))
  );
  const adminIds = new Set(getAdminUserIds());
  const excluded = new Set([...testIds, ...adminIds]);
  const filtered = users.filter((row) => !excluded.has(String(row.id)));
  return {
    totalRaw: users.length,
    totalTest: testIds.size,
    totalAdmin: adminIds.size,
    totalFiltered: filtered.length,
    adminIds: [...adminIds],
    testSample: users
      .filter((r) => testIds.has(String(r.id)))
      .slice(0, 5)
      .map((r) => ({ id: String(r.id), email: r.email as string | null })),
    rawSample: users.slice(0, 10).map((r) => ({
      id: String(r.id),
      email: r.email as string | null,
      created_at: r.created_at as string | null,
      isTest: testIds.has(String(r.id)),
      isAdmin: adminIds.has(String(r.id)),
    })),
  };
}
