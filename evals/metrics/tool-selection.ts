import type { EvalRunRecord, MetricResult } from '../types';

/**
 * Tool-selection accuracy, computed from `toolCalls` (captured via the
 * `onFinish` callback in production; see `evals/execution/run-eval-case.ts`
 * for how this harness's own `EvalRunRecord`s are produced) against the
 * golden dataset's `expectedTool` (ai-eval-harness req. 5). Pure over
 * `EvalRunRecord[]`.
 */
export function toolSelectionAccuracy(
  records: EvalRunRecord[]
): MetricResult {
  const scored = records.filter((r) => r.groundTruth.expectedTool);
  if (scored.length === 0) return { value: 0, n: 0 };

  const correct = scored.filter(
    (r) => r.toolCalls[0]?.toolName === r.groundTruth.expectedTool
  ).length;

  return { value: correct / scored.length, n: scored.length };
}
