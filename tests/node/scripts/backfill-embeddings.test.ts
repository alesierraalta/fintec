/**
 * Unit tests for `scripts/backfill-embeddings.ts` — chunked, resumable
 * backfill of transaction embeddings for rows with a NULL `embedding`
 * column. Mocks `lib/ai/rag/embeddings` (`embedText`) and a fake Supabase
 * client. No live provider/DB calls.
 */

const mockEmbedText = jest.fn();

jest.mock('@/lib/ai/rag/embeddings', () => ({
  embedText: (...args: unknown[]) => mockEmbedText(...args),
}));

import { chunkArray, runBackfill } from '@/scripts/backfill-embeddings';

describe('scripts/backfill-embeddings — chunkArray', () => {
  it('splits an array into equal-size chunks', () => {
    const result = chunkArray([1, 2, 3, 4, 5, 6], 2);
    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('splits an array with a remainder into a smaller final chunk (triangulation)', () => {
    const result = chunkArray([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('scripts/backfill-embeddings — runBackfill', () => {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  function makeRow(id: string, description: string, note: string | null = null) {
    return { id, description, note };
  }

  function makeClient(batches: ReturnType<typeof makeRow>[][]) {
    let call = 0;
    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const update = jest.fn(() => ({ eq: updateEq }));

    const select = jest.fn().mockImplementation(() => {
      const query: any = {
        is: jest.fn().mockImplementation(() => query),
        gt: jest.fn().mockImplementation(() => query),
        order: jest.fn().mockImplementation(() => query),
        limit: jest.fn().mockImplementation(() => {
          const batch = batches[call] ?? [];
          call += 1;
          return Promise.resolve({ data: batch, error: null });
        }),
      };
      return query;
    });

    const from = jest.fn((table: string) => {
      if (table !== 'transactions') throw new Error(`Unexpected table ${table}`);
      return { select, update };
    });

    return { client: { from } as any, update, updateEq };
  }

  // Real-table model (unlike `makeClient` above): backs the cursor query
  // with a mutable in-memory table, so a write (or its absence, in
  // dry-run) is visible to the NEXT query — catching a missing/broken
  // keyset cursor instead of masking it with canned per-call batches.
  const MAX_QUERY_CALLS = 6;
  function makeRealisticClient(rows: { id: string; description: string }[]) {
    const table = rows.map((r) => ({ ...r, note: null as string | null, embedding: null as number[] | null }));
    let queryCallCount = 0;
    const updateIds: string[] = [];
    const limitFn = (afterId: string | undefined) => (n: number) => {
      queryCallCount += 1;
      if (queryCallCount > MAX_QUERY_CALLS) {
        return Promise.reject(new Error(`TEST GUARD: query() called ${queryCallCount}x — missing/broken keyset cursor.`));
      }
      const matches = table
        .filter((r) => r.embedding === null && (afterId === undefined || r.id > afterId))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, n)
        .map(({ id, description, note }) => ({ id, description, note }));
      return Promise.resolve({ data: matches, error: null });
    };
    const from = jest.fn(() => ({
      select: jest.fn().mockImplementation(() => {
        let afterId: string | undefined;
        const query: any = {
          is: () => query,
          gt: (_c: string, v: string) => ((afterId = v), query),
          order: () => query,
          limit: (n: number) => limitFn(afterId)(n),
        };
        return query;
      }),
      update: (payload: { embedding: number[] }) => ({
        eq: (_c: string, id: string) => {
          const row = table.find((r) => r.id === id);
          if (row) row.embedding = payload.embedding;
          updateIds.push(id);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }));
    return { client: { from } as any, updateIds, getQueryCallCount: () => queryCallCount };
  }

  it('processes rows in a NULL-embedding batch, embeds and persists each one, and stops when a batch is empty', async () => {
    mockEmbedText.mockResolvedValue(new Array(768).fill(0.01));
    const { client, update, updateEq } = makeClient([
      [makeRow('tx-1', 'Coffee'), makeRow('tx-2', 'Netflix')],
      [],
    ]);

    const summary = await runBackfill({ client, batchSize: 50 });

    expect(mockEmbedText).toHaveBeenCalledTimes(2);
    expect(mockEmbedText).toHaveBeenCalledWith('Coffee', 'RETRIEVAL_DOCUMENT');
    expect(update).toHaveBeenCalledTimes(2);
    expect(updateEq).toHaveBeenCalledWith('id', 'tx-1');
    expect(updateEq).toHaveBeenCalledWith('id', 'tx-2');
    expect(summary).toEqual({ processed: 2, succeeded: 2, failed: 0 });
  });

  it('continues across multiple non-empty batches until an empty batch is returned (resumability)', async () => {
    mockEmbedText.mockResolvedValue(new Array(768).fill(0.01));
    const { client, update } = makeClient([
      [makeRow('tx-1', 'Coffee')],
      [makeRow('tx-2', 'Netflix')],
      [],
    ]);

    const summary = await runBackfill({ client, batchSize: 1 });

    expect(update).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ processed: 2, succeeded: 2, failed: 0 });
  });

  it('dry-run never writes but still advances the cursor and terminates (regression: was an infinite loop)', async () => {
    const { client, updateIds, getQueryCallCount } = makeRealisticClient([
      { id: 'tx-1', description: 'Coffee' },
      { id: 'tx-2', description: 'Netflix' },
    ]);

    const summary = await runBackfill({ client, batchSize: 50, dryRun: true });

    expect(mockEmbedText).not.toHaveBeenCalled();
    expect(updateIds).toHaveLength(0);
    expect(summary).toEqual({ processed: 2, succeeded: 0, failed: 0 });
    // Load-bearing: a cursor-less dry-run re-selects the same unwritten
    // rows forever and trips MAX_QUERY_CALLS above; a correct cursor
    // advances past every SEEN row and terminates in a couple of queries.
    expect(getQueryCallCount()).toBeLessThanOrEqual(3);
  });

  it('logs and continues past a per-row embedding failure instead of aborting the batch', async () => {
    mockEmbedText
      .mockRejectedValueOnce(new Error('provider timeout'))
      .mockResolvedValueOnce(new Array(768).fill(0.01));
    const { client, update } = makeClient([
      [makeRow('tx-1', 'Coffee'), makeRow('tx-2', 'Netflix')],
      [],
    ]);

    const summary = await runBackfill({ client, batchSize: 50 });

    expect(update).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
    expect(summary).toEqual({ processed: 2, succeeded: 1, failed: 1 });
  });

  it('advances past a permanently-failing row instead of starving higher-id rows (regression: was infinite starvation)', async () => {
    mockEmbedText.mockImplementation(async (text: string) => {
      if (text === 'BadRow') throw new Error('permanent embed failure');
      return new Array(768).fill(0.01);
    });
    const { client, updateIds, getQueryCallCount } = makeRealisticClient([
      { id: 'tx-1', description: 'BadRow' },
      { id: 'tx-2', description: 'Netflix' },
      { id: 'tx-3', description: 'Spotify' },
    ]);

    const summary = await runBackfill({ client, batchSize: 1 });

    // tx-1 fails every attempt and is never written; tx-2/tx-3 MUST still
    // be reached and persisted in this SAME run.
    expect(updateIds.sort()).toEqual(['tx-2', 'tx-3']);
    expect(summary).toEqual({ processed: 3, succeeded: 2, failed: 1 });
    expect(getQueryCallCount()).toBeLessThanOrEqual(MAX_QUERY_CALLS);
  });
});
