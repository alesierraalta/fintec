-- Hot query indexes (2/7): accounts user_id + created_at
-- Single-statement file: CREATE INDEX CONCURRENTLY cannot share the Supabase
-- CLI statement pipeline with other statements.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_user_created
  ON public.accounts(user_id, created_at DESC);
