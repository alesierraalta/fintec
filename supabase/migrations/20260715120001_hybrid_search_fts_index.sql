-- Hybrid search companion (1/2): Spanish accent-insensitive FTS expression
-- GIN index. Single-statement file because CREATE INDEX CONCURRENTLY cannot
-- share the Supabase CLI statement pipeline with other statements.
-- Depends on 20260715120000_hybrid_search.sql (es_unaccent configuration).
create index concurrently if not exists idx_transactions_description_fts
on public.transactions
using gin (to_tsvector('es_unaccent', coalesce(description, '') || ' ' || coalesce(note, '')));
