-- Migration: Add indexes for hot query patterns
-- Purpose: Optimize dashboard queries that filter by user_id + created_at
-- These are the most common query patterns identified in Phase 1 analysis.

-- Transactions: user_id + created_at (most queried table)
-- Covers: dashboard transaction list, monthly reports, date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created
  ON public.transactions(user_id, created_at DESC);

-- Accounts: user_id + created_at
-- Covers: account list sorted by creation, account activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_user_created
  ON public.accounts(user_id, created_at DESC);

-- Transfers: user_id + created_at
-- Covers: transfer history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_user_created
  ON public.transfers(user_id, created_at DESC);

-- Budgets: user_id + created_at
-- Covers: budget list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_created
  ON public.budgets(user_id, created_at DESC);

-- Goals: user_id + created_at
-- Covers: goal list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_created
  ON public.goals(user_id, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE public.transactions;
ANALYZE public.accounts;
ANALYZE public.transfers;
ANALYZE public.budgets;
ANALYZE public.goals;
