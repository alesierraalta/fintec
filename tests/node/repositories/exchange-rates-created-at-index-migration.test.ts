import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Issue #51: the hot `getLatestExchangeRateSnapshot()` lookup runs
 * `SELECT ... FROM exchange_rates ORDER BY created_at DESC LIMIT 1` on every
 * GET /api/bcv-rates and GET /api/binance-rates call and was falling back to
 * a full sequential scan (the only existing index was on `source`).
 *
 * The forward migration adds the minimal btree index on `created_at DESC`
 * aligned to that query (no filters, single ORDER BY column). These tests
 * catch: the migration dropping/renaming the index, the index column drifting
 * away from the query's sort column, or baseline.sql and the migration
 * falling out of sync.
 */
describe('exchange_rates created_at index (issue #51)', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260810170000_add_exchange_rates_created_at_index.sql'
    ),
    'utf8'
  );
  const baseline = readFileSync(
    join(process.cwd(), 'supabase/schemas/baseline.sql'),
    'utf8'
  );
  const repository = readFileSync(
    join(
      process.cwd(),
      'repositories/supabase/rates-history-repository-impl.ts'
    ),
    'utf8'
  );

  it('defines the created_at index in the migration', () => {
    expect(migration).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exchange_rates_created_at'
    );
    expect(migration).toContain('ON public.exchange_rates (created_at DESC);');
  });

  it('keeps the index a single CONCURRENTLY statement (Supabase-safe deployment)', () => {
    expect(migration).not.toContain('BEGIN;');
    expect(migration).not.toContain('COMMIT;');
  });

  it('synchronizes the baseline schema with the migration', () => {
    expect(baseline).toContain(
      'CREATE INDEX "idx_exchange_rates_created_at" ON "public"."exchange_rates" USING "btree" ("created_at" DESC);'
    );
  });

  it('aligns the index with the actual getLatestExchangeRateSnapshot query', () => {
    expect(repository).toContain(".order('created_at', { ascending: false })");
    expect(repository).toContain('.limit(1)');
    // The hot query has no filters, so no composite/partial index is needed.
    const snapshotQuery = repository.slice(
      repository.indexOf('getLatestExchangeRateSnapshot'),
      repository.indexOf('getLatestBCVRate')
    );
    expect(snapshotQuery).not.toContain('.eq(');
    expect(snapshotQuery).not.toContain('.gte(');
    expect(snapshotQuery).not.toContain('.lte(');
  });
});
