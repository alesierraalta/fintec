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
 * `query_transactions` / `hybrid_search_transactions` (resolvers.ts:188,
 * :238) are `security invoker` RPCs filtering on `auth.uid()`. This suite
 * exists to prove cross-user isolation using a REAL GoTrue-signed-in user
 * client — see the first test below for the documented false-green trap
 * this guards against.
 */
describe('cross-user RLS enforcement (query_transactions / hybrid_search_transactions)', () => {
  const serviceClient = createServiceRoleClient();
  let userAId: string;
  let userBId: string;
  let userATransactionIds: string[];
  let userBTransactionIds: string[];

  beforeAll(async () => {
    setRagTransport(createFixtureRagTransport());
    const seedA = await seedEvalDataset(serviceClient, { userKey: 'rls-a' });
    const seedB = await seedEvalDataset(serviceClient, { userKey: 'rls-b' });
    userAId = seedA.userId;
    userBId = seedB.userId;
    userATransactionIds = seedA.transactionIds;
    userBTransactionIds = seedB.transactionIds;
  });

  afterAll(async () => {
    setRagTransport();
    await teardownEvalDataset(serviceClient, userAId);
    await teardownEvalDataset(serviceClient, userBId);
  });

  it('RLS FALSE-GREEN GUARD: a service-role client bypasses RLS entirely — auth.uid() is null, so query_transactions returns nothing for EVERY user, not just the "wrong" one. A naive "user B sees zero rows" assertion built on THIS client would pass without proving cross-user isolation. Every assertion below MUST use createUserSessionClient (a real signed-in user), never the service-role client.', async () => {
    const { data, error } = await serviceClient.rpc('query_transactions', {
      p_aggregate: 'count',
    });
    expect(error).toBeNull();
    const rowCount = Number((data ?? [])[0]?.result_value ?? 0);
    // Documents the trap: this is 0 regardless of who owns the seeded
    // data, because auth.uid() is null under a service-role session.
    expect(rowCount).toBe(0);
  });

  it('user A (real signed-in session) sees only user A\'s own transaction count via query_transactions, never user B\'s', async () => {
    const clientA = await createUserSessionClient(
      fixtureEmail('rls-a'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientA.rpc('query_transactions', {
      p_aggregate: 'count',
    });
    expect(error).toBeNull();
    const rowCount = Number((data ?? [])[0]?.result_value ?? 0);
    expect(rowCount).toBe(userATransactionIds.length);
    expect(rowCount).not.toBe(userBTransactionIds.length + userATransactionIds.length);
  });

  it('hybrid_search_transactions no longer errors (fixed by 20260806120000_fix_hybrid_search_ambiguous_id.sql — see tests/db/hybrid-search-rpc.test.ts for full end-to-end coverage of this RPC, including its cross-user isolation)', async () => {
    const clientB = await createUserSessionClient(
      fixtureEmail('rls-b'),
      EVAL_FIXTURE_PASSWORD
    );

    const probeEmbedding = Array.from({ length: 768 }, () => 0.01);
    const { error } = await clientB.rpc('hybrid_search_transactions', {
      p_query_embedding: probeEmbedding,
      p_query_text: 'grocery salary rent apartment',
      p_match_count: 50,
    });

    expect(error).toBeNull();
  });
});
