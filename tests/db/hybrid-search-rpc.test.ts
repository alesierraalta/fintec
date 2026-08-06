import { setRagTransport } from '@/lib/ai/rag/transport';
import {
  seedEvalDataset,
  EVAL_FIXTURE_PASSWORD,
  fixtureEmail,
} from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import {
  createServiceRoleClient,
  createUserSessionClient,
} from './support/auth-client';
import { createFixtureRagTransport } from './support/fixture-transport';

/**
 * Proves `public.hybrid_search_transactions` (fixed by
 * supabase/migrations/20260806120000_fix_hybrid_search_ambiguous_id.sql,
 * see also supabase/schemas/baseline.sql) works end to end against the
 * local Supabase stack: it must not error with SQLSTATE 42702 ("column
 * reference \"id\" is ambiguous") anymore, must return the seeded golden
 * transactions, and must remain RLS-scoped per user.
 *
 * Uses a REAL GoTrue-signed-in user client (`createUserSessionClient`),
 * never the service-role client — `hybrid_search_transactions` is
 * `security invoker` and filters on `auth.uid()`, which is NULL under a
 * service-role session. A service-role call would return empty rows
 * regardless of the fix and would be a false green.
 */
describe('hybrid_search_transactions RPC (end to end)', () => {
  let userAId: string;
  let userBId: string;
  let userATransactionIds: string[];

  beforeAll(async () => {
    setRagTransport(createFixtureRagTransport());
    const serviceClient = createServiceRoleClient();
    const seedA = await seedEvalDataset(serviceClient, { userKey: 'hybrid-a' });
    const seedB = await seedEvalDataset(serviceClient, { userKey: 'hybrid-b' });
    userAId = seedA.userId;
    userBId = seedB.userId;
    userATransactionIds = seedA.transactionIds;
  });

  afterAll(async () => {
    setRagTransport();
    const serviceClient = createServiceRoleClient();
    await teardownEvalDataset(serviceClient, userAId);
    await teardownEvalDataset(serviceClient, userBId);
  });

  it('returns matching rows with the expected shape, without erroring', async () => {
    const clientA = await createUserSessionClient(
      fixtureEmail('hybrid-a'),
      EVAL_FIXTURE_PASSWORD
    );

    // The fixture transport derives a deterministic embedding from the
    // input text (tests/db/support/fixture-transport.ts), so an embedding
    // seeded from the same golden description word similarity is enough
    // to also match on the trigram/FTS legs even with an unrelated probe
    // vector; the important assertion is that the call succeeds and
    // returns rows shaped correctly.
    const probeEmbedding = Array.from({ length: 768 }, () => 0.01);
    const { data, error } = await clientA.rpc('hybrid_search_transactions', {
      p_query_embedding: probeEmbedding,
      p_query_text: 'grocery salary rent apartment',
      p_match_count: 20,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).length).toBeGreaterThan(0);

    const row = (data ?? [])[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('description');
    expect(row).toHaveProperty('amount_base_minor');
    expect(row).toHaveProperty('date');
    expect(row).toHaveProperty('score');
    expect(typeof row.id).toBe('string');
    expect(typeof row.description).toBe('string');
    expect(typeof row.amount_base_minor).toBe('number');
    expect(typeof row.score).toBe('number');

    const returnedIds = (data ?? []).map((r: { id: string }) => r.id);
    for (const id of returnedIds) {
      expect(userATransactionIds).toContain(id);
    }
  });

  it("never returns another user's transactions (cross-user isolation)", async () => {
    const clientB = await createUserSessionClient(
      fixtureEmail('hybrid-b'),
      EVAL_FIXTURE_PASSWORD
    );

    const probeEmbedding = Array.from({ length: 768 }, () => 0.01);
    const { data, error } = await clientB.rpc('hybrid_search_transactions', {
      p_query_embedding: probeEmbedding,
      p_query_text: 'grocery salary rent apartment',
      p_match_count: 20,
    });

    expect(error).toBeNull();
    const returnedIds = (data ?? []).map((r: { id: string }) => r.id);
    for (const id of returnedIds) {
      expect(userATransactionIds).not.toContain(id);
    }
  });
});
