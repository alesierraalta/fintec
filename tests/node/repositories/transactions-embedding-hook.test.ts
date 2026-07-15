/**
 * Unit tests for the PR3 best-effort embedding hook on
 * `SupabaseTransactionsRepository.create()` / `.update()`.
 *
 * Per design's "Write path" decision: embeddings generate best-effort on the
 * write path; embedding failure must NEVER block or fail a transaction
 * write. Mocks `lib/ai/rag/embeddings` (`embedText`) — no live provider
 * calls — and a fake Supabase client following this repo's existing
 * `{} as any` mock pattern (see transactions-ownership-scope.test.ts).
 */

const mockEmbedText = jest.fn();

jest.mock('@/lib/ai/rag/embeddings', () => ({
  embedText: (...args: unknown[]) => mockEmbedText(...args),
}));

import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';

function makeCreatedRow() {
  return {
    id: 'tx-1',
    type: 'EXPENSE',
    account_id: 'acc-1',
    category_id: null,
    currency_code: 'USD',
    amount_minor: 1200,
    amount_base_minor: 1200,
    exchange_rate: 1,
    date: '2026-06-01',
    description: 'Coffee at Starbucks',
    note: null,
    tags: [],
    transfer_id: null,
    is_debt: false,
    debt_direction: null,
    debt_status: null,
    counterparty_name: null,
    settled_at: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('SupabaseTransactionsRepository — best-effort embedding hook', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  function makeClient(row: ReturnType<typeof makeCreatedRow>) {
    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const updateBuilder = { eq: updateEq };
    const transactionsUpdate = jest.fn(() => updateBuilder);

    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const rpc = jest.fn().mockResolvedValue({ data: row, error: null });

    const accountsSelect = jest.fn().mockImplementation(() => {
      const query: any = {
        eq: jest.fn().mockImplementation(() => query),
        single: jest.fn().mockResolvedValue({
          data: { id: 'acc-1' },
          error: null,
        }),
      };
      return query;
    });

    const from = jest.fn((table: string) => {
      if (table === 'accounts') {
        return { select: accountsSelect };
      }
      if (table === 'transactions') {
        return { update: transactionsUpdate };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const client = { auth, from, rpc } as any;
    return { client, transactionsUpdate, updateEq };
  }

  it('generates and persists an embedding for a newly created transaction (fire-and-forget)', async () => {
    const row = makeCreatedRow();
    const { client, transactionsUpdate, updateEq } = makeClient(row);
    mockEmbedText.mockResolvedValue(new Array(768).fill(0.01));

    const repository = new SupabaseTransactionsRepository(client);

    await repository.create({
      accountId: 'acc-1',
      amountMinor: 1200,
      currencyCode: 'USD',
      date: '2026-06-01',
      description: 'Coffee at Starbucks',
      type: 'EXPENSE',
    } as any);

    await flushMicrotasks();

    expect(mockEmbedText).toHaveBeenCalledWith(
      expect.stringContaining('Coffee at Starbucks'),
      'RETRIEVAL_DOCUMENT'
    );
    expect(transactionsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ embedding: expect.any(Array) })
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'tx-1');
  });

  it('never blocks or fails the create() write when embedding generation rejects', async () => {
    const row = makeCreatedRow();
    const { client, transactionsUpdate } = makeClient(row);
    mockEmbedText.mockRejectedValue(new Error('embedding provider down'));

    const repository = new SupabaseTransactionsRepository(client);

    const result = await repository.create({
      accountId: 'acc-1',
      amountMinor: 1200,
      currencyCode: 'USD',
      date: '2026-06-01',
      description: 'Coffee at Starbucks',
      type: 'EXPENSE',
    } as any);

    // The write itself succeeded and returned the created transaction.
    expect(result.id).toBe('tx-1');

    await flushMicrotasks();

    // The failed embedding must never reach the update() call, and must be
    // logged, not swallowed silently or rethrown.
    expect(transactionsUpdate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('generates and persists an embedding after a successful update()', async () => {
    const row = makeCreatedRow();
    mockEmbedText.mockResolvedValue(new Array(768).fill(0.02));

    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const updateBuilder = { eq: updateEq };

    // findById (called internally by update()) uses select().eq().in().single()
    const findByIdQuery: any = {
      eq: jest.fn().mockImplementation(() => findByIdQuery),
      in: jest.fn().mockImplementation(() => findByIdQuery),
      single: jest.fn().mockResolvedValue({ data: row, error: null }),
    };

    let updateCallCount = 0;
    const transactionsFrom = {
      select: jest.fn().mockImplementation(() => findByIdQuery),
      update: jest.fn((payload: Record<string, unknown>) => {
        updateCallCount += 1;
        if (updateCallCount === 1) {
          // First call: the domain update() itself, chained with
          // .eq(id).select(...).single()
          const domainUpdateQuery: any = {
            eq: jest.fn().mockImplementation(() => domainUpdateQuery),
            select: jest.fn().mockImplementation(() => domainUpdateQuery),
            single: jest
              .fn()
              .mockResolvedValue({ data: { ...row, description: 'Updated' }, error: null }),
          };
          return domainUpdateQuery;
        }
        // Second call: the fire-and-forget embedding persist.
        return updateBuilder;
      }),
    };

    const accountsSelect = jest.fn().mockImplementation(() => {
      const query: any = {
        eq: jest.fn().mockImplementation(() => query),
        single: jest.fn().mockResolvedValue({
          data: { id: 'acc-1', user_id: 'user-1', is_default: true },
          error: null,
        }),
      };
      return query;
    });

    const auth = {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    };

    const from = jest.fn((table: string) => {
      if (table === 'accounts') return { select: accountsSelect };
      if (table === 'transactions') return transactionsFrom;
      throw new Error(`Unexpected table ${table}`);
    });

    const client = { auth, from } as any;
    const repository = new SupabaseTransactionsRepository(client);

    // findById() is also used internally; ensure the repository's own
    // findById -> select(...).eq(id).in(...).single() resolves to `row`.
    jest.spyOn(repository, 'findById').mockResolvedValue({
      id: 'tx-1',
      accountId: 'acc-1',
      type: 'EXPENSE',
      amountMinor: 1200,
      isDebt: false,
    } as any);

    await repository.update('tx-1', { description: 'Updated' } as any);

    await flushMicrotasks();

    expect(mockEmbedText).toHaveBeenCalledWith(
      expect.stringContaining('Updated'),
      'RETRIEVAL_DOCUMENT'
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'tx-1');
  });
});
