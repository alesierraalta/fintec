-- Migration: Add indexes for hot query patterns (1/7: transactions)
-- Purpose: Optimize dashboard queries filtering by ownership + created_at.
--
-- NOTE: this file originally indexed user_id on transactions/transfers, but
-- neither table has that column (ownership is derived through accounts via
-- RLS), so the migration could never apply. Rewritten against the real schema.
--
-- NOTE: the Supabase CLI executes a migration's statements in a pipeline and
-- CREATE INDEX CONCURRENTLY cannot run there except as the first statement,
-- so each concurrent index lives in its own migration file (suffixes 1-6).

-- Transactions: account_id + created_at (most queried table)
-- Covers: dashboard transaction list, monthly reports, date range queries
-- (queries filter by the user's account ids, not by a user_id column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_account_created
  ON public.transactions(account_id, created_at DESC);
