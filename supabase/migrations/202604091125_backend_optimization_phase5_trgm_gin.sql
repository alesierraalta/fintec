-- Phase 5: Database Indexing / DB Optimization
-- Purpose: Enable trigram search for fast ILIKE queries on descriptions and names,
-- and add high-cardinality composite indexes for transaction lists.
--
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- The Supabase migration runner handles files with "concurrently" naturally.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text search optimizations for Transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_description_trgm
  ON public.transactions
  USING gin (description gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_note_trgm
  ON public.transactions
  USING gin (note gin_trgm_ops);

-- Text search optimizations for Categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_trgm
  ON public.categories
  USING gin (name gin_trgm_ops);

-- Composite query index for the most common Transaction list pattern
-- (Filtering by account, ordering by date and creation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_account_date_created
  ON public.transactions(account_id, date DESC, created_at DESC);

-- Composite index for Category listing (Active + Default/User)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_user_active_default
  ON public.categories(user_id, active, is_default)
  WHERE deleted_at IS NULL;

-- Fresh statistics for the planner
ANALYZE public.transactions;
ANALYZE public.categories;
