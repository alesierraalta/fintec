import { SupabaseGoalsRepository } from '@/repositories/supabase/goals-repository-impl';

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_base_minor: number;
  current_base_minor: number;
  target_date: string | null;
  account_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ContributionRow = {
  id: string;
  goal_id: string;
  user_id: string;
  delta_base_minor: number;
  note: string | null;
  source: string | null;
  related_transaction_id: string | null;
  created_at: string;
};

function createGoalsClient(options?: {
  goal?: Partial<GoalRow>;
  contributions?: ContributionRow[];
  accountBalance?: number;
}) {
  let goal: GoalRow = {
    id: 'goal-1',
    user_id: 'user-1',
    name: 'Emergency Fund',
    description: null,
    target_base_minor: 10000,
    current_base_minor: options?.goal?.current_base_minor ?? 0,
    target_date: '2026-12-31',
    account_id: options?.goal?.account_id ?? null,
    active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...options?.goal,
  };
  const contributions: ContributionRow[] = [...(options?.contributions ?? [])];
  let contributionId = contributions.length;
  let accountBalance = options?.accountBalance ?? 4200;

  const auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  };

  const from = jest.fn((table: string) => {
    if (table === 'goals') {
      return {
        select: jest.fn(() => {
          const query: any = {
            eq: jest.fn(() => query),
            single: jest.fn().mockResolvedValue({ data: goal, error: null }),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: goal, error: null }),
            then: (resolve: (value: unknown) => void) =>
              resolve({ data: [goal], error: null }),
          };
          return query;
        }),
        update: jest.fn((updates: Partial<GoalRow>) => {
          goal = {
            ...goal,
            ...updates,
          };
          const query: any = {
            eq: jest.fn(() => query),
            select: jest.fn(() => query),
            single: jest.fn().mockResolvedValue({ data: goal, error: null }),
            then: (resolve: (value: unknown) => void) =>
              resolve({ data: null, error: null }),
          };
          return query;
        }),
      };
    }

    if (table === 'goal_contributions') {
      return {
        insert: jest.fn(
          (payload: Omit<ContributionRow, 'id' | 'created_at'>) => {
            contributions.push({
              id: `contribution-${++contributionId}`,
              created_at: `2026-03-${String(contributionId).padStart(2, '0')}T00:00:00.000Z`,
              ...payload,
            });
            return Promise.resolve({ error: null });
          }
        ),
        select: jest.fn(() => {
          const query: any = {
            eq: jest.fn(() => query),
            order: jest.fn(() => query),
            then: (resolve: (value: unknown) => void) =>
              resolve({
                data: [...contributions].sort((left, right) =>
                  right.created_at.localeCompare(left.created_at)
                ),
                error: null,
              }),
          };
          return query;
        }),
      };
    }

    if (table === 'accounts') {
      return {
        select: jest.fn(() => {
          const query: any = {
            in: jest.fn(() => query),
            eq: jest.fn(() => query),
            then: (resolve: (value: unknown) => void) =>
              resolve({
                data: [{ id: goal.account_id, balance: accountBalance }],
                error: null,
              }),
            single: jest.fn().mockResolvedValue({
              data: { id: goal.account_id, balance: accountBalance },
              error: null,
            }),
          };
          return query;
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { auth, from },
    getGoal: () => goal,
    setAccountBalance: (nextBalance: number) => {
      accountBalance = nextBalance;
    },
  };
}

describe('SupabaseGoalsRepository ledger and refresh semantics', () => {
  it('persists signed contributions and recomputes manual goal progress', async () => {
    const { client, getGoal } = createGoalsClient({
      goal: { current_base_minor: 0, account_id: null },
    });
    const repository = new SupabaseGoalsRepository(client as any);

    await repository.addContribution('goal-1', 3000, 'Initial deposit');
    expect(getGoal().current_base_minor).toBe(3000);

    await repository.removeContribution('goal-1', 500, 'Adjustment');
    expect(getGoal().current_base_minor).toBe(2500);
  });

  it('rejects manual contributions for linked-account goals', async () => {
    const { client } = createGoalsClient({
      goal: { account_id: 'acc-1', current_base_minor: 2000 },
    });
    const repository = new SupabaseGoalsRepository(client as any);

    await expect(repository.addContribution('goal-1', 500)).rejects.toThrow(
      'Linked-account goals derive progress from the linked account balance'
    );
  });

  it('returns newest-first analytics with monthly averages and projection', async () => {
    const { client } = createGoalsClient({
      goal: { current_base_minor: 3000, account_id: null },
      contributions: [
        {
          id: 'contribution-1',
          goal_id: 'goal-1',
          user_id: 'user-1',
          delta_base_minor: 1000,
          note: 'January',
          source: 'manual',
          related_transaction_id: null,
          created_at: '2026-01-10T00:00:00.000Z',
        },
        {
          id: 'contribution-2',
          goal_id: 'goal-1',
          user_id: 'user-1',
          delta_base_minor: 2000,
          note: 'February',
          source: 'manual',
          related_transaction_id: null,
          created_at: '2026-02-15T00:00:00.000Z',
        },
      ],
    });
    const repository = new SupabaseGoalsRepository(client as any);

    const analytics = await repository.getGoalAnalytics('goal-1');

    expect(analytics.progressSource).toBe('manual_ledger');
    expect(analytics.totalContributions).toBe(3000);
    expect(analytics.averageMonthlyContribution).toBe(1500);
    expect(analytics.contributionHistory.map((entry) => entry.id)).toEqual([
      'contribution-2',
      'contribution-1',
    ]);
    expect(analytics.projectedCompletionDate).toBeDefined();
  });

  it('explains linked-account analytics and supports targeted refresh', async () => {
    const { client, getGoal, setAccountBalance } = createGoalsClient({
      goal: { account_id: 'acc-1', current_base_minor: 1800 },
      accountBalance: 5400,
    });
    const repository = new SupabaseGoalsRepository(client as any);

    const analytics = await repository.getGoalAnalytics('goal-1');
    expect(analytics).toMatchObject({
      progressSource: 'linked_account',
      averageMonthlyContribution: 0,
      contributionHistory: [],
    });
    expect(analytics.message).toContain('cuenta vinculada');

    setAccountBalance(5400);
    await repository.updateGoalProgress('goal-1');
    expect(getGoal().current_base_minor).toBe(5400);
  });
});
