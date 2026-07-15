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

  it('does not call embedText or update in dry-run mode, only reports counts', async () => {
    const { client, update } = makeClient([
      [makeRow('tx-1', 'Coffee'), makeRow('tx-2', 'Netflix')],
      [],
    ]);

    const summary = await runBackfill({ client, batchSize: 50, dryRun: true });

    expect(mockEmbedText).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(summary).toEqual({ processed: 2, succeeded: 0, failed: 0 });
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
});
