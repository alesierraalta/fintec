-- Hot query indexes (5/7): budgets user_id + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budgets_user_created
  ON public.budgets(user_id, created_at DESC);
