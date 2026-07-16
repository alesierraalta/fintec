-- Hybrid search companion (2/2): HNSW cosine index on the 768-dim embedding
-- column. Single-statement file (same CLI pipeline limitation as 1/2).
-- Depends on 20260715120000_hybrid_search.sql (embedding vector(768) column).
create index concurrently if not exists idx_transactions_embedding_hnsw
on public.transactions
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);
