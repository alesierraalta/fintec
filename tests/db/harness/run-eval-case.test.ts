/**
 * ai-eval-harness req. 1, 2: `runEvalCase(case, deps)` binds
 * `buildChatTools`/`streamWithFallback`-equivalent execution and the eval
 * user's authenticated Supabase client into a single `EvalRunRecord`
 * producer, deterministic across two runs with the fixture transport
 * (setRagTransport) — no live network call.
 */
import { setRagTransport } from '@/lib/ai/rag/transport';
import { createFixtureRagTransport } from '../support/fixture-transport';
import {
  createServiceRoleClient,
  createUserSessionClient,
} from '../support/auth-client';
import {
  seedEvalDataset,
  fixtureEmail,
  EVAL_FIXTURE_PASSWORD,
} from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import { createServerAppRepository } from '@/repositories/factory';
import { runEvalCase } from '@/evals/execution/run-eval-case';
import { resolveGoldenCase } from '@/evals/golden/resolve';
import { GOLDEN_CASES } from '@/evals/golden/dataset';

describe('runEvalCase — deterministic EvalRunRecord over the fixture transport', () => {
  const userKey = 'run-eval-case';
  let userId: string;

  beforeAll(async () => {
    setRagTransport(createFixtureRagTransport());
    const serviceClient = createServiceRoleClient();
    const seeded = await seedEvalDataset(serviceClient, { userKey });
    userId = seeded.userId;
  });

  afterAll(async () => {
    setRagTransport();
    const serviceClient = createServiceRoleClient();
    await teardownEvalDataset(serviceClient, userId);
  });

  it('returns the same EvalRunRecord shape and retrieved rows across two runs', async () => {
    const userClient = await createUserSessionClient(
      fixtureEmail(userKey),
      EVAL_FIXTURE_PASSWORD
    );
    const serviceClient = createServiceRoleClient();
    const seeded = await seedEvalDataset(serviceClient, { userKey });

    const retrievalCase = GOLDEN_CASES.find(
      (c) => c.caseId === 'retrieval-groceries'
    )!;
    const resolvedCase = resolveGoldenCase(retrievalCase, seeded.goldenLabels);

    const repository = createServerAppRepository({ supabase: userClient });
    const deps = {
      userId,
      threadId: 'thread-eval-1',
      repository,
      supabase: userClient,
      baseCurrencyCode: 'USD',
    };

    const first = await runEvalCase(resolvedCase, deps);
    const second = await runEvalCase(resolvedCase, deps);

    expect(first.caseId).toBe('retrieval-groceries');
    expect(first.toolCalls).toEqual([
      { toolName: 'searchTransactions', args: resolvedCase.toolArgs },
    ]);
    expect(first.retrieved.length).toBeGreaterThan(0);
    expect(first.retrieved).toEqual(second.retrieved);
    expect(first.answerText).toEqual(second.answerText);
    expect(
      first.retrieved.some((row) => row.id === seeded.transactionIds[0])
    ).toBe(true);
  });
});
