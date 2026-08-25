import { ValidationError } from '@/lib/errors/validation-error';

export type StatsWindow = '7d' | '30d' | '90d';
export type ActivityStatus = 'available' | 'empty';
export type UnavailableResult = {
  status: 'unavailable';
  reason: 'query_failed';
};
export type FeatureUsageStatus =
  | 'available'
  | 'empty'
  | 'partial'
  | 'unavailable';
export type FeatureUsageItem = {
  key: string;
  status: FeatureUsageStatus;
  source: string;
  basis: 'selected_window';
  count?: number;
  byDay?: Array<{ date: string; count: number }>;
  recentCount?: number;
  reason?: string;
};
export type MonthlyCounter = {
  monthYear: string;
  transactionCount: number;
  backupCount: number;
  apiCalls: number;
  exportCount: number;
  aiRequests: number;
};
export type FeatureUsage = {
  status: FeatureUsageStatus;
  window: StatsWindow;
  items: FeatureUsageItem[];
  monthlyCounters: {
    status: FeatureUsageStatus;
    source: 'usage_tracking';
    basis: 'month_based';
    items: MonthlyCounter[];
    reason?: string;
  };
};
export type FamilyResult<T> = T | UnavailableResult;
export type StatsWindowDays = { window: StatsWindow; days: number };

export type UserRosterEntry = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  isAdmin: boolean;
};

type ResourceFamily =
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'subscriptions'
  | 'feedbacks';
type ResourceValue = FamilyResult<number>;

export interface AdminStats {
  window: StatsWindow;
  users: {
    total: number;
    newByDay: { date: string; count: number }[];
    dau: number;
    wau: number;
    mau: number;
    peakDailyActive: number;
    peakDate: string | null;
    activityBasis: 'last_activity_at_session_refresh';
    activityStatus: ActivityStatus;
    list: UserRosterEntry[];
  };
  resources: {
    totals: Record<ResourceFamily, ResourceValue>;
    perUserCounts: Array<
      Record<'userId' | ResourceFamily, string | number | UnavailableResult>
    >;
  };
  usage: {
    byMonth: FamilyResult<
      Array<{
        monthYear: string;
        transactionCount: number;
        backupCount: number;
        apiCalls: number;
        exportCount: number;
        aiRequests: number;
      }>
    >;
  };
  featureUsage: FeatureUsage;
}

export function parseStatsWindow(
  value: string | null | undefined
): StatsWindowDays {
  if (!value || value === '30d') return { window: '30d', days: 30 };
  if (value === '7d') return { window: '7d', days: 7 };
  if (value === '90d') return { window: '90d', days: 90 };
  throw new ValidationError('Unsupported stats window', { window: value });
}
