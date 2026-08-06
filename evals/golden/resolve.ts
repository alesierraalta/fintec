import type { GoldenLabel } from '@/evals/fixtures/seed';
import type { EvalGoldenCase } from '../types';

/**
 * Replaces a golden case's SEED golden-case ids (`groundTruth.expectedIds`
 * in the static dataset — e.g. `'groceries-1'`, matching
 * `evals/fixtures/seed.ts`'s `GoldenLabel.caseId`) with the real seeded
 * transaction UUIDs returned by `seedEvalDataset`, so retrieval metrics can
 * compare against actual DB row ids.
 */
export function resolveGoldenCase(
  evalCase: EvalGoldenCase,
  goldenLabels: GoldenLabel[]
): EvalGoldenCase {
  const { expectedIds, ...restGroundTruth } = evalCase.groundTruth;
  if (!expectedIds || expectedIds.length === 0) {
    return evalCase;
  }

  const byCaseId = new Map(
    goldenLabels.map((label) => [label.caseId, label.transactionId])
  );

  const resolvedIds = expectedIds.map((caseId) => {
    const transactionId = byCaseId.get(caseId);
    if (!transactionId) {
      throw new Error(
        `resolveGoldenCase: unknown seed golden case id "${caseId}" for eval case "${evalCase.caseId}"`
      );
    }
    return transactionId;
  });

  return {
    ...evalCase,
    groundTruth: { ...restGroundTruth, expectedIds: resolvedIds },
  };
}
