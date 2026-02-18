-- migrate: no-transaction
-- Recreate indexes concurrently and tighten embedding index selectivity

DROP INDEX CONCURRENTLY IF EXISTS public.idx_users_tier;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tier ON public.users(tier);

DROP INDEX CONCURRENTLY IF EXISTS public.transactions_embedding_idx;
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_embedding_idx
    ON public.transactions
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
