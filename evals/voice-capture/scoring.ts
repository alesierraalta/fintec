import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';
import type { CaptureEvalCase, ExpectedMovement } from './types';

const AMOUNT_TOLERANCE = 0.005;

export interface CaseScore {
  expected: number;
  matched: number;
  extras: number;
  forbiddenHits: number;
  recall: number;
  precision: number;
  typeAccuracy: number;
  currencyAccuracy: number;
  categoryAccuracy: number;
  keywordHitRate: number;
  /** Every expected movement found, nothing extra, type/currency/category right. */
  perfect: boolean;
}

export interface RunResult {
  caseId: string;
  score: CaseScore | null;
  latencyMs: number;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const sameAmount = (a: number, b: number) =>
  Math.abs(a - b) <= AMOUNT_TOLERANCE;

const ratio = (num: number, den: number) => (den === 0 ? 1 : num / den);

/**
 * Pairs each expected movement with one predicted movement of the same date
 * and amount (preferring the same type), then scores the pairs.
 */
export function scoreCase(
  evalCase: CaseEvalInput,
  predicted: CapturedTransaction[]
): CaseScore {
  const categoryName = new Map(evalCase.categories.map((c) => [c.id, c.name]));
  const free = predicted.map((_, i) => i);
  const pairs: [ExpectedMovement, CapturedTransaction][] = [];

  for (const exp of evalCase.expected) {
    const candidates = free.filter(
      (i) =>
        predicted[i].date === exp.date &&
        sameAmount(predicted[i].amount, exp.amount)
    );
    const pick =
      candidates.find((i) => predicted[i].type === exp.type) ?? candidates[0];
    if (pick === undefined) continue;
    free.splice(free.indexOf(pick), 1);
    pairs.push([exp, predicted[pick]]);
  }

  const extras = free.map((i) => predicted[i]);
  const forbiddenHits = extras.filter((p) =>
    evalCase.forbidden.some(
      (f) => sameAmount(f.amount, p.amount) && (!f.date || f.date === p.date)
    )
  ).length;

  const typeOk = pairs.filter(([e, p]) => e.type === p.type).length;
  const currencyOk = pairs.filter(
    ([e, p]) => e.currency.toUpperCase() === p.currency.toUpperCase()
  ).length;
  const categoryOk = pairs.filter(
    ([e, p]) =>
      e.category === null ||
      (p.categoryId !== null && categoryName.get(p.categoryId) === e.category)
  ).length;
  const withKeywords = pairs.filter(([e]) => e.keywords.length > 0);
  const keywordOk = withKeywords.filter(([e, p]) =>
    e.keywords.some((k) => fold(p.description).includes(fold(k)))
  ).length;

  const matched = pairs.length;
  return {
    expected: evalCase.expected.length,
    matched,
    extras: extras.length,
    forbiddenHits,
    recall: ratio(matched, evalCase.expected.length),
    precision: ratio(matched, predicted.length),
    typeAccuracy: ratio(typeOk, matched),
    currencyAccuracy: ratio(currencyOk, matched),
    categoryAccuracy: ratio(categoryOk, matched),
    keywordHitRate: ratio(keywordOk, withKeywords.length),
    perfect:
      matched === evalCase.expected.length &&
      extras.length === 0 &&
      typeOk === matched &&
      currencyOk === matched &&
      categoryOk === matched,
  };
}

type CaseEvalInput = Pick<
  CaptureEvalCase,
  'expected' | 'forbidden' | 'categories'
>;

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** Aggregates repeated runs; a failed run (score null) counts as imperfect. */
export function aggregateRuns(runs: RunResult[]) {
  const scored = runs.filter((r) => r.score !== null).map((r) => r.score!);
  const metric = (key: keyof CaseScore) =>
    mean(runs.map((r) => (r.score ? (r.score[key] as number) : 0)));
  const byCase = new Map<string, RunResult[]>();
  for (const run of runs) {
    byCase.set(run.caseId, [...(byCase.get(run.caseId) ?? []), run]);
  }
  const latencies = runs
    .filter((r) => r.score !== null)
    .map((r) => r.latencyMs);
  const tokens = runs.filter((r) => r.inputTokens !== undefined);

  return {
    cases: byCase.size,
    runs: runs.length,
    errors: runs.length - scored.length,
    passAt1: mean(runs.map((r) => (r.score?.perfect ? 1 : 0))),
    passHatK: mean(
      [...byCase.values()].map((caseRuns) =>
        caseRuns.every((r) => r.score?.perfect) ? 1 : 0
      )
    ),
    recall: metric('recall'),
    precision: metric('precision'),
    typeAccuracy: metric('typeAccuracy'),
    currencyAccuracy: metric('currencyAccuracy'),
    categoryAccuracy: metric('categoryAccuracy'),
    keywordHitRate: metric('keywordHitRate'),
    forbiddenHits: runs.reduce((n, r) => n + (r.score?.forbiddenHits ?? 0), 0),
    latencyP50: percentile(latencies, 0.5),
    latencyP95: percentile(latencies, 0.95),
    avgInputTokens: mean(tokens.map((r) => r.inputTokens!)),
    avgOutputTokens: mean(tokens.map((r) => r.outputTokens ?? 0)),
  };
}
