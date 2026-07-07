import { DebtDirection, DebtStatus } from '@/types';
import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import { LocalTransactionsRepository } from '@/repositories/local/transactions-repository-impl';

describe('transactions repository debt parity', () => {
  it('forwards identical debt filters in findDebts', async () => {
    const supabaseRepo = new SupabaseTransactionsRepository({} as any);
    const localRepo = new LocalTransactionsRepository();

    const supabaseFindByFiltersSpy = jest
      .spyOn(supabaseRepo, 'findByFilters')
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    const localFindByFiltersSpy = jest
      .spyOn(localRepo, 'findByFilters')
      .mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

    const filters = {
      accountIds: ['acc-1'],
      dateFrom: '2026-01-01',
      dateTo: '2026-03-01',
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.SETTLED,
    };

    await supabaseRepo.findDebts(filters, { page: 2, limit: 25 });
    await localRepo.findDebts(filters, { page: 2, limit: 25 });

    expect(supabaseFindByFiltersSpy).toHaveBeenCalledWith(
      {
        accountIds: ['acc-1'],
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        debtMode: 'ONLY_DEBT',
        debtDirection: DebtDirection.OWE,
        debtStatus: DebtStatus.SETTLED,
      },
      { page: 2, limit: 25 }
    );

    expect(localFindByFiltersSpy).toHaveBeenCalledWith(
      {
        accountIds: ['acc-1'],
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        debtMode: 'ONLY_DEBT',
        debtDirection: DebtDirection.OWE,
        debtStatus: DebtStatus.SETTLED,
      },
      { page: 2, limit: 25 }
    );
  });

  it('computes identical OPEN-only debt summary totals', async () => {
    const sampleOpenDebts = [
      {
        id: 'd-1',
        debtDirection: 'OWE',
        amountBaseMinor: 2500,
      },
      {
        id: 'd-2',
        debtDirection: 'OWED_TO_ME',
        amountBaseMinor: 4000,
      },
      {
        id: 'd-3',
        debtDirection: 'OWE',
        amountBaseMinor: 1000,
      },
    ] as any[];

    const supabaseRepo = new SupabaseTransactionsRepository({} as any);
    const localRepo = new LocalTransactionsRepository();

    const supabaseFindDebtsSpy = jest
      .spyOn(supabaseRepo, 'findDebts')
      .mockResolvedValue({
        data: sampleOpenDebts as any,
        total: sampleOpenDebts.length,
        page: 1,
        limit: 500,
        totalPages: 1,
      });
    const localFindDebtsSpy = jest
      .spyOn(localRepo, 'findDebts')
      .mockResolvedValue({
        data: sampleOpenDebts as any,
        total: sampleOpenDebts.length,
        page: 1,
        limit: 500,
        totalPages: 1,
      });

    const [supabaseSummary, localSummary] = await Promise.all([
      supabaseRepo.getDebtSummary({ accountIds: ['acc-1'] }),
      localRepo.getDebtSummary({ accountIds: ['acc-1'] }),
    ]);

    expect(supabaseFindDebtsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ['acc-1'],
        debtStatus: DebtStatus.OPEN,
      }),
      expect.objectContaining({ limit: 500 })
    );
    expect(localFindDebtsSpy).toHaveBeenCalledWith({
      accountIds: ['acc-1'],
      dateFrom: undefined,
      dateTo: undefined,
      debtStatus: DebtStatus.OPEN,
    });

    const expected = {
      totalOweBaseMinor: 3500,
      totalOwedToMeBaseMinor: 4000,
      netDebtBaseMinor: 500,
      openCount: 3,
    };

    expect(supabaseSummary).toEqual(expected);
    expect(localSummary).toEqual(expected);
  });
});

describe('debt with deduction (Supabase repo)', () => {
  function buildSupabaseRpcMock() {
    const rpcMock = jest.fn();

    // Generic thenable chain: every call to `.then()` resolves the same
    // default payload. `single()` is exposed at every level so ownership
    // checks (`.from().select().eq().eq().single()`) and category lookups
    // both work without per-test wiring.
    const chain: any = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      in: jest.fn(),
      order: jest.fn(),
      range: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
      ilike: jest.fn(),
      or: jest.fn(),
      overlaps: jest.fn(),
      then: jest.fn((resolve) =>
        resolve({ data: { id: 'acc-1' }, error: null })
      ),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.single.mockResolvedValue({ data: { id: 'acc-1' }, error: null });
    chain.in.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.range.mockReturnValue(chain);
    chain.gte.mockReturnValue(chain);
    chain.lte.mockReturnValue(chain);
    chain.ilike.mockReturnValue(chain);
    chain.or.mockReturnValue(chain);
    chain.overlaps.mockReturnValue(chain);

    const fromMock = jest.fn(() => chain);
    const authGetUserMock = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    return {
      rpc: rpcMock,
      from: fromMock,
      auth: { getUser: authGetUserMock },
    };
  }

  it('routes debt + deductFromAccount to create_debt_with_deduction', async () => {
    const client = buildSupabaseRpcMock();
    client.rpc.mockResolvedValue({
      data: { debt_id: 'debt-1', expense_id: 'exp-1', debt_deducted: true },
      error: null,
    });

    // The repo's create() for debt+deduct first calls the RPC, then
    // findById() to re-fetch the debt row. findById() requires the
    // owned-accounts scope to resolve, so the `from('accounts')` chain
    // must yield an array; the `from('transactions')` chain must yield
    // a single row.
    const accountsRows = [{ id: 'debt-acc' }, { id: 'cash-acc' }];
    const debtRow = {
      id: 'debt-1',
      type: 'EXPENSE',
      account_id: 'debt-acc',
      amount_minor: 100000,
      amount_base_minor: 100000,
      currency_code: 'USD',
      date: '2026-07-06',
      is_debt: true,
      debt_direction: DebtDirection.OWED_TO_ME,
      debt_status: DebtStatus.OPEN,
      created_at: '2026-07-06T00:00:00Z',
      updated_at: '2026-07-06T00:00:00Z',
    };
    (client.from as jest.Mock).mockImplementation((table: string) => {
      const chain: any = {
        select: jest.fn(),
        eq: jest.fn(),
        in: jest.fn(),
        single: jest.fn(),
        then: jest.fn(),
      };
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.in.mockReturnValue(chain);
      // The accounts scope chain awaits via `.then(resolve)` (not
      // `.single()`); the transactions chain awaits via `.single()`.
      chain.then = jest.fn((resolve: any) =>
        resolve({
          data: table === 'accounts' ? accountsRows : null,
          error: null,
        })
      );
      chain.single = jest.fn().mockResolvedValue({
        data: table === 'transactions' ? debtRow : null,
        error: null,
      });
      return chain;
    });
    const repo = new SupabaseTransactionsRepository(client as any);

    const result = await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'debt-acc',
      categoryId: 'cat-debt',
      currencyCode: 'USD',
      amountMinor: 100000,
      date: '2026-07-06',
      description: 'Lent to bob',
      isDebt: true,
      debtDirection: DebtDirection.OWED_TO_ME,
      deductFromAccount: true,
      sourceAccountId: 'cash-acc',
    } as any);

    expect(client.rpc).toHaveBeenCalledWith(
      'create_debt_with_deduction',
      expect.objectContaining({
        p_deduct: true,
        p_source_account_id: 'cash-acc',
        p_debt_direction: DebtDirection.OWED_TO_ME,
      })
    );
    expect(result.id).toBe('debt-1');
  });

  it('falls back to the legacy RPC when debt is false (no deduction path)', async () => {
    const client = buildSupabaseRpcMock();
    client.rpc.mockResolvedValue({
      data: { id: 'tx-1' },
      error: null,
    });

    // `from('categories')` must return a default category so the repo
    // passes the ownership check. `from('accounts')` already returns the
    // generic chain from buildSupabaseRpcMock (which resolves to id only).
    const categoryChain: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'cat-1', user_id: 'user-1', is_default: true },
        error: null,
      }),
    };
    (client.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'categories') return categoryChain;
      // For other tables (accounts ownership check) return a new generic
      // chain that resolves with id.
      const c: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: 'acc-1' }, error: null }),
      };
      return c;
    });

    const repo = new SupabaseTransactionsRepository(client as any);

    await repo.create({
      type: 'EXPENSE' as any,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      currencyCode: 'USD',
      amountMinor: 50000,
      date: '2026-07-06',
      description: 'Lunch',
    } as any);

    expect(client.rpc).toHaveBeenCalledWith(
      'create_transaction_and_adjust_balance',
      expect.any(Object)
    );
  });

  it('rejects a deduct request when sourceAccountId is missing', async () => {
    const client = buildSupabaseRpcMock();
    const repo = new SupabaseTransactionsRepository(client as any);

    await expect(
      repo.create({
        type: 'EXPENSE' as any,
        accountId: 'debt-acc',
        categoryId: 'cat-debt',
        currencyCode: 'USD',
        amountMinor: 100000,
        date: '2026-07-06',
        description: 'No source',
        isDebt: true,
        debtDirection: DebtDirection.OWE,
        deductFromAccount: true,
      } as any)
    ).rejects.toThrow(/sourceAccountId is required/i);

    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('routes debt deletion through delete_transaction_and_adjust_balance', async () => {
    const client = buildSupabaseRpcMock();
    const updateChain: any = {
      eq: jest.fn(() => updateChain),
      select: jest.fn(() => updateChain),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'd-1',
          type: 'EXPENSE',
          account_id: 'a-1',
          amount_minor: 100000,
          amount_base_minor: 100000,
          currency_code: 'USD',
          date: '2026-07-06',
          is_debt: true,
          debt_direction: DebtDirection.OWE,
          debt_status: DebtStatus.OPEN,
          created_at: '2026-07-06T00:00:00Z',
          updated_at: '2026-07-06T00:00:00Z',
        },
        error: null,
      }),
    };
    client.from = jest.fn(() => updateChain) as any;
    client.rpc = jest.fn().mockResolvedValue({ data: null, error: null });

    const repo = new SupabaseTransactionsRepository(client as any);
    // Spy on findById to return a debt row
    jest.spyOn(repo, 'findById').mockResolvedValue({
      id: 'd-1',
      type: 'EXPENSE' as any,
      accountId: 'a-1',
      categoryId: null,
      currencyCode: 'USD',
      amountMinor: 100000,
      amountBaseMinor: 100000,
      exchangeRate: 1,
      date: '2026-07-06',
      isDebt: true,
      debtDirection: DebtDirection.OWE,
      debtStatus: DebtStatus.OPEN,
      createdAt: '2026-07-06T00:00:00Z',
      updatedAt: '2026-07-06T00:00:00Z',
    } as any);

    // accountsRepository is optional; we ensure no rpc balance adjustment
    // is called for the delete path on a debt.
    await repo.delete('d-1');

    // The delete RPC must run, but no inline balance update from create()
    // would have happened for an existing debt.
    expect(client.rpc).toHaveBeenCalledWith(
      'delete_transaction_and_adjust_balance',
      expect.objectContaining({ transaction_id_input: 'd-1' })
    );
  });

  it('reverts the original balance effect when updating a normal transaction into debt', async () => {
    const client = buildSupabaseRpcMock();
    const updateChain: any = {
      update: jest.fn(() => updateChain),
      eq: jest.fn(() => updateChain),
      select: jest.fn(() => updateChain),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'tx-1',
          type: 'EXPENSE',
          account_id: 'acc-1',
          amount_minor: 5000,
          amount_base_minor: 5000,
          currency_code: 'USD',
          date: '2026-07-06',
          is_debt: true,
          debt_direction: DebtDirection.OWE,
          debt_status: DebtStatus.OPEN,
          created_at: '2026-07-06T00:00:00Z',
          updated_at: '2026-07-06T00:00:00Z',
        },
        error: null,
      }),
    };
    client.from = jest.fn(() => updateChain) as any;

    const repo = new SupabaseTransactionsRepository(client as any);
    const adjustBalance = jest.fn().mockResolvedValue(undefined);
    repo.setAccountsRepository({ adjustBalance } as any);
    jest.spyOn(repo, 'findById').mockResolvedValue({
      id: 'tx-1',
      type: 'EXPENSE' as any,
      accountId: 'acc-1',
      categoryId: null,
      currencyCode: 'USD',
      amountMinor: 5000,
      amountBaseMinor: 5000,
      exchangeRate: 1,
      date: '2026-07-06',
      isDebt: false,
      createdAt: '2026-07-06T00:00:00Z',
      updatedAt: '2026-07-06T00:00:00Z',
    } as any);

    await repo.update('tx-1', {
      isDebt: true,
      debtDirection: DebtDirection.OWE,
    } as any);

    expect(adjustBalance).toHaveBeenCalledWith('acc-1', 5000);
  });

  it('applies the new balance effect when updating a debt transaction into normal', async () => {
    const client = buildSupabaseRpcMock();
    const updateChain: any = {
      update: jest.fn(() => updateChain),
      eq: jest.fn(() => updateChain),
      select: jest.fn(() => updateChain),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'tx-2',
          type: 'INCOME',
          account_id: 'acc-1',
          amount_minor: 7000,
          amount_base_minor: 7000,
          currency_code: 'USD',
          date: '2026-07-06',
          is_debt: false,
          debt_direction: null,
          debt_status: null,
          created_at: '2026-07-06T00:00:00Z',
          updated_at: '2026-07-06T00:00:00Z',
        },
        error: null,
      }),
    };
    client.from = jest.fn(() => updateChain) as any;

    const repo = new SupabaseTransactionsRepository(client as any);
    const adjustBalance = jest.fn().mockResolvedValue(undefined);
    repo.setAccountsRepository({ adjustBalance } as any);
    jest.spyOn(repo, 'findById').mockResolvedValue({
      id: 'tx-2',
      type: 'INCOME' as any,
      accountId: 'acc-1',
      categoryId: null,
      currencyCode: 'USD',
      amountMinor: 7000,
      amountBaseMinor: 7000,
      exchangeRate: 1,
      date: '2026-07-06',
      isDebt: true,
      debtDirection: DebtDirection.OWED_TO_ME,
      debtStatus: DebtStatus.OPEN,
      createdAt: '2026-07-06T00:00:00Z',
      updatedAt: '2026-07-06T00:00:00Z',
    } as any);

    await repo.update('tx-2', {
      isDebt: false,
      type: 'INCOME' as any,
    } as any);

    expect(adjustBalance).toHaveBeenCalledWith('acc-1', 7000);
  });
});
