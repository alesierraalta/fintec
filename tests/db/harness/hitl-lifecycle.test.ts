/**
 * ai-eval-harness req. 8: HITL correctness against a REAL
 * `approval_requests` row lifecycle — no mocked approval store. Runs the
 * golden `money-cop-goal-hitl` case through `runEvalCase` with `approvals`
 * NOT overridden (the production default: the real
 * `requestApproval`/`waitForApproval` from lib/ai/hitl/approval.ts, bound
 * to the eval user's authenticated client via their `deps.supabase`
 * injection point — see run-eval-case.ts). Flips the row's status to
 * `approved` immediately after creation so the first poll tick (every
 * 2000ms, approval.ts:62) resolves it, keeping the test fast.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
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
import { GOLDEN_CASES } from '@/evals/golden/dataset';

async function autoApprovePendingRequest(
  client: SupabaseClient,
  userId: string,
  threadId: string,
  timeoutMs: number
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await client
      .from('approval_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .eq('status', 'pending')
      .maybeSingle();

    if (data) {
      const { error } = await client
        .from('approval_requests')
        .update({ status: 'approved', responded_at: new Date().toISOString() })
        .eq('id', data.id)
        .eq('user_id', userId);
      if (error) {
        throw new Error(
          `autoApprovePendingRequest: failed to approve: ${error.message}`
        );
      }
      return data.id as string;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    'autoApprovePendingRequest: no pending approval_requests row appeared in time'
  );
}

describe('HITL lifecycle — real approval_requests row, no mock store', () => {
  const userKey = 'hitl-lifecycle';
  let userId: string;

  beforeAll(() => {
    setRagTransport(createFixtureRagTransport());
  });

  afterAll(async () => {
    setRagTransport();
    const serviceClient = createServiceRoleClient();
    if (userId) {
      await teardownEvalDataset(serviceClient, userId);
    }
  });

  it('creates a real approval_requests row and unblocks waitForApproval once it is approved', async () => {
    const serviceClient = createServiceRoleClient();
    const seeded = await seedEvalDataset(serviceClient, { userKey });
    userId = seeded.userId;

    const userClient = await createUserSessionClient(
      fixtureEmail(userKey),
      EVAL_FIXTURE_PASSWORD
    );
    const repository = createServerAppRepository({ supabase: userClient });
    const threadId = `thread-hitl-${Date.now()}`;

    const goldenCase = GOLDEN_CASES.find(
      (c) => c.caseId === 'money-cop-goal-hitl'
    )!;

    const [record, approvedRequestId] = await Promise.all([
      runEvalCase(goldenCase, {
        userId,
        threadId,
        repository,
        supabase: userClient,
        baseCurrencyCode: 'USD',
        // approvals intentionally NOT overridden: production default binds
        // the real lib/ai/hitl/approval.ts functions to userClient.
      }),
      autoApprovePendingRequest(userClient, userId, threadId, 10000),
    ]);

    expect(approvedRequestId).toEqual(expect.any(String));
    expect(record.approval).toEqual({
      requested: true,
      executedBeforeApproval: false,
    });
    expect(record.answerText).toMatch(/Meta creada/i);
    expect(record.emittedMinorArgs).toEqual({ targetBaseMinor: 1500000 });

    const { data: finalRow, error } = await userClient
      .from('approval_requests')
      .select('status, action_type')
      .eq('id', approvedRequestId)
      .single();
    expect(error).toBeNull();
    expect(finalRow).toMatchObject({
      status: 'approved',
      action_type: 'createGoal',
    });
  }, 15000);
});
