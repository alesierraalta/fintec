import type { EvalRunRecord, MetricResult } from '../types';

/**
 * Money-argument correctness: asserts the emitted `amountMinor`/
 * `amountBaseMinor`/`targetBaseMinor` (captured in `emittedMinorArgs` —
 * the real value written by the resolver, see
 * `evals/execution/run-eval-case.ts`) equals
 * `toMinorUnits`/`toBaseMinor` (lib/money.ts:333-335), not
 * `Math.round(amount * 100)` (ai-eval-harness req. 6). Pure over
 * `EvalRunRecord[]`.
 */
export function moneyCorrectness(records: EvalRunRecord[]): MetricResult {
  const scored = records.filter(
    (r) =>
      r.groundTruth.expectedArgsMinor &&
      Object.keys(r.groundTruth.expectedArgsMinor).length > 0
  );
  if (scored.length === 0) return { value: 0, n: 0 };

  const correct = scored.filter((record) => {
    const expected = record.groundTruth.expectedArgsMinor!;
    const emitted = record.emittedMinorArgs ?? {};
    return Object.entries(expected).every(
      ([key, value]) => emitted[key] === value
    );
  }).length;

  return { value: correct / scored.length, n: scored.length };
}
