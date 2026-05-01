import { SupabaseTransfersRepository } from '@/repositories/supabase/transfers-repository-impl';

type TransferTxRow = {
  id: string;
  account_id: string;
  type: 'TRANSFER_OUT' | 'TRANSFER_IN';
  transfer_id: string;
  amount_minor: number;
  amount_base_minor: number;
  currency_code: string;
  exchange_rate: number;
  date: string;
  description: string;
  created_at: string;
  updated_at: string;
  category_id: null;
  note: null;
  tags: string[];
  is_debt: boolean;
  debt_direction: null;
  debt_status: null;
  counterparty_name: null;
  settled_at: null;
};

function makeTransferTx(
  id: string,
  accountId: string,
  transferId: string,
  type: 'TRANSFER_OUT' | 'TRANSFER_IN'
): TransferTxRow {
  return {
    id,
    account_id: accountId,
    type,
    transfer_id: transferId,
    amount_minor: 5000,
    amount_base_minor: 5000,
    currency_code: 'USD',
    exchange_rate: 1,
    date: '2026-03-02',
    description: transferId,
    created_at: '2026-03-02T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
    category_id: null,
    note: null,
    tags: [],
    is_debt: false,
    debt_direction: null,
    debt_status: null,
    counterparty_name: null,
    settled_at: null,
  };
}

describe('SupabaseTransfersRepository ownership scoping', () => {
  it('lists only transfers from owned accounts', async () => {
    const rows = [
      makeTransferTx('tx-1', 'acc-owned-a', 'tr-owned', 'TRANSFER_OUT'),
      makeTransferTx('tx-2', 'acc-owned-b', 'tr-owned', 'TRANSFER_IN'),
      makeTransferTx('tx-3', 'acc-other-a', 'tr-other', 'TRANSFER_OUT'),
      makeTransferTx('tx-4', 'acc-other-b', 'tr-other', 'TRANSFER_IN'),
    ];

    const transactionsSelect = jest.fn(() => {
      let accountIds: string[] = [];
      let transferTypes: string[] = [];

      const query: any = {
        in: jest.fn((column: string, values: string[]) => {
          if (column === 'account_id') {
            accountIds = values;
          }
          if (column === 'type') {
            transferTypes = values;
          }
          return query;
        }),
        not: jest.fn(() => query),
        order: jest.fn(() => query),
        then: (resolve: (value: unknown) => void) => {
          const filtered = rows.filter(
            (row) =>
              accountIds.includes(row.account_id) &&
              transferTypes.includes(row.type) &&
              row.transfer_id != null
          );
          resolve({ data: filtered, error: null });
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
                    data: [{ id: 'acc-owned-a' }, { id: 'acc-owned-b' }],
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

    const repository = new SupabaseTransfersRepository({ from } as any);

    const transfers = await repository.listByUserId('user-1');

    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.id).toBe('tr-owned');
    expect(transfers[0]?.fromTransaction?.accountId).toBe('acc-owned-a');
    expect(transfers[0]?.toTransaction?.accountId).toBe('acc-owned-b');
  });

  it('does not delete transfers from unowned accounts', async () => {
    const rpc = jest.fn();

    const transactionsSelect = jest.fn(() => {
      let accountIds: string[] = [];
      let targetTransferId = '';

      const query: any = {
        in: jest.fn((column: string, values: string[]) => {
          if (column === 'account_id') {
            accountIds = values;
          }
          return query;
        }),
        eq: jest.fn((column: string, value: string) => {
          if (column === 'transfer_id') {
            targetTransferId = value;
          }
          return query;
        }),
        then: (resolve: (value: unknown) => void) => {
          const ownedRows = [
            {
              id: 'tx-owned',
              account_id: 'acc-owned-a',
              transfer_id: 'tr-owned',
            },
          ];

          const filtered = ownedRows.filter(
            (row) =>
              accountIds.includes(row.account_id) &&
              row.transfer_id === targetTransferId
          );

          resolve({ data: filtered, error: null });
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
                    data: [{ id: 'acc-owned-a' }],
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

    const repository = new SupabaseTransfersRepository({ from, rpc } as any);

    await expect(repository.delete('user-1', 'tr-other')).rejects.toThrow(
      'Transfer not found'
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
