/**
 * Shared types for the eval harness (evals/execution, evals/golden,
 * evals/metrics, evals/gate). Mirrors the design's `EvalRunRecord`
 * contract (design.md section 5), with one additive field
 * (`emittedMinorArgs`) documented below.
 */

export type EvalCategory = 'retrieval' | 'aggregate' | 'money' | 'hitl';

export type EvalToolName =
  | 'createTransaction'
  | 'queryTransactions'
  | 'searchTransactions'
  | 'getAccountBalance'
  | 'createGoal';

export interface EvalGroundTruth {
  /**
   * For a retrieval case: in the STATIC golden dataset file, these are
   * SEED golden-case ids (e.g. `'groceries-1'`, matching
   * `evals/fixtures/seed.ts`'s `GoldenLabel.caseId`). At run time,
   * `evals/golden/resolve.ts#resolveGoldenCase` replaces them with the
   * real seeded transaction UUIDs before the record is scored.
   */
  expectedIds?: string[];
  expectedTool?: EvalToolName;
  expectedArgsMinor?: Record<string, number>;
  expectedAggregate?: number;
}

export interface EvalGoldenCase {
  caseId: string;
  categories: EvalCategory[];
  prompt: string;
  toolName: EvalToolName;
  toolArgs: Record<string, unknown>;
  /**
   * Overrides `RunEvalCaseDeps.baseCurrencyCode` for this case only. Used
   * by the money/non-2-decimal-currency golden case.
   */
  baseCurrencyCode?: string;
  groundTruth: EvalGroundTruth;
}

export interface ToolCallRecord {
  toolName: string;
  args: unknown;
}

export interface RetrievedRow {
  id: string;
  score: number;
}

export interface EvalRunRecord {
  caseId: string;
  prompt: string;
  toolCalls: ToolCallRecord[];
  retrieved: RetrievedRow[];
  answerText: string;
  groundTruth: EvalGroundTruth;
  approval?: { requested: boolean; executedBeforeApproval: boolean };
  /**
   * Actual minor-unit values persisted by the resolver for this case,
   * captured via a thin observing wrapper around the repository's
   * `create()` calls (see `evals/execution/run-eval-case.ts`) — the true
   * written value, not a value re-derived independently. Populated only
   * for money-relevant tool calls (`createTransaction`, `createGoal`).
   */
  emittedMinorArgs?: Record<string, number>;
}

export interface MetricResult {
  value: number;
  n: number;
}
