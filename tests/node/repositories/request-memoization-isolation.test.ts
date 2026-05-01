import { RequestContext } from '@/lib/cache/request-context';
import { getMemoizedOwnedAccountScope } from '@/repositories/supabase/memoized-account-scope';
import { SupabaseAccountsRepository } from '@/repositories/supabase/accounts-repository-impl';
import { SupabaseTransfersRepository } from '@/repositories/supabase/transfers-repository-impl';

type AccountRow = { id: string };

type TransferRow = {
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

function makeTransferRow(
  id: string,
  accountId: string,
  transferId: string
): TransferRow {
  return {
    id,
    account_id: accountId,
    type: 'TRANSFER_OUT',
    transfer_id: transferId,
    amount_minor: 5000,
    amount_base_minor: 5000,
    currency_code: 'USD',
    exchange_rate: 1,
    date: '2026-04-08',
    description: transferId,
    created_at: '2026-04-08T00:00:00.000Z',
    updated_at: '2026-04-08T00:00:00.000Z',
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

function createScopeClient(resolver: (userId: string) => AccountRow[]) {
  const metrics = {
    accountScopeQueries: 0,
    requestedUserIds: [] as string[],
  };

  const from = jest.fn((table: string) => {
    if (table !== 'accounts') {
      throw new Error(`Unexpected table ${table}`);
    }

    return {
      select: jest.fn(() => {
        let requestedUserId: string | undefined;

        const query: any = {
          eq: jest.fn((column: string, value: unknown) => {
            if (column === 'user_id') {
              requestedUserId = String(value);
              return query;
            }

            if (column === 'active') {
              metrics.accountScopeQueries += 1;
              metrics.requestedUserIds.push(requestedUserId ?? '');
              return Promise.resolve({
                data: resolver(requestedUserId ?? ''),
                error: null,
              });
            }

            return query;
          }),
        };

        return query;
      }),
    };
  });

  return {
    client: { from },
    metrics,
  };
}

function createSharedRepositoryClient(config: {
  initialScope: AccountRow[];
  refreshedScope: AccountRow[];
}) {
  let scopeReads = 0;
  const auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  };

  const transactionRows = [
    makeTransferRow('tx-1', 'acc-1', 'tr-1'),
    makeTransferRow('tx-2', 'acc-2', 'tr-2'),
  ];

  const from = jest.fn((table: string) => {
    if (table === 'accounts') {
      return {
        select: jest.fn(() => {
          let requestedUserId: string | undefined;

          const query: any = {
            eq: jest.fn((column: string, value: unknown) => {
              if (column === 'user_id') {
                requestedUserId = String(value);
                return query;
              }

              if (column === 'active') {
                scopeReads += 1;
                if (requestedUserId !== 'user-1') {
                  return Promise.resolve({ data: [], error: null });
                }

                return Promise.resolve({
                  data:
                    scopeReads === 1
                      ? config.initialScope
                      : config.refreshedScope,
                  error: null,
                });
              }

              return query;
            }),
            single: jest.fn().mockResolvedValue({
              data: { id: 'acc-2' },
              error: null,
            }),
            in: jest.fn(() => query),
          };

          return query;
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'acc-2', user_id: 'user-1', active: true },
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => {
          const query: any = {
            eq: jest.fn(() => query),
            in: jest.fn(() => query),
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { id: 'acc-2', user_id: 'user-1', active: false },
                error: null,
              }),
            })),
            then: (resolve: (value: unknown) => void) => {
              resolve({ error: null });
            },
          };

          return query;
        }),
      };
    }

    if (table === 'transactions') {
      return {
        select: jest.fn(() => {
          let accountIds: string[] = [];

          const query: any = {
            in: jest.fn((column: string, values: string[]) => {
              if (column === 'account_id') {
                accountIds = values;
              }
              return query;
            }),
            not: jest.fn(() => query),
            order: jest.fn(() => query),
            then: (resolve: (value: unknown) => void) => {
              resolve({
                data: transactionRows.filter((row) =>
                  accountIds.includes(row.account_id)
                ),
                error: null,
              });
            },
          };

          return query;
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { auth, from },
    getScopeReads: () => scopeReads,
  };
}

describe('request-scoped memoization isolation safety', () => {
  it('deduplicates concurrent owned-account lookups within the same request', async () => {
    const { client, metrics } = createScopeClient(() => [{ id: 'acc-1' }]);
    const context = new RequestContext('user-1');

    const [scopeA, scopeB] = await Promise.all([
      getMemoizedOwnedAccountScope(context, client as any),
      getMemoizedOwnedAccountScope(context, client as any),
    ]);

    expect(scopeA.accountIds).toEqual(['acc-1']);
    expect(scopeB).toBe(scopeA);
    expect(metrics.accountScopeQueries).toBe(1);
  });

  it('isolates parallel requests for different users without cross-request leaks', async () => {
    const { client, metrics } = createScopeClient((userId) => {
      if (userId === 'user-1') {
        return [{ id: 'acc-user-1' }];
      }

      if (userId === 'user-2') {
        return [{ id: 'acc-user-2' }];
      }

      return [];
    });

    const [scopeA, scopeB] = await Promise.all([
      getMemoizedOwnedAccountScope(new RequestContext('user-1'), client as any),
      getMemoizedOwnedAccountScope(new RequestContext('user-2'), client as any),
    ]);

    expect(scopeA.accountIds).toEqual(['acc-user-1']);
    expect(scopeB.accountIds).toEqual(['acc-user-2']);
    expect(scopeA.accountIds).not.toEqual(scopeB.accountIds);
    expect(metrics.requestedUserIds).toEqual(
      expect.arrayContaining(['user-1', 'user-2'])
    );
  });

  it('does not carry stale memoized scope across request boundaries for the same user', async () => {
    const responses = [[{ id: 'acc-old' }], [{ id: 'acc-new' }]];
    const { client, metrics } = createScopeClient(
      () => responses.shift() ?? []
    );

    const firstRequestScope = await getMemoizedOwnedAccountScope(
      new RequestContext('user-1'),
      client as any
    );
    const secondRequestScope = await getMemoizedOwnedAccountScope(
      new RequestContext('user-1'),
      client as any
    );

    expect(firstRequestScope.accountIds).toEqual(['acc-old']);
    expect(secondRequestScope.accountIds).toEqual(['acc-new']);
    expect(metrics.accountScopeQueries).toBe(2);
  });

  it.each([
    {
      label: 'create',
      mutate: async (repository: SupabaseAccountsRepository) => {
        await repository.create({
          name: 'Savings',
          type: 'BANK',
          currencyCode: 'USD',
        } as any);
      },
      initialScope: [{ id: 'acc-1' }],
      refreshedScope: [{ id: 'acc-1' }, { id: 'acc-2' }],
      expectedBefore: ['tr-1'],
      expectedAfter: ['tr-1', 'tr-2'],
    },
    {
      label: 'update-active-flag',
      mutate: async (repository: SupabaseAccountsRepository) => {
        await repository.update('acc-2', { active: false } as any);
      },
      initialScope: [{ id: 'acc-1' }, { id: 'acc-2' }],
      refreshedScope: [{ id: 'acc-1' }],
      expectedBefore: ['tr-1', 'tr-2'],
      expectedAfter: ['tr-1'],
    },
    {
      label: 'soft-delete',
      mutate: async (repository: SupabaseAccountsRepository) => {
        await repository.delete('acc-2');
      },
      initialScope: [{ id: 'acc-1' }, { id: 'acc-2' }],
      refreshedScope: [{ id: 'acc-1' }],
      expectedBefore: ['tr-1', 'tr-2'],
      expectedAfter: ['tr-1'],
    },
  ])(
    'invalidates memoized owned-account scope after account $label changes',
    async ({
      mutate,
      initialScope,
      refreshedScope,
      expectedBefore,
      expectedAfter,
    }) => {
      const requestContext = new RequestContext('user-1');
      const { client, getScopeReads } = createSharedRepositoryClient({
        initialScope,
        refreshedScope,
      });

      const accountsRepository = new SupabaseAccountsRepository(
        client as any,
        requestContext
      );
      const transfersRepository = new SupabaseTransfersRepository(
        client as any,
        requestContext
      );

      const beforeMutation = await transfersRepository.listByUserId('user-1');
      await mutate(accountsRepository);
      const afterMutation = await transfersRepository.listByUserId('user-1');

      expect(beforeMutation.map((transfer) => transfer.id).sort()).toEqual(
        expectedBefore
      );
      expect(afterMutation.map((transfer) => transfer.id).sort()).toEqual(
        expectedAfter
      );
      expect(getScopeReads()).toBe(2);
    }
  );
});
