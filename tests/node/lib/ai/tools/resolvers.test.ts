/**
 * Unit tests for the new PR3 resolvers added to `lib/ai/tools/resolvers.ts`:
 *   - `queryTransactions` — resolver for the `query_transactions` RPC
 *     (filters + aggregate modes).
 *   - `searchTransactions` — resolver for the `hybrid_search_transactions`
 *     RPC (embed query -> hybrid search -> optional rerank -> format).
 *
 * Mocks `lib/ai/rag/embeddings` and `lib/ai/rag/reranker` (no live provider
 * or gateway calls) plus a fake Supabase client's `.rpc()` (existing
 * `{} as any` mock pattern used across this repo's resolver/repository tests).
 */

const mockEmbedText = jest.fn();
const mockRerankCandidates = jest.fn();

jest.mock('@/lib/ai/rag/embeddings', () => ({
  embedText: (...args: unknown[]) => mockEmbedText(...args),
}));

jest.mock('@/lib/ai/rag/reranker', () => ({
  rerankCandidates: (...args: unknown[]) => mockRerankCandidates(...args),
}));

import {
  queryTransactions,
  searchTransactions,
} from '@/lib/ai/tools/resolvers';

function makeRepository(overrides: Partial<any> = {}) {
  return {
    accounts: {
      findByUserId: jest.fn().mockResolvedValue([
        { id: 'acc-1', name: 'Cartera', currencyCode: 'USD' },
      ]),
    },
    categories: {
      findAll: jest.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Food', userId: 'user-1' },
      ]),
    },
    ...overrides,
  };
}

describe('lib/ai/tools/resolvers — queryTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a category name to its id and calls query_transactions with the mapped params', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ group_key: null, result_value: 5000, row_count: 4 }],
      error: null,
    });
    const repository = makeRepository();

    const result = await queryTransactions(
      {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        category: 'Food',
        aggregate: 'sum',
      } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(rpc).toHaveBeenCalledWith(
      'query_transactions',
      expect.objectContaining({
        p_date_from: '2026-06-01',
        p_date_to: '2026-06-30',
        p_category_id: 'cat-1',
        p_aggregate: 'sum',
      })
    );
    expect(result).toContain('4');
  });

  it('passes p_group_by_field through for groupBy aggregate mode (triangulation)', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        { group_key: 'food', result_value: 5000, row_count: 4 },
        { group_key: 'transport', result_value: 2000, row_count: 2 },
      ],
      error: null,
    });
    const repository = makeRepository();

    const result = await queryTransactions(
      { aggregate: 'groupBy', groupByField: 'category' } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(rpc).toHaveBeenCalledWith(
      'query_transactions',
      expect.objectContaining({
        p_aggregate: 'groupBy',
        p_group_by_field: 'category',
      })
    );
    expect(result).toContain('food');
    expect(result).toContain('transport');
  });

  it('passes null for an unmatched category name instead of throwing', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ group_key: null, result_value: 0, row_count: 0 }],
      error: null,
    });
    const repository = makeRepository();

    await queryTransactions(
      { category: 'Nonexistent', aggregate: 'sum' } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(rpc).toHaveBeenCalledWith(
      'query_transactions',
      expect.objectContaining({ p_category_id: null })
    );
  });

  it('throws when the RPC returns an error', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'boom' } });
    const repository = makeRepository();

    await expect(
      queryTransactions({ aggregate: 'sum' } as any, {
        userId: 'user-1',
        repository: repository as any,
        supabase: { rpc } as any,
      })
    ).rejects.toThrow(/boom/);
  });
});

describe('lib/ai/tools/resolvers — searchTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbedText.mockResolvedValue(new Array(768).fill(0.01));
    mockRerankCandidates.mockImplementation(
      async (_query: string, candidates: any[]) => candidates
    );
  });

  it('embeds the query with RETRIEVAL_QUERY and calls hybrid_search_transactions with the embedding', async () => {
    const rows = [
      {
        id: 'tx-1',
        description: 'Café Central',
        amount_base_minor: 1500,
        date: '2026-06-10',
        score: 0.9,
      },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    const repository = makeRepository();

    const result = await searchTransactions(
      { query: 'cafe', limit: 20 } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(mockEmbedText).toHaveBeenCalledWith('cafe', 'RETRIEVAL_QUERY');
    expect(rpc).toHaveBeenCalledWith(
      'hybrid_search_transactions',
      expect.objectContaining({
        p_query_embedding: expect.any(Array),
        p_query_text: 'cafe',
      })
    );
    expect(result).toContain('Café Central');
  });

  it('passes candidates through the reranker and formats the reranked order', async () => {
    const rows = [
      {
        id: 'tx-1',
        description: 'Netflix',
        amount_base_minor: 999,
        date: '2026-06-05',
        score: 0.7,
      },
      {
        id: 'tx-2',
        description: 'Café Central',
        amount_base_minor: 1500,
        date: '2026-06-10',
        score: 0.9,
      },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    // Reranker reverses the order.
    mockRerankCandidates.mockImplementation(
      async (_query: string, candidates: any[]) => [...candidates].reverse()
    );
    const repository = makeRepository();

    const result = await searchTransactions(
      { query: 'charges', limit: 20 } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(mockRerankCandidates).toHaveBeenCalledTimes(1);
    // Reversed order: Café Central (originally 2nd) now appears first.
    expect(result.indexOf('Café Central')).toBeLessThan(
      result.indexOf('Netflix')
    );
  });

  it('returns a no-results message for an empty corpus without calling the reranker', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    const repository = makeRepository();

    const result = await searchTransactions(
      { query: 'anything', limit: 20 } as any,
      { userId: 'user-1', repository: repository as any, supabase: { rpc } as any }
    );

    expect(result.toLowerCase()).toMatch(/no/);
    expect(mockRerankCandidates).not.toHaveBeenCalled();
  });

  it('throws when the RPC returns an error', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'search failed' } });
    const repository = makeRepository();

    await expect(
      searchTransactions({ query: 'anything', limit: 20 } as any, {
        userId: 'user-1',
        repository: repository as any,
        supabase: { rpc } as any,
      })
    ).rejects.toThrow(/search failed/);
  });
});
