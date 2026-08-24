import type { StatsWindow } from './types';

export type FeatureKey =
  | 'transactions_created'
  | 'budgets_created'
  | 'goals_created'
  | 'feedbacks_submitted'
  | 'ai_sessions'
  | 'ai_messages';
type Row = Record<string, unknown>;
type FeatureInput = {
  transactions: Row[] | null;
  budgets: Row[] | null;
  goals: Row[] | null;
  feedbacks: Row[] | null;
  aiSessions: Row[] | null;
  aiMessages: Row[] | null;
  usage: Row[] | null;
};
export type FeatureUsageOptions = {
  now: Date;
  window: StatsWindow;
  days: number;
};

const definitions: Array<{
  key: FeatureKey;
  source: keyof FeatureInput;
  timestamp: string;
  label: string;
}> = [
  {
    key: 'transactions_created',
    source: 'transactions',
    timestamp: 'created_at',
    label: 'transactions.created_at',
  },
  {
    key: 'budgets_created',
    source: 'budgets',
    timestamp: 'created_at',
    label: 'budgets.created_at',
  },
  {
    key: 'goals_created',
    source: 'goals',
    timestamp: 'created_at',
    label: 'goals.created_at',
  },
  {
    key: 'feedbacks_submitted',
    source: 'feedbacks',
    timestamp: 'created_at',
    label: 'feedbacks.created_at',
  },
  {
    key: 'ai_sessions',
    source: 'aiSessions',
    timestamp: 'started_at',
    label: 'ai_conversation_sessions.started_at',
  },
  {
    key: 'ai_messages',
    source: 'aiMessages',
    timestamp: 'created_at',
    label: 'ai_conversation_messages.created_at',
  },
];

function itemStatus(
  definition: (typeof definitions)[number],
  rows: Row[] | null,
  options: FeatureUsageOptions
) {
  const base = {
    key: definition.key,
    source: definition.label,
    basis: 'selected_window' as const,
  };
  if (!rows)
    return {
      ...base,
      status: 'unavailable' as const,
      reason: 'source_unavailable' as const,
    };
  const start = options.now.getTime() - options.days * 86400000;
  const valid = rows.filter(
    (row) =>
      typeof row[definition.timestamp] === 'string' &&
      !Number.isNaN(Date.parse(row[definition.timestamp] as string))
  );
  const count = valid.filter((row) => {
    const time = Date.parse(row[definition.timestamp] as string);
    return time >= start && time <= options.now.getTime();
  }).length;
  const status =
    valid.length === 0 && rows.length > 0
      ? 'partial'
      : count === 0
        ? 'empty'
        : 'available';
  const item: Record<string, unknown> = { ...base, status, count };
  if (status === 'partial') delete item.count;
  if (definition.key === 'transactions_created' && status !== 'partial') {
    item.byDay = Array.from({ length: options.days }, (_, index) => {
      const date = new Date(start + (index + 1) * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        date,
        count: valid.filter(
          (row) =>
            new Date(row[definition.timestamp] as string)
              .toISOString()
              .slice(0, 10) === date &&
            Date.parse(row[definition.timestamp] as string) <=
              options.now.getTime()
        ).length,
      };
    });
  }
  if (definition.key === 'feedbacks_submitted' && status !== 'partial') {
    const recentStart = options.now.getTime() - 7 * 86400000;
    item.recentCount = valid.filter((row) => {
      const time = Date.parse(row[definition.timestamp] as string);
      return time >= recentStart && time <= options.now.getTime();
    }).length;
  }
  return item;
}

function monthlyCounters(rows: Row[] | null) {
  const base = {
    source: 'usage_tracking' as const,
    basis: 'month_based' as const,
  };
  if (!rows)
    return {
      ...base,
      status: 'unavailable' as const,
      items: [],
      reason: 'source_unavailable' as const,
    };
  return {
    ...base,
    status: rows.length ? ('available' as const) : ('empty' as const),
    items: rows.map((row) => ({
      ...base,
      monthYear: String(row.month_year),
      transactionCount: Number(row.transaction_count ?? 0),
      backupCount: Number(row.backup_count ?? 0),
      apiCalls: Number(row.api_calls ?? 0),
      exportCount: Number(row.export_count ?? 0),
      aiRequests: Number(row.ai_requests ?? 0),
    })),
  };
}

export function buildFeatureUsage(
  input: FeatureInput,
  options: FeatureUsageOptions
) {
  const items = definitions.map((definition) =>
    itemStatus(definition, input[definition.source], options)
  );
  const status = items.every((item) => item.status === 'empty')
    ? 'empty'
    : items.some(
          (item) => item.status === 'unavailable' || item.status === 'partial'
        )
      ? 'partial'
      : 'available';
  return {
    status,
    window: options.window,
    items,
    monthlyCounters: monthlyCounters(input.usage),
  };
}
