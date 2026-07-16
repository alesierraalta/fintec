#!/usr/bin/env -S npx tsx
/**
 * Backfill script for `transactions.embedding` (PR3 of ai-rag-hybrid-search).
 *
 * Populates the `vector(768)` `embedding` column for any transaction row
 * left with a NULL embedding — either because it predates the write-path
 * hook (`repositories/supabase/transactions-repository-impl.ts`) or because
 * a transient provider error skipped it there (the write-path hook is
 * best-effort and never blocks a write on embedding failure).
 *
 * Design notes (see sdd/ai-rag-hybrid-search/design, "Write path" +
 * "Migration / Rollout"):
 * - Chunked: processes rows in bounded batches (default 50) instead of
 *   loading the whole table into memory.
 * - Keyset pagination: `WHERE embedding IS NULL AND id > lastProcessedId
 *   ORDER BY id LIMIT n`, advancing the cursor past every row SEEN —
 *   succeeded, failed, or (in `--dry-run`) never written. A plain
 *   `WHERE embedding IS NULL` re-query without a cursor is NOT resumable
 *   WITHIN a single run: dry-run never writes (same batch repeats forever),
 *   and a permanently-failing row is always re-selected first, starving
 *   every higher-id row. Resumability ACROSS runs is unaffected: a failed
 *   row is retried on the NEXT run, once the cursor resets.
 * - Renormalized: `embedText()` already renormalizes to unit length
 *   (RETRIEVAL_DOCUMENT task type) before returning, so the vector persisted
 *   here is unit-length, matching the write-path hook's behavior.
 * - Dry-run: `--dry-run` reports how many rows WOULD be processed without
 *   calling the embedding provider or writing to the database.
 * - Per-row failures are logged and skipped, never abort the whole batch —
 *   a permanently un-embeddable row (or a transient error) should not block
 *   every other row behind it.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts [--dry-run] [--batch-size=50]
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedText } from '@/lib/ai/rag/embeddings';

export interface BackfillRow {
  id: string;
  description: string | null;
  note: string | null;
}

export interface BackfillSummary {
  processed: number;
  succeeded: number;
  failed: number;
}

export interface RunBackfillOptions {
  client: SupabaseClient;
  /** Rows fetched per query iteration. Default 50. */
  batchSize?: number;
  /** When true, only counts rows that would be processed — no writes. */
  dryRun?: boolean;
}

/**
 * Splits `items` into consecutive chunks of at most `size` elements each.
 * Pure, side-effect-free — used to keep in-flight embedding work bounded.
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('chunkArray: size must be a positive integer');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildEmbeddingText(row: BackfillRow): string {
  return [row.description, row.note].filter(Boolean).join(' ').trim();
}

async function fetchNullEmbeddingBatch(
  client: SupabaseClient,
  batchSize: number,
  afterId: string | undefined
): Promise<BackfillRow[]> {
  let query = (client as any)
    .from('transactions')
    .select('id, description, note')
    .is('embedding', null);
  if (afterId !== undefined) query = query.gt('id', afterId);

  const { data, error } = await query
    .order('id', { ascending: true })
    .limit(batchSize);

  if (error) {
    throw new Error(`Failed to fetch NULL-embedding batch: ${error.message}`);
  }

  return (data ?? []) as BackfillRow[];
}

async function persistEmbedding(
  client: SupabaseClient,
  id: string,
  embedding: number[]
): Promise<void> {
  const { error } = await (client as any)
    .from('transactions')
    .update({ embedding })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to persist embedding for ${id}: ${error.message}`);
  }
}

/**
 * Runs the backfill: repeatedly fetches keyset-paginated NULL-embedding
 * batches (`id > lastProcessedId`) and embeds+persists each row, until an
 * empty batch is returned. The cursor advances past every row SEEN, so a
 * dry-run or a permanently-failing row can't stall the loop. Never throws
 * on a per-row failure — logs and continues.
 */
export async function runBackfill(
  options: RunBackfillOptions
): Promise<BackfillSummary> {
  const { client, batchSize = 50, dryRun = false } = options;

  const summary: BackfillSummary = { processed: 0, succeeded: 0, failed: 0 };
  let lastProcessedId: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchNullEmbeddingBatch(
      client,
      batchSize,
      lastProcessedId
    );
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      summary.processed += 1;
      // Advance regardless of outcome (see keyset pagination note above).
      lastProcessedId = row.id;

      if (dryRun) {
        continue;
      }

      const text = buildEmbeddingText(row);
      if (!text) {
        console.error(
          `[backfill-embeddings] Skipping ${row.id}: no description/note text to embed.`
        );
        summary.failed += 1;
        continue;
      }

      try {
        const embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');
        await persistEmbedding(client, row.id, embedding);
        summary.succeeded += 1;
      } catch (error) {
        console.error(
          `[backfill-embeddings] Failed to backfill ${row.id}:`,
          error instanceof Error ? error.message : error
        );
        summary.failed += 1;
      }
    }

    console.log(
      `[backfill-embeddings] Batch complete — processed ${summary.processed} so far (${summary.succeeded} succeeded, ${summary.failed} failed).`
    );
  }

  return summary;
}

function parseArgs(argv: string[]): { dryRun: boolean; batchSize: number } {
  const dryRun = argv.includes('--dry-run');
  const batchSizeArg = argv.find((arg) => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg
    ? parseInt(batchSizeArg.split('=')[1], 10)
    : 50;
  return { dryRun, batchSize: Number.isFinite(batchSize) ? batchSize : 50 };
}

async function main(): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run the backfill script.'
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { dryRun, batchSize } = parseArgs(process.argv.slice(2));

  console.log(
    `[backfill-embeddings] Starting${dryRun ? ' (dry-run)' : ''} — batchSize=${batchSize}`
  );
  const summary = await runBackfill({ client, batchSize, dryRun });
  console.log('[backfill-embeddings] Done:', summary);
}

// Only auto-run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((error) => {
    console.error('[backfill-embeddings] Fatal error:', error);
    process.exitCode = 1;
  });
}
