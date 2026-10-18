import {
  aggregateRuns,
  percentile,
  scoreCase,
} from '@/evals/voice-capture/scoring';
import type { CaptureEvalCase } from '@/evals/voice-capture/types';
import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';

const evalCase: CaptureEvalCase = {
  id: 'c1',
  title: 't',
  difficulty: 'easy',
  tags: [],
  images: ['a.png'],
  today: '2026-10-17',
  accounts: [{ id: 'bn', name: 'Binance', currencyCode: 'USDT' }],
  categories: [
    { id: 'ocio', name: 'Entretenimiento', kind: 'EXPENSE' },
    { id: 'sueldo', name: 'Salario', kind: 'INCOME' },
  ],
  history: [],
  expected: [
    {
      date: '2026-10-03',
      amount: 12,
      currency: 'USDT',
      type: 'EXPENSE',
      category: 'Entretenimiento',
      keywords: ['cine'],
    },
    {
      date: '2026-10-05',
      amount: 350,
      currency: 'USDT',
      type: 'INCOME',
      category: 'Salario',
      keywords: ['sueldo', 'salario'],
    },
  ],
  forbidden: [{ amount: 1234.56, reason: 'balance' }],
};

const tx = (o: Partial<CapturedTransaction>): CapturedTransaction => ({
  date: '2026-10-03',
  dateInferred: false,
  amount: 12,
  currency: 'USDT',
  type: 'EXPENSE',
  description: 'Cine con mi novia',
  categoryId: 'ocio',
  accountId: 'bn',
  sourceImage: 0,
  confidence: 'HIGH',
  ...o,
});

const perfect = [
  tx({}),
  tx({
    date: '2026-10-05',
    amount: 350,
    type: 'INCOME',
    description: 'Salario',
    categoryId: 'sueldo',
  }),
];

describe('scoreCase', () => {
  it('scores a perfect extraction as perfect', () => {
    const s = scoreCase(evalCase, perfect);
    expect(s).toMatchObject({
      matched: 2,
      expected: 2,
      extras: 0,
      forbiddenHits: 0,
      recall: 1,
      precision: 1,
      typeAccuracy: 1,
      currencyAccuracy: 1,
      categoryAccuracy: 1,
      keywordHitRate: 1,
      perfect: true,
    });
  });

  it('matches regardless of order and tolerates sub-cent float noise', () => {
    const s = scoreCase(evalCase, [
      perfect[1],
      { ...perfect[0], amount: 12.004 },
    ]);
    expect(s.matched).toBe(2);
    expect(s.perfect).toBe(true);
  });

  it('counts a missing movement against recall and perfection', () => {
    const s = scoreCase(evalCase, [perfect[0]]);
    expect(s.recall).toBe(0.5);
    expect(s.precision).toBe(1);
    expect(s.perfect).toBe(false);
  });

  it('counts an extracted balance row as a forbidden hit and an extra', () => {
    const s = scoreCase(evalCase, [
      ...perfect,
      tx({ amount: 1234.56, description: 'Saldo', categoryId: null }),
    ]);
    expect(s.extras).toBe(1);
    expect(s.forbiddenHits).toBe(1);
    expect(s.precision).toBeCloseTo(2 / 3);
    expect(s.perfect).toBe(false);
  });

  it('does not match a movement with the right amount but wrong date', () => {
    const s = scoreCase(evalCase, [
      perfect[0],
      { ...perfect[1], date: '2026-10-06' },
    ]);
    expect(s.matched).toBe(1);
    expect(s.extras).toBe(1);
  });

  it('scores wrong type, currency and category on matched movements', () => {
    const s = scoreCase(evalCase, [
      tx({ type: 'INCOME', currency: 'USD', categoryId: 'sueldo' }),
      perfect[1],
    ]);
    expect(s.matched).toBe(2);
    expect(s.typeAccuracy).toBe(0.5);
    expect(s.currencyAccuracy).toBe(0.5);
    expect(s.categoryAccuracy).toBe(0.5);
    expect(s.perfect).toBe(false);
  });

  it('ignores category when the expected category is null', () => {
    const loose = {
      ...evalCase,
      expected: [{ ...evalCase.expected[0], category: null }],
    };
    const s = scoreCase(loose, [tx({ categoryId: null })]);
    expect(s.categoryAccuracy).toBe(1);
    expect(s.perfect).toBe(true);
  });

  it('measures description keywords accent- and case-insensitively', () => {
    const s = scoreCase(evalCase, [
      tx({ description: 'CINÉ' }),
      { ...perfect[1], description: 'Pago mensual' },
    ]);
    expect(s.keywordHitRate).toBe(0.5);
    expect(s.perfect).toBe(true); // keywords are a soft metric
  });

  it('treats an empty expected list with no output as perfect', () => {
    const none = { ...evalCase, expected: [] };
    expect(scoreCase(none, [])).toMatchObject({
      recall: 1,
      precision: 1,
      perfect: true,
    });
  });
});

describe('aggregateRuns', () => {
  it('computes pass@1 and pass^k per case and latency percentiles', () => {
    const good = scoreCase(evalCase, perfect);
    const bad = scoreCase(evalCase, [perfect[0]]);
    const agg = aggregateRuns([
      { caseId: 'a', score: good, latencyMs: 100 },
      { caseId: 'a', score: good, latencyMs: 200 },
      { caseId: 'b', score: good, latencyMs: 300 },
      { caseId: 'b', score: bad, latencyMs: 400 },
    ]);
    expect(agg.cases).toBe(2);
    expect(agg.runs).toBe(4);
    expect(agg.passAt1).toBe(0.75);
    expect(agg.passHatK).toBe(0.5);
    expect(agg.recall).toBeCloseTo((1 + 1 + 1 + 0.5) / 4);
    expect(agg.latencyP50).toBe(250);
  });

  it('excludes failed runs from latency but counts them as failures', () => {
    const good = scoreCase(evalCase, perfect);
    const agg = aggregateRuns([
      { caseId: 'a', score: good, latencyMs: 100 },
      { caseId: 'a', score: null, latencyMs: 9999, error: 'boom' },
    ]);
    expect(agg.errors).toBe(1);
    expect(agg.passAt1).toBe(0.5);
    expect(agg.passHatK).toBe(0);
    expect(agg.latencyP50).toBe(100);
  });
});

describe('TSP pinned defects', () => {
  const cats = [
    { id: 'x', name: 'X', kind: 'EXPENSE' as const },
    { id: 'y', name: 'Y', kind: 'EXPENSE' as const },
    { id: 'i', name: 'I', kind: 'INCOME' as const },
  ];
  const exp = (o: Partial<CaptureEvalCase['expected'][0]>) => ({
    date: '2026-10-03',
    amount: 12,
    currency: 'USDT',
    type: 'EXPENSE' as const,
    category: null,
    keywords: [],
    ...o,
  });

  it('does not depend on the order of expected movements', () => {
    const predicted = [tx({ type: 'INCOME', categoryId: 'i' })];
    const a = exp({});
    const b = exp({ type: 'INCOME' });
    const forward = scoreCase(
      { expected: [a, b], forbidden: [], categories: cats },
      predicted
    );
    const backward = scoreCase(
      { expected: [b, a], forbidden: [], categories: cats },
      predicted
    );
    expect(forward).toEqual(backward);
    expect(forward.typeAccuracy).toBe(1);
  });

  it('is invariant to shuffling expected and predicted (seeded property)', () => {
    let seed = 42;
    const rand = () =>
      (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    const shuffle = <T>(xs: T[]) =>
      xs
        .map((v) => [rand(), v] as const)
        .sort((p, q) => p[0] - q[0])
        .map(([, v]) => v);
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(rand() * 5);
      const expected = Array.from({ length: n }, () =>
        exp({
          amount: pick([12, 20]),
          type: pick(['EXPENSE', 'INCOME'] as const),
          category: pick(['X', 'Y', null]),
        })
      );
      const predicted = Array.from({ length: 1 + Math.floor(rand() * 5) }, () =>
        tx({
          amount: pick([12, 20]),
          type: pick(['EXPENSE', 'INCOME'] as const),
          categoryId: pick(['x', 'y', 'i', null]),
        })
      );
      const base = scoreCase(
        { expected, forbidden: [], categories: cats },
        predicted
      );
      const shuffled = scoreCase(
        { expected: shuffle(expected), forbidden: [], categories: cats },
        shuffle(predicted)
      );
      expect(shuffled).toEqual(base);
    }
  });

  it('reports accuracies with nothing to measure as null, not 0', () => {
    const none = scoreCase(
      { expected: [exp({ keywords: [] })], forbidden: [], categories: cats },
      []
    );
    const agg = aggregateRuns([{ caseId: 'a', score: none, latencyMs: 1 }]);
    expect(agg.keywordHitRate).toBeNull();
    expect(agg.typeAccuracy).toBeNull();
    expect(agg.recall).toBe(0);
  });

  it('aggregates accuracies over matched movements, not vacuously over empty runs', () => {
    const expected = [exp({ category: 'X' })];
    const unmatched = scoreCase(
      { expected, forbidden: [], categories: cats },
      []
    );
    const wrongCategory = scoreCase(
      { expected, forbidden: [], categories: cats },
      [tx({ categoryId: 'y' })]
    );
    const agg = aggregateRuns([
      { caseId: 'a', score: unmatched, latencyMs: 1 },
      { caseId: 'a', score: wrongCategory, latencyMs: 1 },
    ]);
    expect(agg.categoryAccuracy).toBe(0);
    expect(agg.typeAccuracy).toBe(1);
    expect(agg.recall).toBe(0.5);
  });
});

describe('percentile', () => {
  it('interpolates linearly', () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentile([10, 20, 30, 40], 0.95)).toBeCloseTo(38.5);
    expect(percentile([], 0.5)).toBe(0);
  });
});
