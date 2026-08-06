-- Migration: fix ambiguous "id" column reference in hybrid_search_transactions
--
-- Root cause: public.hybrid_search_transactions (20260715120000_hybrid_search.sql)
-- is `language plpgsql` with `returns table (id uuid, description text,
-- amount_base_minor bigint, date date, score float)`. In plpgsql every
-- RETURNS TABLE column is an implicit OUT variable. The `fused` CTE
-- referenced `id` unqualified (`select id, ... group by id`), which
-- collides with the OUT variable of the same name, so Postgres cannot
-- resolve whether `id` means the PL/pgSQL variable or the CTE column and
-- raises SQLSTATE 42702 ("column reference \"id\" is ambiguous") on every
-- invocation. This RPC has therefore never worked: every call to it,
-- including in production, fails before returning a single row.
--
-- Fix: rename the colliding column inside the `fused` CTE (to `txn_id`)
-- and fully qualify every reference in the fused/select-legs subquery and
-- the final select. The `RETURNS TABLE` signature (including its `id`
-- column) is the RPC's public contract (see lib/ai/tools/resolvers.ts:254
-- reading `row.id`) and is left untouched, as is every other part of the
-- function body: the three match CTEs, the RRF weights, `rrf_k`, the
-- `limit 50` per leg, `security invoker`, and `set search_path = public`.
-- `#variable_conflict use_column` is deliberately NOT used — it is a
-- global switch that would mask future collisions in this function rather
-- than removing this one.

create or replace function public.hybrid_search_transactions(
  p_query_embedding vector(768),
  p_query_text text,
  p_match_count int default 20,
  p_rrf_k int default 50,
  p_w_vec float default 1.0,
  p_w_fts float default 1.0,
  p_w_trgm float default 0.5
)
returns table (
  id uuid,
  description text,
  amount_base_minor bigint,
  date date,
  score float
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  with vector_matches as (
    select t.id, row_number() over (order by t.embedding <=> p_query_embedding, t.id) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and t.embedding is not null
    order by t.embedding <=> p_query_embedding, t.id
    limit 50
  ),
  fts_matches as (
    select
      t.id,
      row_number() over (
        order by ts_rank(
          to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, '')),
          websearch_to_tsquery('es_unaccent', p_query_text)
        ) desc, t.id
      ) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, ''))
        @@ websearch_to_tsquery('es_unaccent', p_query_text)
    order by ts_rank(
      to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, '')),
      websearch_to_tsquery('es_unaccent', p_query_text)
    ) desc, t.id
    limit 50
  ),
  trgm_matches as (
    -- Filter and rank both use word_similarity (via the <% threshold
    -- operator) instead of the default trigram % operator (which is
    -- backed by similarity(), a different metric), so the recall set and
    -- its ranking agree on the same similarity function.
    select t.id, row_number() over (order by word_similarity(p_query_text, t.description) desc, t.id) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and p_query_text <% t.description
    order by word_similarity(p_query_text, t.description) desc, t.id
    limit 50
  ),
  fused as (
    select legs.txn_id, sum(legs.leg_score) as rrf_score
    from (
      select vm.id as txn_id, p_w_vec / (p_rrf_k + vm.rnk) as leg_score from vector_matches vm
      union all
      select fm.id as txn_id, p_w_fts / (p_rrf_k + fm.rnk) as leg_score from fts_matches fm
      union all
      select tm.id as txn_id, p_w_trgm / (p_rrf_k + tm.rnk) as leg_score from trgm_matches tm
    ) legs
    group by legs.txn_id
  )
  select t.id, t.description, t.amount_base_minor, t.date, f.rrf_score as score
  from fused f
  join public.transactions t on t.id = f.txn_id
  order by f.rrf_score desc, f.txn_id
  limit p_match_count;
end;
$$;
grant execute on function public.hybrid_search_transactions(
  vector(768), text, int, int, float, float, float
) to authenticated;
notify pgrst, 'reload schema';
