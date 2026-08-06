#!/usr/bin/env -S npx tsx
/**
 * Runs one full measured baseline against the local Supabase stack and
 * writes `evals/baseline/baseline.json` (ai-eval-harness req. 9). Every
 * value here is MEASURED from this run — never a placeholder.
 *
 * No live LLM call is made: the tool call each golden case exercises is
 * DECLARED by the case itself (`toolName`/`toolArgs`), not chosen by a
 * model (see `evals/execution/run-eval-case.ts`'s doc comment — there is
 * no API key/network access available to make this an honest live-model
 * measurement). Consequently `toolSelectionAccuracy` and
 * `aggregateFidelity` reflect this harness's own scripted wiring, not live
 * model quality, and are committed with `blocking: false`.
 * `moneyCorrectness` and `hitlCorrectness` are deterministic, code-verified
 * against a real Postgres instance and a real `approval_requests` row
 * lifecycle, so they are committed with `blocking: true`.
 *
 * Usage: npm run eval:baseline
 */
import './env-bootstrap';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
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
import type { Baseline } from '../gate/evaluate-gate';
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

function gitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: path.resolve(__dirname, '../..'),
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  setRagTransport(createFixtureRagTransport());

  const userKey = 'baseline-run';
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
      const threadId = `thread-baseline-${resolvedCase.caseId}`;
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
      console.log(`[eval:baseline] Ran case "${resolvedCase.caseId}"`);
    }
  } finally {
    await teardownEvalDataset(serviceClient, seeded.userId);
    setRagTransport();
  }

  const recall = recallAtK(records, 10);
  const precision = precisionAtK(records, 10);
  const toolSelection = toolSelectionAccuracy(records);
  const money = moneyCorrectness(records);
  const aggregate = aggregateFidelity(records);
  const hitl = hitlCorrectness(records);

  const baseline: Baseline = {
    schemaVersion: 1,
    commit: gitCommit(),
    runAt: new Date().toISOString(),
    transport: 'recorded',
    metrics: {
      // Deterministic, code-verifiable against a real Postgres instance —
      // safe to block a PR.
      moneyCorrectness: {
        value: money.value,
        n: money.n,
        tolerance: 0,
        blocking: true,
      },
      hitlCorrectness: {
        value: hitl.value,
        n: hitl.n,
        tolerance: 0,
        blocking: true,
      },
      // Retrieval quality depends on the real embedding/rerank providers
      // (recorded fixture here) and can legitimately shift across model
      // versions — reported, not enforced.
      recallAt10: {
        value: recall.value,
        n: recall.n,
        tolerance: 0.1,
        blocking: false,
      },
      precisionAt10: {
        value: precision.value,
        n: precision.n,
        tolerance: 0.1,
        blocking: false,
      },
      // No live LLM call is available in this environment (see the module
      // doc comment) — these two reflect the harness's own scripted tool
      // invocation, not live model quality. Never enforced.
      toolSelectionAccuracy: {
        value: toolSelection.value,
        n: toolSelection.n,
        tolerance: 0,
        blocking: false,
      },
      aggregateFidelity: {
        value: aggregate.value,
        n: aggregate.n,
        tolerance: 0,
        blocking: false,
      },
    },
  };

  const outPath = path.resolve(__dirname, 'baseline.json');
  writeFileSync(outPath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`[eval:baseline] Wrote ${outPath}`);
  console.log(JSON.stringify(baseline, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[eval:baseline] Fatal error:', error);
    process.exitCode = 1;
  });
}
