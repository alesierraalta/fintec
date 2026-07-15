/**
 * Migration coverage + RPC contract tests for the PR1 slice of
 * ai-rag-hybrid-search:
 *   - `supabase/migrations/20260715120000_hybrid_search.sql` (extensions,
 *     guarded drop of dead 1536-dim objects, new vector(768) column,
 *     es_unaccent FTS config, all indexes built CONCURRENTLY under the
 *     repo's `-- migrate: no-transaction` convention, `query_transactions`
 *     and `hybrid_search_transactions` RPCs)
 *   - The RPC param/return shapes both tools in PR3 will call against.
 *
 * Per design's "RPC contract shape" testing layer: assert the migration text
 * for the SQL contract, and assert `.rpc()` call/param shape + row ordering
 * against a mocked Supabase client (no live DB dependency in this layer).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');

function findHybridSearchMigrationPath(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) =>
    f.endsWith('_hybrid_search.sql')
  );
  if (files.length === 0) {
    throw new Error(
      'Expected a supabase/migrations/<timestamp>_hybrid_search.sql migration file, but none was found.'
    );
  }
  return join(MIGRATIONS_DIR, files[0]);
}

function readMigration(): string {
  return readFileSync(findHybridSearchMigrationPath(), 'utf8');
}

describe('hybrid_search migration (SQL contract)', () => {
  it('exists at supabase/migrations/<timestamp>_hybrid_search.sql', () => {
    expect(() => findHybridSearchMigrationPath()).not.toThrow();
  });

  it('enables the vector, pg_trgm, and unaccent extensions', () => {
    const sql = readMigration();
    expect(sql).toMatch(/create extension if not exists vector/i);
    expect(sql).toMatch(/create extension if not exists pg_trgm/i);
    expect(sql).toMatch(/create extension if not exists unaccent/i);
  });

  it('guards the drop of dead 1536-dim objects behind a live count(embedding) precondition', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /select count\(\*\)\s+into\s+\w+\s+from\s+(public\.)?transactions\s+where\s+embedding\s+is not null/i
    );
    expect(sql).toMatch(/raise exception/i);
  });

  it('drops the dead vector(1536) column, match_transactions function, and old HNSW index', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /drop function if exists (public\.)?match_transactions/i
    );
    expect(sql).toMatch(
      /drop index if exists (public\.)?transactions_embedding_idx/i
    );
    expect(sql).toMatch(
      /alter table (public\.)?transactions\s+drop column if exists embedding/i
    );
  });

  it('adds the new vector(768) embedding column', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /alter table (public\.)?transactions\s+add column if not exists embedding vector\(768\)/i
    );
  });

  it('creates the es_unaccent Spanish full-text search configuration (unaccent + spanish_stem)', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /create text search configuration (public\.)?es_unaccent/i
    );
    expect(sql).toMatch(/unaccent/i);
    expect(sql).toMatch(/spanish_stem/i);
  });

  it('falls back to an expression GIN index instead of a GENERATED tsvector column (IMMUTABLE limitation)', () => {
    const sql = readMigration();
    // to_tsvector(regconfig, text) is STABLE, not IMMUTABLE, so a
    // GENERATED ALWAYS AS ... STORED column is rejected by Postgres.
    expect(sql).not.toMatch(/generated always as/i);
    expect(sql).toMatch(/using gin\s*\(\s*to_tsvector\(\s*'es_unaccent'/i);
  });

  it('runs under the no-transaction convention and builds the FTS + HNSW indexes CONCURRENTLY (no ACCESS EXCLUSIVE lock on a live table)', () => {
    const sql = readMigration();
    expect(sql).toMatch(/^-- migrate: no-transaction/i);
    expect(sql).toMatch(
      /create index concurrently if not exists[^;]*using gin\s*\(\s*to_tsvector\(\s*'es_unaccent'/i
    );
    expect(sql).toMatch(
      /create index concurrently if not exists[^;]*using hnsw\s*\(\s*embedding\s+vector_cosine_ops\)/i
    );
    expect(sql).toMatch(/m\s*=\s*16/i);
    expect(sql).toMatch(/ef_construction\s*=\s*64/i);
    // No plain (non-concurrent) CREATE INDEX remains on the live table.
    expect(sql).not.toMatch(/create index if not exists/i);
  });

  it('reuses the existing idx_transactions_description_trgm index (202604091125) instead of creating a duplicate trigram index', () => {
    const sql = readMigration();
    expect(sql).toMatch(/idx_transactions_description_trgm\b/i);
    expect(sql).not.toMatch(/idx_transactions_description_trgm_search/i);
  });

  it('creates query_transactions with closed parameterized filters, aggregate modes, and RLS scoping', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /create or replace function public\.query_transactions/i
    );
    expect(sql).toMatch(/p_aggregate/i);
    expect(sql).toMatch(/p_group_by_field/i);
    expect(sql).toMatch(/a\.user_id\s*=\s*auth\.uid\(\)/i);
    // No dynamic SQL.
    expect(sql).not.toMatch(/execute\s+format/i);
    expect(sql).not.toMatch(/execute\s+'/i);
  });

  it('rejects a NULL/omitted p_aggregate instead of silently falling through to sum (NULL NOT IN is NULL, not true)', () => {
    const sql = readMigration();
    // `p_aggregate not in (...)` alone is NULL-swallowed: a NULL p_aggregate
    // must be checked explicitly or the guard never raises for it.
    expect(sql).toMatch(
      /if\s+p_aggregate\s+is\s+null\s+or\s+p_aggregate\s+not\s+in\s*\(/i
    );
  });

  it('rejects a NULL/omitted p_group_by_field when p_aggregate=groupBy instead of silently grouping by account', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /if\s+p_group_by_field\s+is\s+null\s+or\s+p_group_by_field\s+not\s+in\s*\(/i
    );
  });

  it('creates hybrid_search_transactions fusing vector + FTS + trigram via weighted RRF (rrf_k=50)', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /create or replace function public\.hybrid_search_transactions/i
    );
    expect(sql).toMatch(/rrf_k/i);
    expect(sql).toMatch(/50/);
    expect(sql).toMatch(/word_similarity/i);
    expect(sql).toMatch(/to_tsvector\('es_unaccent'/i);
    expect(sql).toMatch(/<=>/); // pgvector cosine distance operator
    expect(sql).not.toMatch(/execute\s+format/i);
    expect(sql).not.toMatch(/execute\s+'/i);
  });

  it('breaks ties deterministically on id in every ranked leg and the final fused ordering', () => {
    const sql = readMigration();
    expect(sql).toMatch(/order by t\.embedding <=> p_query_embedding, t\.id/i);
    expect(sql).toMatch(/\) desc, t\.id\s*\)\s*as rnk/i);
    expect(sql).toMatch(/order by f\.rrf_score desc, f\.id/i);
  });

  it('uses the word-similarity threshold operator for the trigram leg filter, consistent with its word_similarity ranking', () => {
    const sql = readMigration();
    expect(sql).toMatch(/p_query_text\s+<%\s+t\.description/i);
    expect(sql).not.toMatch(/t\.description\s+%\s+p_query_text/i);
  });

  it('grants execute on both RPCs to authenticated and reloads the PostgREST schema cache', () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /grant execute on function public\.query_transactions/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.hybrid_search_transactions/i
    );
    expect(sql).toMatch(/notify pgrst, 'reload schema'/i);
  });
});

describe('RPC contract shapes (mocked .rpc, params/ordering)', () => {
  function createMockClient(rpc: jest.Mock) {
    return { rpc } as any;
  }

  it('query_transactions: sum aggregate accepts the closed filter param shape and returns rows as-is', async () => {
    const rows = [{ group_key: null, result_value: 12345, row_count: 3 }];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    const client = createMockClient(rpc);

    const params = {
      p_date_from: '2026-06-01',
      p_date_to: '2026-06-30',
      p_amount_min: null,
      p_amount_max: null,
      p_category_id: 'cat-1',
      p_account_id: null,
      p_aggregate: 'sum',
      p_group_by_field: null,
    };

    const { data, error } = await client.rpc('query_transactions', params);

    expect(rpc).toHaveBeenCalledWith('query_transactions', params);
    expect(error).toBeNull();
    expect(data).toEqual(rows);
  });

  it('query_transactions: groupBy mode returns one row per non-empty group', async () => {
    const rows = [
      { group_key: 'food', result_value: 5000, row_count: 4 },
      { group_key: 'transport', result_value: 2000, row_count: 2 },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    const client = createMockClient(rpc);

    const { data } = await client.rpc('query_transactions', {
      p_aggregate: 'groupBy',
      p_group_by_field: 'category',
    });

    expect(data).toHaveLength(2);
    expect(data.every((row: { row_count: number }) => row.row_count > 0)).toBe(
      true
    );
  });

  it('query_transactions: no matching rows returns an empty/zero result, not an error', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ group_key: null, result_value: 0, row_count: 0 }],
      error: null,
    });
    const client = createMockClient(rpc);

    const { data, error } = await client.rpc('query_transactions', {
      p_aggregate: 'sum',
      p_category_id: 'nonexistent-category',
    });

    expect(error).toBeNull();
    expect(data[0].row_count).toBe(0);
  });

  it('hybrid_search_transactions: accepts the 3-way weighted RRF param shape (rrf_k=50) and returns rows ranked by score', async () => {
    const rows = [
      {
        id: 'tx-1',
        description: 'Café Central',
        amount_base_minor: 1500,
        date: '2026-06-10',
        score: 0.9,
      },
      {
        id: 'tx-2',
        description: 'Netflix',
        amount_base_minor: 999,
        date: '2026-06-05',
        score: 0.7,
      },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    const client = createMockClient(rpc);

    const params = {
      p_query_embedding: new Array(768).fill(0.01),
      p_query_text: 'cafe',
      p_match_count: 20,
      p_rrf_k: 50,
      p_w_vec: 1.0,
      p_w_fts: 1.0,
      p_w_trgm: 0.5,
    };

    const { data } = await client.rpc('hybrid_search_transactions', params);

    expect(rpc).toHaveBeenCalledWith(
      'hybrid_search_transactions',
      expect.objectContaining({
        p_rrf_k: 50,
        p_query_embedding: expect.any(Array),
      })
    );
    expect(params.p_query_embedding).toHaveLength(768);
    expect(data[0].score).toBeGreaterThan(data[1].score);
  });

  it('hybrid_search_transactions: empty corpus returns an empty result set without error', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    const client = createMockClient(rpc);

    const { data, error } = await client.rpc('hybrid_search_transactions', {
      p_query_embedding: new Array(768).fill(0),
      p_query_text: 'anything',
      p_match_count: 20,
      p_rrf_k: 50,
      p_w_vec: 1.0,
      p_w_fts: 1.0,
      p_w_trgm: 0.5,
    });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
