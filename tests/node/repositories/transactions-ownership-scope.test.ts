import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';

type SupabaseTransactionRow = {
  id: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  account_id: string;
  category_id: string | null;
  currency_code: string;
  amount_minor: number;
  amount_base_minor: number;
  exchange_rate: number;
  date: string;
  description: string;
  note: string | null;
  tags: string[];
  transfer_id: string | null;
  is_debt: boolean;
  debt_direction: null;
  debt_status: null;
  counterparty_name: null;
  settled_at: null;
  created_at: string;
  updated_at: string;
};

function makeRow(id: string, accountId: string): SupabaseTransactionRow {
  return {
    id,
    type: 'EXPENSE',
    account_id: accountId,
    category_id: null,
    currency_code: 'USD',
    amount_minor: 1200,
    amount_base_minor: 1200,
    exchange_rate: 1,
    date: '2026-03-01',
    description: `tx-${id}`,
    note: null,
    tags: [],
    transfer_id: null,
    is_debt: false,
    debt_direction: null,
    debt_status: null,
    counterparty_name: null,
    settled_at: null,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  };
}

describe('SupabaseTransactionsRepository ownership scoping', () => {
  it('returns only transactions for owned accounts', async () => {
    const rows = [
      makeRow('tx-owned-1', 'acc-owned-1'),
      makeRow('tx-owned-2', 'acc-owned-2'),
      makeRow('tx-unowned', 'acc-other'),
    ];

    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const transactionsSelect = jest.fn(() => {
      let scopedAccountIds: string[] = [];

      const query: any = {
        in: jest.fn((column: string, values: string[]) => {
          if (column === 'account_id') {
            scopedAccountIds = values;
          }
          return query;
        }),
        order: jest.fn(() => query),
        range: jest.fn(() => query),
        then: (resolve: (value: unknown) => void) => {
          const filtered = rows.filter((row) =>
            scopedAccountIds.includes(row.account_id)
          );
          resolve({ data: filtered, error: null, count: filtered.length });
        },
      };

      return query;
    });

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockImplementation(() => {
            const query: any = {
              eq: jest.fn((column: string) => {
                if (column === 'active') {
                  return Promise.resolve({
                    data: [{ id: 'acc-owned-1' }, { id: 'acc-owned-2' }],
                    error: null,
                  });
                }

                return query;
              }),
            };

            return query;
          }),
        };
      }

      if (table === 'transactions') {
        return { select: transactionsSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseTransactionsRepository({
      auth,
      from,
    } as any);

    const result = await repository.findByFilters(
      { accountIds: ['acc-owned-1', 'acc-other'] },
      { page: 1, limit: 25 }
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe('tx-owned-1');
    expect(result.data[0]?.accountId).toBe('acc-owned-1');
  });

  it('returns safe empty result when user owns no accounts', async () => {
    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const transactionsSelect = jest.fn();
    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockImplementation(() => {
            const query: any = {
              eq: jest.fn((column: string) => {
                if (column === 'active') {
                  return Promise.resolve({ data: [], error: null });
                }

                return query;
              }),
            };

            return query;
          }),
        };
      }

      if (table === 'transactions') {
        return { select: transactionsSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseTransactionsRepository({
      auth,
      from,
    } as any);

    const result = await repository.findByFilters({}, { page: 1, limit: 25 });

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    });
    expect(transactionsSelect).not.toHaveBeenCalled();
  });
});
