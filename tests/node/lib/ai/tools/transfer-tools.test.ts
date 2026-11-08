/**
 * #114: transfers between the user's own accounts must never be recorded as
 * expenses, and a mis-recorded expense can be converted into a transfer.
 */

jest.mock('@/lib/ai/rag/embeddings', () => ({ embedText: jest.fn() }));
jest.mock('@/lib/ai/rag/reranker', () => ({ rerankCandidates: jest.fn() }));

import {
  createTransfer,
  reclassifyExpenseAsTransfer,
} from '@/lib/ai/tools/resolvers';

const ACCOUNTS = [
  { id: 'acc-zelle', name: 'Zelle', currencyCode: 'USD' },
  { id: 'acc-binance', name: 'Binance', currencyCode: 'USD' },
  { id: 'acc-banesco', name: 'Banesco', currencyCode: 'VES' },
];

function expense(
  id: string,
  amountMinor: number,
  date: string,
  description: string
) {
  return {
    id,
    type: 'EXPENSE',
    accountId: 'acc-zelle',
    amountMinor,
    date,
    description,
    currencyCode: 'USD',
  };
}

function makeRepository(expenses: unknown[] = []) {
  return {
    accounts: { findByUserId: jest.fn().mockResolvedValue(ACCOUNTS) },
    transactions: {
      create: jest.fn(),
      // Paginates like the real repository: `limit` rows per page.
      findByFilters: jest.fn(
        async (_filters: unknown, pagination: { page: number; limit: number }) => {
          const start = (pagination.page - 1) * pagination.limit;
          return {
            data: expenses.slice(start, start + pagination.limit),
            total: expenses.length,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.max(1, Math.ceil(expenses.length / pagination.limit)),
          };
        }
      ),
    },
    transfers: {
      create: jest.fn().mockResolvedValue({
        transferId: 'tr-1',
        fromAmount: 700000,
        toAmount: 700000,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      }),
      convertExpenseToTransfer: jest.fn().mockResolvedValue({
        transferId: 'tr-2',
        convertedTransactionId: 'tx-7000',
      }),
    },
  };
}

const ctx = (repository: ReturnType<typeof makeRepository>) => ({
  userId: 'user-1',
  repository: repository as any,
});

describe('createTransfer (#114)', () => {
  it('moves money between own accounts through the transfers repository, never as an expense', async () => {
    const repository = makeRepository();

    const result = await createTransfer(
      {
        fromAccountName: 'zelle',
        toAccountName: 'Binance',
        amount: 7000,
      } as any,
      ctx(repository)
    );

    expect(repository.transfers.create).toHaveBeenCalledWith('user-1', {
      fromAccountId: 'acc-zelle',
      toAccountId: 'acc-binance',
      amountMajor: 7000,
      description: 'Transferencia de Zelle a Binance',
      date: undefined,
      exchangeRate: undefined,
    });
    expect(repository.transactions.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'success',
      transfer: {
        id: 'tr-1',
        fromAccountName: 'Zelle',
        toAccountName: 'Binance',
        fromAmountMinor: 700000,
        toAmountMinor: 700000,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      },
    });
  });

  it('asks for the exchange rate on a cross-currency transfer without one, and moves nothing', async () => {
    const repository = makeRepository();

    const result = await createTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Banesco',
        amount: 100,
      } as any,
      ctx(repository)
    );

    expect(result).toEqual({
      status: 'needs_clarification',
      field: 'exchangeRate',
      message: expect.stringContaining('USD'),
      options: [],
    });
    expect(repository.transfers.create).not.toHaveBeenCalled();
  });

  it('passes the exchange rate for a cross-currency transfer', async () => {
    const repository = makeRepository();

    await createTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Banesco',
        amount: 100,
        exchangeRate: 36.5,
      } as any,
      ctx(repository)
    );

    expect(repository.transfers.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        fromAccountId: 'acc-zelle',
        toAccountId: 'acc-banesco',
        exchangeRate: 36.5,
      })
    );
  });

  it('asks when an account does not exist or both are the same, and moves nothing', async () => {
    const repository = makeRepository();

    const unknown = await createTransfer(
      {
        fromAccountName: 'Provincial',
        toAccountName: 'Binance',
        amount: 10,
      } as any,
      ctx(repository)
    );
    const same = await createTransfer(
      { fromAccountName: 'Zelle', toAccountName: 'zelle', amount: 10 } as any,
      ctx(repository)
    );

    expect(unknown).toMatchObject({
      status: 'needs_clarification',
      field: 'account',
      options: ['Zelle', 'Binance', 'Banesco'],
    });
    expect(same).toMatchObject({
      status: 'needs_clarification',
      field: 'account',
    });
    expect(repository.transfers.create).not.toHaveBeenCalled();
  });
});

describe('reclassifyExpenseAsTransfer (#114)', () => {
  it('converts the single matching expense into a transfer to the destination account', async () => {
    const repository = makeRepository([
      expense('tx-7000', 700000, '2026-11-01', 'Transferencia a Binance'),
      expense('tx-other', 1500, '2026-11-01', 'Almuerzo'),
    ]);

    const result = await reclassifyExpenseAsTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Binance',
        amount: 7000,
      } as any,
      ctx(repository)
    );

    expect(repository.transactions.findByFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ['acc-zelle'],
        types: ['EXPENSE'],
      }),
      expect.anything()
    );
    expect(repository.transfers.convertExpenseToTransfer).toHaveBeenCalledWith(
      'tx-7000',
      'acc-binance',
      undefined
    );
    expect(result).toMatchObject({
      status: 'success',
      converted: {
        transactionId: 'tx-7000',
        description: 'Transferencia a Binance',
      },
    });
  });

  it('asks which expense when several match, and converts nothing', async () => {
    const repository = makeRepository([
      expense('tx-a', 700000, '2026-11-01', 'Pago A'),
      expense('tx-b', 700000, '2026-10-15', 'Pago B'),
    ]);

    const result = await reclassifyExpenseAsTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Binance',
        amount: 7000,
      } as any,
      ctx(repository)
    );

    expect(result).toEqual({
      status: 'needs_clarification',
      field: 'transaction',
      message: expect.any(String),
      options: [
        '2026-11-01 · Pago A [id: tx-a]',
        '2026-10-15 · Pago B [id: tx-b]',
      ],
    });
    expect(
      repository.transfers.convertExpenseToTransfer
    ).not.toHaveBeenCalled();
  });

  it('uses an explicit transaction id from a previous clarification', async () => {
    const repository = makeRepository([
      expense('tx-a', 700000, '2026-11-01', 'Pago A'),
      expense('tx-b', 700000, '2026-10-15', 'Pago B'),
    ]);

    await reclassifyExpenseAsTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Binance',
        amount: 7000,
        transactionId: 'tx-b',
      } as any,
      ctx(repository)
    );

    expect(repository.transfers.convertExpenseToTransfer).toHaveBeenCalledWith(
      'tx-b',
      'acc-binance',
      undefined
    );
  });

  it('reports when no expense matches, and converts nothing', async () => {
    const repository = makeRepository([
      expense('tx-other', 1500, '2026-11-01', 'Almuerzo'),
    ]);

    const result = await reclassifyExpenseAsTransfer(
      {
        fromAccountName: 'Zelle',
        toAccountName: 'Binance',
        amount: 7000,
      } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({
      status: 'needs_clarification',
      field: 'transaction',
      options: [],
    });
    expect(
      repository.transfers.convertExpenseToTransfer
    ).not.toHaveBeenCalled();
  });
});

describe('reclassifyExpenseAsTransfer safety (#114 review)', () => {
  it('never offers expenses linked to a debt', async () => {
    const repository = makeRepository([
      { ...expense('tx-debt', 700000, '2026-11-01', 'Abono deuda'), tags: ['debt-linked', 'debt:d-1'] },
    ]);

    const result = await reclassifyExpenseAsTransfer(
      { fromAccountName: 'Zelle', toAccountName: 'Binance', amount: 7000 } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({ status: 'needs_clarification', field: 'transaction', options: [] });
    expect(repository.transfers.convertExpenseToTransfer).not.toHaveBeenCalled();
  });

  it('sees matching expenses beyond the first page, so an older duplicate makes it ambiguous', async () => {
    const filler = Array.from({ length: 250 }, (_, i) =>
      expense(`tx-f${i}`, 100 + i, '2026-10-20', `Gasto ${i}`)
    );
    const repository = makeRepository([
      expense('tx-new', 700000, '2026-11-01', 'Nuevo'),
      ...filler,
      expense('tx-old', 700000, '2026-01-05', 'Viejo'),
    ]);

    const result = await reclassifyExpenseAsTransfer(
      { fromAccountName: 'Zelle', toAccountName: 'Binance', amount: 7000 } as any,
      ctx(repository)
    );

    expect(result).toMatchObject({
      status: 'needs_clarification',
      options: ['2026-11-01 · Nuevo [id: tx-new]', '2026-01-05 · Viejo [id: tx-old]'],
    });
    expect(repository.transfers.convertExpenseToTransfer).not.toHaveBeenCalled();
  });
});

describe('transfer approval policy (#114)', () => {
  const { shouldRequestApproval } = jest.requireActual(
    '@/lib/ai/hitl/autonomy-policy'
  );

  it('always asks before converting an expense, and asks for transfers of 100 or more', () => {
    expect(
      shouldRequestApproval('reclassifyExpenseAsTransfer', { amount: 1 })
    ).toBe(true);
    expect(shouldRequestApproval('createTransfer', { amount: 7000 })).toBe(
      true
    );
    expect(shouldRequestApproval('createTransfer', { amount: 20 })).toBe(false);
  });
});
