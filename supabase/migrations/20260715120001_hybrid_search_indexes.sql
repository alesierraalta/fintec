-- Companion migration to 20260715120000_hybrid_search.sql.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so these
-- two index builds on the live public.transactions table are split out of
-- the preceding migration (which needs its own transaction for the guarded
-- drop/column-add/function DDL). This avoids an ACCESS EXCLUSIVE lock on
-- transactions for the trigram and HNSW index builds. Per repo convention
-- (see 202604091125_backend_optimization_phase5_trgm_gin.sql,
-- 202604081614_backend_resource_optimization_indexes.sql), no explicit
-- BEGIN/COMMIT is used here; the Supabase migration runner runs files
-- containing CONCURRENTLY statements outside a transaction. Both statements
-- are idempotent (IF NOT EXISTS) so re-running this file is safe.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_description_trgm_search
  ON public.transactions
  USING gin (description gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_embedding_hnsw
  ON public.transactions
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
