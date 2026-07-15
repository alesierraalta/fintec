-- migrate: no-transaction
-- Migration: hybrid search infrastructure (PR1 of ai-rag-hybrid-search)
--
-- This file runs OUTSIDE a transaction (see the `no-transaction` marker
-- above, matching 202602051210_index_concurrency_and_partial.sql and
-- 202604091125_backend_optimization_phase5_trgm_gin.sql), because CREATE
-- INDEX CONCURRENTLY cannot run inside a transaction block. Every statement
-- below is independently idempotent (IF EXISTS / IF NOT EXISTS), and the
-- migration runner executes statements sequentially, stopping at the first
-- error. That means the count(embedding) precondition guard (step 2) still
-- runs — and can still abort the whole migration — before any destructive
-- statement executes; it just no longer shares a single all-or-nothing
-- transaction with those statements. If the guard raises, nothing after it
-- runs, and re-running this file after fixing the underlying data is safe
-- because every later statement is idempotent.
--
-- 1) Enables extensions required for the new retrieval RPCs.
-- 2) Guards a drop of DEAD 1536-dim objects (the original pgvector column,
--    its match_transactions RPC, and its HNSW index) behind a live
--    count(embedding) precondition check: this migration only ever ran with
--    zero rows written through the old column/RPC (no caller exists in the
--    codebase), so the guard exists purely as a safety net against
--    unexpectedly non-empty data.
-- 3) Re-adds embedding as vector(768) (gemini-embedding-001 output dims).
-- 4) Adds a Spanish, accent-insensitive full-text-search configuration
--    (es_unaccent) plus a GIN expression index — deliberately NOT a stored
--    computed tsvector column, because to_tsvector(regconfig, text) is
--    STABLE (not IMMUTABLE) in Postgres, so a computed-and-persisted
--    tsvector column driven by a named text search configuration is
--    rejected at DDL time. An expression GIN index gets the same
--    query-time behavior without that restriction.
-- 5) Reuses the existing idx_transactions_description_trgm GIN trigram
--    index (202604091125_backend_optimization_phase5_trgm_gin.sql) for the
--    trigram leg — no new trigram index is created here.
-- 6) Adds an HNSW vector_cosine_ops index on the new embedding column.
--    Both this and the FTS expression index (4) are built with CREATE
--    INDEX CONCURRENTLY IF NOT EXISTS to avoid an ACCESS EXCLUSIVE lock on
--    the live transactions table.
-- 7) Creates query_transactions: closed, parameterized filters + aggregate
--    modes (sum|count|avg|groupBy), RLS-scoped via join to accounts, no
--    dynamic SQL.
-- 8) Creates hybrid_search_transactions: 3-way weighted Reciprocal Rank
--    Fusion (vector cosine + FTS + trigram), rrf_k=50, RLS-scoped, no
--    dynamic SQL.
--
-- All money remains stored as integer minor units; retrieval RPCs are
-- read-only and never mutate transaction rows.

-- ---------------------------------------------------------------------------
-- 1) Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- 2) Guarded drop of dead 1536-dim objects
-- ---------------------------------------------------------------------------
do $$
declare
  v_embedded_count bigint;
begin
  select count(*) into v_embedded_count
  from public.transactions
  where embedding is not null;

  if v_embedded_count > 0 then
    raise exception
      'Refusing to drop transactions.embedding (vector(1536)): % row(s) have a non-null embedding. '
      'Back up/backfill this data under the new vector(768) column before re-running this migration.',
      v_embedded_count;
  end if;
end $$;

drop function if exists public.match_transactions(vector(1536), float, int, uuid);
drop index if exists public.transactions_embedding_idx;
alter table public.transactions drop column if exists embedding;

-- ---------------------------------------------------------------------------
-- 3) New vector(768) embedding column
-- ---------------------------------------------------------------------------
alter table public.transactions
add column if not exists embedding vector(768);

-- ---------------------------------------------------------------------------
-- 4) Spanish, accent-insensitive FTS configuration + expression GIN index
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'es_unaccent') then
    create text search configuration public.es_unaccent (copy = spanish);
    alter text search configuration public.es_unaccent
      alter mapping for hword, hword_part, word
      with unaccent, spanish_stem;
  end if;
end $$;

create index concurrently if not exists idx_transactions_description_fts
on public.transactions
using gin (to_tsvector('es_unaccent', coalesce(description, '') || ' ' || coalesce(note, '')));

-- ---------------------------------------------------------------------------
-- 5) Trigram leg: reuse the existing index, do not duplicate it
-- ---------------------------------------------------------------------------
-- idx_transactions_description_trgm (created in
-- 202604091125_backend_optimization_phase5_trgm_gin.sql) already covers
-- `gin (description gin_trgm_ops)` on public.transactions and already
-- supports the word-similarity operators (<%, %>) used by
-- hybrid_search_transactions' trigram leg below, so no new trigram index
-- is created here.

-- ---------------------------------------------------------------------------
-- 6) HNSW vector index (built CONCURRENTLY, see file header)
-- ---------------------------------------------------------------------------
create index concurrently if not exists idx_transactions_embedding_hnsw
on public.transactions
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- 7) query_transactions: closed parameterized filters + aggregates
-- ---------------------------------------------------------------------------
create or replace function public.query_transactions(
  p_date_from date default null,
  p_date_to date default null,
  p_amount_min bigint default null,
  p_amount_max bigint default null,
  p_category_id uuid default null,
  p_account_id uuid default null,
  p_aggregate text default 'sum',
  p_group_by_field text default null
)
returns table (
  group_key text,
  result_value numeric,
  row_count bigint
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- NULL is NOT IN (...) evaluates to NULL (falsy), so a NULL/omitted
  -- p_aggregate must be rejected explicitly or it would silently fall
  -- through to the sum branch below instead of raising.
  if p_aggregate is null or p_aggregate not in ('sum', 'count', 'avg', 'groupBy') then
    raise exception 'p_aggregate must be one of sum, count, avg, groupBy';
  end if;

  if p_aggregate = 'groupBy' then
    -- Same NULL-swallowing hazard as above: a NULL p_group_by_field must
    -- raise here, not silently reach the account-groupBy branch.
    if p_group_by_field is null or p_group_by_field not in ('category', 'account') then
      raise exception 'p_group_by_field must be one of category, account when p_aggregate = groupBy';
    end if;

    if p_group_by_field = 'category' then
      return query
      select
        c.name::text as group_key,
        sum(t.amount_base_minor)::numeric as result_value,
        count(*)::bigint as row_count
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      left join public.categories c on c.id = t.category_id
      where a.user_id = auth.uid()
        and (p_date_from is null or t.date >= p_date_from)
        and (p_date_to is null or t.date <= p_date_to)
        and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
        and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
        and (p_category_id is null or t.category_id = p_category_id)
        and (p_account_id is null or t.account_id = p_account_id)
      group by c.name
      having count(*) > 0;
      return;
    else
      return query
      select
        a.name::text as group_key,
        sum(t.amount_base_minor)::numeric as result_value,
        count(*)::bigint as row_count
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      where a.user_id = auth.uid()
        and (p_date_from is null or t.date >= p_date_from)
        and (p_date_to is null or t.date <= p_date_to)
        and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
        and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
        and (p_category_id is null or t.category_id = p_category_id)
        and (p_account_id is null or t.account_id = p_account_id)
      group by a.name
      having count(*) > 0;
      return;
    end if;
  end if;

  -- Non-groupBy aggregates: single row, no dynamic SQL — CASE branches over
  -- the closed set of supported modes.
  return query
  select
    null::text as group_key,
    case p_aggregate
      when 'sum' then coalesce(sum(t.amount_base_minor), 0)::numeric
      when 'avg' then coalesce(avg(t.amount_base_minor), 0)::numeric
      when 'count' then count(*)::numeric
      else coalesce(sum(t.amount_base_minor), 0)::numeric
    end as result_value,
    count(*)::bigint as row_count
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where a.user_id = auth.uid()
    and (p_date_from is null or t.date >= p_date_from)
    and (p_date_to is null or t.date <= p_date_to)
    and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
    and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
    and (p_category_id is null or t.category_id = p_category_id)
    and (p_account_id is null or t.account_id = p_account_id);
end;
$$;

grant execute on function public.query_transactions(
  date, date, bigint, bigint, uuid, uuid, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) hybrid_search_transactions: 3-way weighted RRF (rrf_k=50)
-- ---------------------------------------------------------------------------
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
    select id, sum(leg_score) as rrf_score
    from (
      select id, p_w_vec / (p_rrf_k + rnk) as leg_score from vector_matches
      union all
      select id, p_w_fts / (p_rrf_k + rnk) as leg_score from fts_matches
      union all
      select id, p_w_trgm / (p_rrf_k + rnk) as leg_score from trgm_matches
    ) legs
    group by id
  )
  select t.id, t.description, t.amount_base_minor, t.date, f.rrf_score as score
  from fused f
  join public.transactions t on t.id = f.id
  order by f.rrf_score desc, f.id
  limit p_match_count;
end;
$$;

grant execute on function public.hybrid_search_transactions(
  vector(768), text, int, int, float, float, float
) to authenticated;

notify pgrst, 'reload schema';
