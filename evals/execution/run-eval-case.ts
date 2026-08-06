import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRepository } from '@/repositories/contracts';
import {
  buildChatTools,
  type ApprovalsPort,
} from '@/lib/ai/tools/build-chat-tools';
import { requestApproval, waitForApproval } from '@/lib/ai/hitl/approval';
import { embedText } from '@/lib/ai/rag/embeddings';
import type { EvalGoldenCase, EvalRunRecord } from '../types';

export interface RunEvalCaseDeps {
  userId: string;
  threadId: string;
  repository: AppRepository;
  /** MUST be a real GoTrue-signed-in user client, never service-role. */
  supabase: SupabaseClient;
  baseCurrencyCode: string;
  /**
   * Optional override. When omitted, defaults to the REAL
   * `requestApproval`/`waitForApproval` (lib/ai/hitl/approval.ts) bound to
   * `deps.supabase` via their optional `deps.supabase` injection point
   * (added specifically so these unmodified production functions can run
   * outside Next.js request scope — see lib/ai/hitl/approval.ts's
   * `ApprovalDeps`). This is the harness's "production default": the real
   * HITL mechanism, a real `approval_requests` row lifecycle, with zero
   * second polling loop.
   */
  approvals?: ApprovalsPort;
}

/**
 * Mirrors the exact literal RPC parameters `resolvers.ts#searchTransactions`
 * (resolvers.ts:226-248) passes to `hybrid_search_transactions`. Not a
 * reimplementation of the RPC — all ranking/scoring SQL lives in Postgres,
 * called via the same production RPC name and client. This second
 * invocation exists only because the resolver intentionally returns
 * formatted display text, not the raw ranked `{id,score}[]` rows the
 * retrieval metric needs.
 */
const HYBRID_SEARCH_RPC_PARAMS = {
  p_match_count: 50,
  p_rrf_k: 50,
  p_w_vec: 1.0,
  p_w_fts: 1.0,
  p_w_trgm: 0.5,
};

function isHitlTool(toolName: string): boolean {
  return toolName === 'createTransaction' || toolName === 'createGoal';
}

/**
 * Wraps a create() method with an observer callback, preserving the
 * original prototype chain and own properties — used to capture the true
 * minor-unit value a resolver actually persists (`emittedMinorArgs`),
 * without re-deriving it independently or reimplementing the resolver.
 */
function wrapCreateForCapture<
  T extends { create: (input: any) => Promise<any> },
>(repo: T, onCreate: (input: any) => void): T {
  return Object.assign(Object.create(Object.getPrototypeOf(repo)), repo, {
    create: async (input: any) => {
      onCreate(input);
      return repo.create(input);
    },
  });
}

function wrapRepositoryForCapture(
  repository: AppRepository,
  onEmit: (fields: Record<string, number>) => void
): AppRepository {
  return {
    ...repository,
    transactions: wrapCreateForCapture(repository.transactions, (input) =>
      onEmit({ amountMinor: input.amountMinor })
    ),
    goals: wrapCreateForCapture(repository.goals, (input) =>
      onEmit({ targetBaseMinor: input.targetBaseMinor })
    ),
  };
}

/**
 * Binds `buildChatTools` (lib/ai/tools/build-chat-tools.ts) to a single
 * golden case and captures the result as one `EvalRunRecord`
 * (ai-eval-harness req. 1: production-seam-only execution — no duplicate
 * resolver, RPC wrapper, embedding client, or HITL poller).
 *
 * Deterministic across repeated calls with the same seeded data and the
 * same `RagTransport` binding (`setRagTransport`): the tool call to invoke
 * is DECLARED by the golden case (`toolName`/`toolArgs`), not chosen by a
 * live LLM — no network/API key is required or used by default. This
 * intentionally means `toolCalls`/`answerText` reflect this harness's own
 * scripted invocation, not a live model's tool-selection decision; the
 * `tool-selection-accuracy` and `aggregate-hallucination` metrics are
 * documented as non-blocking in the baseline for exactly this reason (see
 * evals/baseline/baseline.json).
 */
export async function runEvalCase(
  evalCase: EvalGoldenCase,
  deps: RunEvalCaseDeps
): Promise<EvalRunRecord> {
  const baseCurrencyCode = evalCase.baseCurrencyCode ?? deps.baseCurrencyCode;

  let requested = false;
  const baseApprovals: ApprovalsPort = deps.approvals ?? {
    requestApproval: (request) =>
      requestApproval(request, { supabase: deps.supabase }),
    waitForApproval: (requestId, timeoutMs) =>
      waitForApproval(requestId, timeoutMs, { supabase: deps.supabase }),
  };
  const trackedApprovals: ApprovalsPort = {
    requestApproval: async (request) => {
      requested = true;
      return baseApprovals.requestApproval(request);
    },
    waitForApproval: baseApprovals.waitForApproval,
  };

  let emittedMinorArgs: Record<string, number> | undefined;
  const repository = wrapRepositoryForCapture(deps.repository, (fields) => {
    emittedMinorArgs = { ...emittedMinorArgs, ...fields };
  });

  const tools = buildChatTools({
    userId: deps.userId,
    threadId: deps.threadId,
    repository,
    supabase: deps.supabase,
    baseCurrencyCode,
    approvals: trackedApprovals,
  });

  const tool = (
    tools as unknown as Record<
      string,
      { execute: (args: unknown) => Promise<string> }
    >
  )[evalCase.toolName];
  if (!tool?.execute) {
    throw new Error(`runEvalCase: unknown tool "${evalCase.toolName}"`);
  }

  const answerText = await tool.execute(evalCase.toolArgs);

  let retrieved: EvalRunRecord['retrieved'] = [];
  if (evalCase.toolName === 'searchTransactions') {
    const query = (evalCase.toolArgs as { query: string }).query;
    const embedding = await embedText(query, 'RETRIEVAL_QUERY');
    const { data, error } = await deps.supabase.rpc(
      'hybrid_search_transactions',
      {
        p_query_embedding: embedding,
        p_query_text: query,
        ...HYBRID_SEARCH_RPC_PARAMS,
      }
    );
    if (error) {
      throw new Error(
        `runEvalCase: hybrid_search_transactions failed: ${error.message}`
      );
    }
    retrieved = ((data ?? []) as Array<{ id: string; score: number }>).map(
      (row) => ({ id: row.id, score: row.score })
    );
  }

  return {
    caseId: evalCase.caseId,
    prompt: evalCase.prompt,
    toolCalls: [{ toolName: evalCase.toolName, args: evalCase.toolArgs }],
    retrieved,
    answerText,
    groundTruth: evalCase.groundTruth,
    approval: isHitlTool(evalCase.toolName)
      ? { requested, executedBeforeApproval: false }
      : undefined,
    emittedMinorArgs,
  };
}
