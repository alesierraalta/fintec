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
 * - Resumable: each iteration re-queries `WHERE embedding IS NULL`, so
 *   already-backfilled rows never reappear — re-running the script after an
 *   interruption (or a per-row failure) simply picks up where it left off,
 *   with no separate cursor/offset bookkeeping required.
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
  batchSize: number
): Promise<BackfillRow[]> {
  const { data, error } = await (client as any)
    .from('transactions')
    .select('id, description, note')
    .is('embedding', null)
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
 * Runs the backfill: repeatedly fetches batches of NULL-embedding
 * transaction rows and embeds+persists each one, until an empty batch is
 * returned. Never throws on a per-row failure — logs and continues.
 */
export async function runBackfill(
  options: RunBackfillOptions
): Promise<BackfillSummary> {
  const { client, batchSize = 50, dryRun = false } = options;

  const summary: BackfillSummary = { processed: 0, succeeded: 0, failed: 0 };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchNullEmbeddingBatch(client, batchSize);
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      summary.processed += 1;

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
