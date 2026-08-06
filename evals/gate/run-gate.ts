#!/usr/bin/env -S npx tsx
/**
 * Read-only CI gate: runs every golden case against the local Supabase
 * stack, computes observed metric values, and compares them to the
 * COMMITTED `evals/baseline/baseline.json` via `evaluateGate` — it never
 * re-baselines (that is `npm run eval:baseline`, a separate, explicit,
 * human-invoked step). Fails the process (exit code 1) ONLY when a
 * `blocking: true` metric regresses past `value - tolerance`
 * (ai-eval-harness req. 10). No numeric threshold literal belongs in CI
 * configuration — thresholds live only in the committed baseline.json.
 *
 * Usage: npm run eval:gate
 */
import '../baseline/env-bootstrap';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { setRagTransport } from '@/lib/ai/rag/transport';
import { createServerAppRepository } from '@/repositories/factory';
import { createFixtureRagTransport } from '../../tests/db/support/fixture-transport';
import {
  createServiceRoleClient,
  createUserSessionClient,
} from '../../tests/db/support/auth-client';
import {
  seedEvalDataset,
  fixtureEmail,
  EVAL_FIXTURE_PASSWORD,
} from '../fixtures/seed';
import { teardownEvalDataset } from '../fixtures/teardown';
import { runEvalCase } from '../execution/run-eval-case';
import { resolveGoldenCase } from '../golden/resolve';
import { GOLDEN_CASES } from '../golden/dataset';
import { recallAtK, precisionAtK } from '../metrics/retrieval';
import { toolSelectionAccuracy } from '../metrics/tool-selection';
import { moneyCorrectness } from '../metrics/money-correctness';
import { aggregateFidelity } from '../metrics/aggregate-hallucination';
import { hitlCorrectness } from '../metrics/hitl-correctness';
import { evaluateGate, type Baseline } from './evaluate-gate';
import type { EvalRunRecord } from '../types';

async function autoApprovePendingRequest(
  client: SupabaseClient,
  userId: string,
  threadId: string,
  timeoutMs: number
): Promise<void> {
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
        throw new Error(`autoApprovePendingRequest: ${error.message}`);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    'autoApprovePendingRequest: no pending approval_requests row appeared in time'
  );
}

async function runAllCases(): Promise<EvalRunRecord[]> {
  setRagTransport(createFixtureRagTransport());

  const userKey = 'gate-run';
  const serviceClient = createServiceRoleClient();
  const seeded = await seedEvalDataset(serviceClient, { userKey });
  const userClient = await createUserSessionClient(
    fixtureEmail(userKey),
    EVAL_FIXTURE_PASSWORD
  );
  const repository = createServerAppRepository({ supabase: userClient });

  const records: EvalRunRecord[] = [];
  try {
    for (const rawCase of GOLDEN_CASES) {
      const resolvedCase = resolveGoldenCase(rawCase, seeded.goldenLabels);
      const threadId = `thread-gate-${resolvedCase.caseId}`;
      const isHitl = resolvedCase.categories.includes('hitl');
      const deps = {
        userId: seeded.userId,
        threadId,
        repository,
        supabase: userClient,
        baseCurrencyCode: 'USD',
      };

      const record = isHitl
        ? (
            await Promise.all([
              runEvalCase(resolvedCase, deps),
              autoApprovePendingRequest(
                userClient,
                seeded.userId,
                threadId,
                10000
              ),
            ])
          )[0]
        : await runEvalCase(resolvedCase, deps);

      records.push(record);
    }
  } finally {
    await teardownEvalDataset(serviceClient, seeded.userId);
    setRagTransport();
  }

  return records;
}

async function main(): Promise<void> {
  const baselinePath = path.resolve(__dirname, '../baseline/baseline.json');
  const baseline: Baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));

  const records = await runAllCases();

  const observed: Record<string, number> = {
    moneyCorrectness: moneyCorrectness(records).value,
    hitlCorrectness: hitlCorrectness(records).value,
    recallAt10: recallAtK(records, 10).value,
    precisionAt10: precisionAtK(records, 10).value,
    toolSelectionAccuracy: toolSelectionAccuracy(records).value,
    aggregateFidelity: aggregateFidelity(records).value,
  };

  const verdict = evaluateGate(baseline, observed);

  console.log('[eval:gate] Observed:', JSON.stringify(observed, null, 2));
  console.log('[eval:gate] Baseline commit:', baseline.commit);
  if (verdict.reported.length > 0) {
    console.log(
      '[eval:gate] Non-blocking regressions (reported, not enforced):',
      JSON.stringify(verdict.reported, null, 2)
    );
  }

  if (!verdict.passed) {
    console.error(
      '[eval:gate] BLOCKING regression(s):',
      JSON.stringify(verdict.failures, null, 2)
    );
    process.exitCode = 1;
    return;
  }

  console.log('[eval:gate] PASS — no blocking metric regressed.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[eval:gate] Fatal error:', error);
    process.exitCode = 1;
  });
}
