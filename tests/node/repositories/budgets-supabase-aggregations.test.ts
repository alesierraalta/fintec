import { SupabaseBudgetsRepository } from '@/repositories/supabase/budgets-repository-impl';

type BudgetRow = {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  month_year: string;
  amount_base_minor: number;
  spent_base_minor: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  account_id: string;
  category_id: string;
  type: 'EXPENSE' | 'INCOME';
  amount_base_minor: number;
  date: string;
};

function createQuery<T>(resolver: () => { data: T; error: null }) {
  const query: any = {
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    gte: jest.fn(() => query),
    lt: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(resolver())),
    single: jest.fn(() => Promise.resolve(resolver())),
    then: (resolve: (value: { data: T; error: null }) => void) =>
      resolve(resolver()),
  };

  return query;
}

describe('SupabaseBudgetsRepository aggregations', () => {
  const auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates spent amounts using owned-account, category, and month filters', async () => {
    const budgets: BudgetRow[] = [
      {
        id: 'budget-1',
        user_id: 'user-1',
        name: 'Food',
        category_id: 'cat-food',
        month_year: '202603',
        amount_base_minor: 10000,
        spent_base_minor: 0,
        active: true,
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ];

    const transactions: TransactionRow[] = [
      {
        id: 'tx-owned-in-range',
        account_id: 'acc-owned',
        category_id: 'cat-food',
        type: 'EXPENSE',
        amount_base_minor: 2500,
        date: '2026-03-10',
      },
      {
        id: 'tx-other-account',
        account_id: 'acc-other',
        category_id: 'cat-food',
        type: 'EXPENSE',
        amount_base_minor: 9000,
        date: '2026-03-15',
      },
      {
        id: 'tx-other-month',
        account_id: 'acc-owned',
        category_id: 'cat-food',
        type: 'EXPENSE',
        amount_base_minor: 3000,
        date: '2026-04-01',
      },
      {
        id: 'tx-other-category',
        account_id: 'acc-owned',
        category_id: 'cat-rent',
        type: 'EXPENSE',
        amount_base_minor: 7000,
        date: '2026-03-08',
      },
    ];

    let ownedAccountIds: string[] = [];
    let scopedCategoryId = '';
    let dateFrom = '';
    let dateTo = '';

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn(() => {
            const query = createQuery(() => ({
              data: [{ id: 'acc-owned' }],
              error: null,
            }));
            query.eq = jest.fn(() => query);
            return query;
          }),
        };
      }

      if (table === 'budgets') {
        return {
          select: jest.fn(() => {
            const query = createQuery(() => ({ data: budgets, error: null }));
            query.eq = jest.fn(() => query);
            return query;
          }),
        };
      }

      if (table === 'transactions') {
        return {
          select: jest.fn(() => {
            const query = createQuery(() => ({
              data: transactions.filter(
                (transaction) =>
                  transaction.category_id === scopedCategoryId &&
                  ownedAccountIds.includes(transaction.account_id) &&
                  transaction.type === 'EXPENSE' &&
                  transaction.date >= dateFrom &&
                  transaction.date < dateTo
              ),
              error: null,
            }));
            query.eq = jest.fn((column: string, value: string) => {
              if (column === 'category_id') scopedCategoryId = value;
              return query;
            });
            query.in = jest.fn((column: string, value: string[]) => {
              if (column === 'account_id') ownedAccountIds = value;
              return query;
            });
            query.gte = jest.fn((column: string, value: string) => {
              if (column === 'date') dateFrom = value;
              return query;
            });
            query.lt = jest.fn((column: string, value: string) => {
              if (column === 'date') dateTo = value;
              return query;
            });
            return query;
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseBudgetsRepository({ auth, from } as any);

    const budgetsWithProgress =
      await repository.getBudgetsWithProgress('202603');
    const summary = await repository.getMonthlyBudgetSummary('202603');

    expect(budgetsWithProgress).toHaveLength(1);
    expect(budgetsWithProgress[0]?.spentBaseMinor).toBe(2500);
    expect(summary).toEqual({
      totalBudgetBaseMinor: 10000,
      totalSpentBaseMinor: 2500,
      totalRemainingBaseMinor: 7500,
      overBudgetCount: 0,
      budgetsCount: 1,
    });
    expect(dateFrom).toBe('2026-03-01');
    expect(dateTo).toBe('2026-04-01');
    expect(ownedAccountIds).toEqual(['acc-owned']);
  });

  it('copies only missing budgets into the target month', async () => {
    const repository = new SupabaseBudgetsRepository({ auth } as any);

    jest.spyOn(repository, 'findByMonthYear').mockResolvedValue([
      {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-food',
        monthYYYYMM: '202603',
        amountBaseMinor: 10000,
        active: true,
      },
      {
        id: 'budget-2',
        userId: 'user-1',
        categoryId: 'cat-rent',
        monthYYYYMM: '202603',
        amountBaseMinor: 20000,
        active: true,
      },
    ] as any);
    jest
      .spyOn(repository, 'budgetExists')
      .mockImplementation(async (categoryId) => categoryId === 'cat-rent');
    const createSpy = jest.spyOn(repository, 'create').mockResolvedValue({
      id: 'budget-new',
      userId: 'user-1',
      categoryId: 'cat-food',
      monthYYYYMM: '202604',
      amountBaseMinor: 10000,
      active: true,
    } as any);

    const copied = await repository.copyBudgetsToNextMonth('202603', '202604');

    expect(copied).toHaveLength(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat-food',
        monthYear: '202604',
        amountBaseMinor: 10000,
      })
    );
  });
});
