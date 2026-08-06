import type { EvalRunRecord, MetricResult } from '../types';

/**
 * Retrieval recall/precision@k, computed from the ranked `id`/`score`
 * output of `hybrid_search_transactions` (resolvers.ts:226-243) against
 * expected ids labeled in the golden dataset (ai-eval-harness req. 4).
 * Pure over `EvalRunRecord[]` — no DB access.
 */

function topKIds(record: EvalRunRecord, k: number): string[] {
  return record.retrieved.slice(0, k).map((row) => row.id);
}

function scoredRecords(records: EvalRunRecord[]): EvalRunRecord[] {
  return records.filter(
    (r) => r.groundTruth.expectedIds && r.groundTruth.expectedIds.length > 0
  );
}

export function recallAtK(records: EvalRunRecord[], k: number): MetricResult {
  const scored = scoredRecords(records);
  if (scored.length === 0) return { value: 0, n: 0 };

  const scores = scored.map((record) => {
    const expected = new Set(record.groundTruth.expectedIds);
    const hits = topKIds(record, k).filter((id) => expected.has(id)).length;
    return hits / expected.size;
  });

  return {
    value: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    n: scored.length,
  };
}

export function precisionAtK(
  records: EvalRunRecord[],
  k: number
): MetricResult {
  const scored = scoredRecords(records);
  if (scored.length === 0) return { value: 0, n: 0 };

  const scores = scored.map((record) => {
    const expected = new Set(record.groundTruth.expectedIds);
    const top = topKIds(record, k);
    if (top.length === 0) return 0;
    const hits = top.filter((id) => expected.has(id)).length;
    return hits / top.length;
  });

  return {
    value: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    n: scored.length,
  };
}
