-- Issue #51: the hot `getLatestExchangeRateSnapshot()` lookup runs
-- `SELECT ... FROM exchange_rates ORDER BY created_at DESC LIMIT 1` (no
-- filters) on every GET /api/bcv-rates and GET /api/binance-rates call and
-- was falling back to a full sequential scan (the only existing index on the
-- table is idx_exchange_rates_source, on `source`).
--
-- Minimal index aligned to that query: btree on created_at DESC so the
-- ORDER BY DESC LIMIT 1 becomes an index scan. No speculative composite or
-- partial index: the hot query has no WHERE predicate.
--
-- Single-statement file: CREATE INDEX CONCURRENTLY cannot share the Supabase
-- CLI statement pipeline with other statements.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exchange_rates_created_at
  ON public.exchange_rates (created_at DESC);
