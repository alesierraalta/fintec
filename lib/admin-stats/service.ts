import { createServiceClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import { mergeResourceCounts, buildActivity, buildNewByDay, type Family } from './aggregates';
import { parseStatsWindow, type AdminStats, type FamilyResult, type StatsWindow, type UnavailableResult } from './types';

type Row = Record<string, unknown>;
let serviceClient: ReturnType<typeof createServiceClient> | undefined;
function getClient() {
  serviceClient ??= createServiceClient();
  return serviceClient;
}
async function read(table: string, columns: string): Promise<Row[]> {
  const { data, error } = await (getClient() as any).from(table).select(columns);
  if (error) throw error;
  return (data ?? []) as Row[];
}
const unavailable = (): UnavailableResult => ({ status: 'unavailable', reason: 'query_failed' });
async function readOptional<T extends Row[] | Row[]>(table: string, columns: string, family: string): Promise<FamilyResult<T>> {
  try {
    return await read(table, columns) as T;
  } catch {
    logger.warn(`[AdminStatsService] ${family} family unavailable: query_failed`);
    return unavailable();
  }
}
function grouped(rows: Row[], field: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const userId = row[field];
    if (typeof userId === 'string') counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return [...counts].map(([user_id, count]) => ({ user_id, count }));
}

export async function getAdminStats(window: StatsWindow = '30d'): Promise<AdminStats> {
  const parsed = parseStatsWindow(window);
  const now = new Date();
  try {
    const users = await read('users', 'id,created_at,last_activity_at');
    const [accounts, transactions, budgets, goals, subscriptions, feedbacks, usage] = await Promise.all([
      readOptional<Row[]>('accounts', 'id,user_id', 'accounts'),
      readOptional<Row[]>('transactions', 'account_id', 'transactions'),
      readOptional<Row[]>('budgets', 'user_id', 'budgets'),
      readOptional<Row[]>('goals', 'user_id', 'goals'),
      readOptional<Row[]>('subscriptions', 'user_id', 'subscriptions'),
      readOptional<Row[]>('feedbacks', 'user_id', 'feedbacks'),
      readOptional<Row[]>('usage_tracking', 'month_year,transaction_count,backup_count,api_calls,export_count,ai_requests', 'usage_tracking'),
    ]);

    let transactionCounts: FamilyResult<{ user_id: string; count: number }[]> = unavailable();
    if (Array.isArray(accounts) && Array.isArray(transactions)) {
      const accountOwners = new Map(accounts.map((row) => [String(row.id), row.user_id as string | null]));
      const transactionRows = transactions.flatMap((row) => {
        const user_id = accountOwners.get(String(row.account_id));
        return user_id ? [{ user_id }] : [];
      });
      transactionCounts = grouped(transactionRows, 'user_id');
    } else if (!Array.isArray(accounts) && Array.isArray(transactions)) {
      logger.warn('[AdminStatsService] transactions family unavailable: query_failed');
    }

    const resources = mergeResourceCounts({
      accounts: Array.isArray(accounts) ? [...grouped(accounts, 'user_id'), { user_id: null, count: accounts.filter((row) => row.user_id == null).length }] : accounts,
      transactions: transactionCounts,
      budgets: budgets && Array.isArray(budgets) ? grouped(budgets, 'user_id') : budgets,
      goals: goals && Array.isArray(goals) ? grouped(goals, 'user_id') : goals,
      subscriptions: subscriptions && Array.isArray(subscriptions) ? grouped(subscriptions, 'user_id') : subscriptions,
      feedbacks: feedbacks && Array.isArray(feedbacks) ? grouped(feedbacks, 'user_id') : feedbacks,
    });
    const activity = buildActivity(users as any, now, parsed.window, parsed.days);
    const byMonth = Array.isArray(usage) ? usage.map((row) => ({
      monthYear: String(row.month_year), transactionCount: Number(row.transaction_count ?? 0), backupCount: Number(row.backup_count ?? 0),
      apiCalls: Number(row.api_calls ?? 0), exportCount: Number(row.export_count ?? 0), aiRequests: Number(row.ai_requests ?? 0),
    })) : usage;
    return {
      window: parsed.window,
      users: { total: users.length, newByDay: buildNewByDay(users as any, now, parsed.days), ...activity },
      resources,
      usage: { byMonth },
    };
  } catch (error) {
    logger.error('[AdminStatsService] aggregate read failed', error);
    throw error;
  }
}
