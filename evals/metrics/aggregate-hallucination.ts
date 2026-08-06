import type { EvalRunRecord, MetricResult } from '../types';

/**
 * Aggregate-hallucination metric: compares a numeric claim parsed from
 * `answerText` against the deterministic `expectedAggregate` computed from
 * `query_transactions` for the same seeded fixtures (ai-eval-harness req.
 * 7). Pure over `EvalRunRecord[]` — no DB access, no re-computation of the
 * aggregate itself (that ground truth is supplied by the golden dataset /
 * caller, not derived here).
 */

const DEFAULT_TOLERANCE = 0.01;

function parseFirstNumber(text: string): number | null {
  const match = text.match(/-?\$?\s*[\d,]+(?:\.\d+)?/);
  if (!match) return null;
  const cleaned = match[0].replace(/[$\s,]/g, '');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

export function aggregateFidelity(
  records: EvalRunRecord[],
  tolerance: number = DEFAULT_TOLERANCE
): MetricResult {
  const scored = records.filter(
    (r) => r.groundTruth.expectedAggregate !== undefined
  );
  if (scored.length === 0) return { value: 0, n: 0 };

  const correct = scored.filter((record) => {
    const parsed = parseFirstNumber(record.answerText);
    if (parsed === null) return false;
    return Math.abs(parsed - record.groundTruth.expectedAggregate!) <= tolerance;
  }).length;

  return { value: correct / scored.length, n: scored.length };
}
