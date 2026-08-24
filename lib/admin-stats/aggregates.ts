import type { AdminStats, FamilyResult, StatsWindow } from './types';

type UserRow = { id: string; created_at?: string | null; last_activity_at?: string | null };
type CountRow = { user_id?: string | null; count?: number };
const families = ['accounts', 'transactions', 'budgets', 'goals', 'subscriptions', 'feedbacks'] as const;
export type Family = (typeof families)[number];
type Unavailable = { status: 'unavailable'; reason: 'query_failed' };
type FamilyRows = FamilyResult<CountRow[]>;

const day = (date: Date) => date.toISOString().slice(0, 10);

export function buildNewByDay(users: UserRow[], now: Date, days: number) {
  const start = new Date(now.getTime() - days * 86400000);
  const counts = new Map<string, number>();
  for (const user of users) {
    if (!user.created_at) continue;
    const created = new Date(user.created_at);
    if (created >= start && created <= now) counts.set(day(created), (counts.get(day(created)) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + (index + 1) * 86400000);
    const key = day(date);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

export function buildActivity(users: UserRow[], now: Date, window: StatsWindow, days: number) {
  const start = new Date(now.getTime() - days * 86400000);
  const daily = new Map<string, Set<string>>();
  const active = users.filter((user) => {
    if (!user.last_activity_at) return false;
    const activity = new Date(user.last_activity_at);
    if (activity > now || activity < new Date(now.getTime() - 30 * 86400000)) return false;
    return true;
  });
  for (const user of active) {
    const activity = new Date(user.last_activity_at!);
    if (activity < start) continue;
    const key = day(activity);
    if (!daily.has(key)) daily.set(key, new Set());
    daily.get(key)!.add(user.id);
  }
  const distinct = (duration: number) => new Set(users.filter((user) => {
    if (!user.last_activity_at) return false;
    const date = new Date(user.last_activity_at);
    return date <= now && date >= new Date(now.getTime() - duration);
  }).map((user) => user.id)).size;
  let peakDailyActive = 0;
  let peakDate: string | null = null;
  for (const [date, ids] of [...daily.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (ids.size > peakDailyActive) { peakDailyActive = ids.size; peakDate = date; }
  }
  return { dau: distinct(24 * 3600000), wau: distinct(7 * 86400000), mau: distinct(30 * 86400000), peakDailyActive, peakDate, activityStatus: daily.size ? 'available' as const : 'empty' as const, activityBasis: 'last_activity_at_session_refresh' as const, window };
}

export function mergeResourceCounts(rows: Record<Family, FamilyRows>) {
  const unavailable = (family: Family): Unavailable => ({ status: 'unavailable', reason: 'query_failed' });
  const totals = Object.fromEntries(families.map((family) => {
    const value = rows[family];
    return [family, Array.isArray(value) ? value.reduce((sum, row) => sum + Number(row.count ?? 0), 0) : unavailable(family)];
  })) as AdminStats['resources']['totals'];
  const byUser = new Map<string, Record<string, string | number | Unavailable>>();
  for (const family of families) {
    const value = rows[family];
    if (!Array.isArray(value)) {
      for (const entry of byUser.values()) entry[family] = unavailable(family);
      continue;
    }
    for (const row of value) {
      if (!row.user_id) continue;
      const entry = byUser.get(row.user_id) ?? { userId: row.user_id, accounts: 0, transactions: 0, budgets: 0, goals: 0, subscriptions: 0, feedbacks: 0 };
      entry[family] = Number(entry[family]) + Number(row.count ?? 0);
      byUser.set(row.user_id, entry);
    }
  }
  return { totals, perUserCounts: [...byUser.values()] as AdminStats['resources']['perUserCounts'] };
}
