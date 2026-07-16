-- Hot query indexes (6/7): goals user_id + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_created
  ON public.goals(user_id, created_at DESC);
