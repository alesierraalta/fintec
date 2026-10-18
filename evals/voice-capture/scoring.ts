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
  /** Raw counts so aggregates can be micro-averaged over matched movements. */
  typeCorrect: number;
  currencyCorrect: number;
  categoryCorrect: number;
  keywordCorrect: number;
  keywordTotal: number;
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

// Exact search is used for groups up to this size; larger groups fall back
// to a greedy pass ordered by pair quality.
const EXACT_GROUP_LIMIT = 7;

/**
 * Pairs expected and predicted movements of the same date and amount with
 * the assignment that maximizes, lexicographically, matched pairs, then type,
 * category, currency and keyword agreement. The result does not depend on
 * the order of either list.
 */
export function scoreCase(
  evalCase: CaseEvalInput,
  predicted: CapturedTransaction[]
): CaseScore {
  const categoryName = new Map(evalCase.categories.map((c) => [c.id, c.name]));
  const expected = evalCase.expected;
  const linked = (e: ExpectedMovement, p: CapturedTransaction) =>
    p.date === e.date && sameAmount(p.amount, e.amount);
  const categoryMatches = (e: ExpectedMovement, p: CapturedTransaction) =>
    e.category === null ||
    (p.categoryId !== null &&
      [e.category].flat().includes(categoryName.get(p.categoryId) ?? ''));
  const keywordMatches = (e: ExpectedMovement, p: CapturedTransaction) =>
    e.keywords.some((k) => fold(p.description).includes(fold(k)));
  // Weights keep priorities strict for groups up to EXACT_GROUP_LIMIT pairs.
  const quality = (e: ExpectedMovement, p: CapturedTransaction) =>
    100_000 +
    (e.type === p.type ? 10_000 : 0) +
    (categoryMatches(e, p) ? 1_000 : 0) +
    (e.currency.toUpperCase() === p.currency.toUpperCase() ? 100 : 0) +
    (keywordMatches(e, p) ? 10 : 0);

  // Connected components of the "same date and amount" graph.
  const seenE = new Set<number>();
  const seenP = new Set<number>();
  const pairs: [ExpectedMovement, CapturedTransaction][] = [];
  for (let start = 0; start < expected.length; start++) {
    if (seenE.has(start)) continue;
    const groupE: number[] = [];
    const groupP: number[] = [];
    const stack: ['e' | 'p', number][] = [['e', start]];
    seenE.add(start);
    while (stack.length) {
      const [side, index] = stack.pop()!;
      if (side === 'e') {
        groupE.push(index);
        predicted.forEach((p, j) => {
          if (!seenP.has(j) && linked(expected[index], p)) {
            seenP.add(j);
            stack.push(['p', j]);
          }
        });
      } else {
        groupP.push(index);
        expected.forEach((e, i) => {
          if (!seenE.has(i) && linked(e, predicted[index])) {
            seenE.add(i);
            stack.push(['e', i]);
          }
        });
      }
    }
    for (const [i, j] of bestAssignment(groupE, groupP, (i, j) =>
      linked(expected[i], predicted[j])
        ? quality(expected[i], predicted[j])
        : -1
    )) {
      pairs.push([expected[i], predicted[j]]);
    }
  }

  const matchedP = new Set(pairs.map(([, p]) => p));
  const extras = predicted.filter((p) => !matchedP.has(p));
  const forbiddenHits = extras.filter((p) =>
    evalCase.forbidden.some(
      (f) => sameAmount(f.amount, p.amount) && (!f.date || f.date === p.date)
    )
  ).length;

  const typeOk = pairs.filter(([e, p]) => e.type === p.type).length;
  const currencyOk = pairs.filter(
    ([e, p]) => e.currency.toUpperCase() === p.currency.toUpperCase()
  ).length;
  const categoryOk = pairs.filter(([e, p]) => categoryMatches(e, p)).length;
  const withKeywords = pairs.filter(([e]) => e.keywords.length > 0);
  const keywordOk = withKeywords.filter(([e, p]) =>
    keywordMatches(e, p)
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
    typeCorrect: typeOk,
    currencyCorrect: currencyOk,
    categoryCorrect: categoryOk,
    keywordCorrect: keywordOk,
    keywordTotal: withKeywords.length,
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

/**
 * Best set of (expected, predicted) pairs inside one component. `weight`
 * returns -1 for pairs that may not be matched.
 */
function bestAssignment(
  groupE: number[],
  groupP: number[],
  weight: (i: number, j: number) => number
): [number, number][] {
  const es = [...groupE].sort((a, b) => a - b);
  const ps = [...groupP].sort((a, b) => a - b);
  if (es.length <= EXACT_GROUP_LIMIT && ps.length <= EXACT_GROUP_LIMIT) {
    let best: [number, number][] = [];
    let bestScore = -1;
    const used = new Set<number>();
    const current: [number, number][] = [];
    const search = (k: number, score: number) => {
      if (k === es.length) {
        if (score > bestScore) {
          bestScore = score;
          best = [...current];
        }
        return;
      }
      search(k + 1, score); // leave es[k] unmatched
      for (const j of ps) {
        const w = weight(es[k], j);
        if (w < 0 || used.has(j)) continue;
        used.add(j);
        current.push([es[k], j]);
        search(k + 1, score + w);
        current.pop();
        used.delete(j);
      }
    };
    search(0, 0);
    return best;
  }
  const edges = es
    .flatMap((i) => ps.map((j) => [i, j, weight(i, j)] as const))
    .filter(([, , w]) => w >= 0)
    .sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  const takenE = new Set<number>();
  const takenP = new Set<number>();
  const result: [number, number][] = [];
  for (const [i, j] of edges) {
    if (takenE.has(i) || takenP.has(j)) continue;
    takenE.add(i);
    takenP.add(j);
    result.push([i, j]);
  }
  return result;
}

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
  const total = (key: keyof CaseScore) =>
    scored.reduce((sum, s) => sum + (s[key] as number), 0);
  // null means "nothing to measure" (e.g. no matched movements), never 0.
  const micro = (num: keyof CaseScore, den: keyof CaseScore): number | null =>
    total(den) === 0 ? null : total(num) / total(den);
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
    // Micro-averaged over matched movements: a run that matched nothing must
    // not count as a perfectly typed or categorized one.
    typeAccuracy: micro('typeCorrect', 'matched'),
    currencyAccuracy: micro('currencyCorrect', 'matched'),
    categoryAccuracy: micro('categoryCorrect', 'matched'),
    keywordHitRate: micro('keywordCorrect', 'keywordTotal'),
    matchedMovements: total('matched'),
    forbiddenHits: runs.reduce((n, r) => n + (r.score?.forbiddenHits ?? 0), 0),
    latencyP50: percentile(latencies, 0.5),
    latencyP95: percentile(latencies, 0.95),
    avgInputTokens: mean(tokens.map((r) => r.inputTokens!)),
    avgOutputTokens: mean(tokens.map((r) => r.outputTokens ?? 0)),
  };
}
