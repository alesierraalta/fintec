import {
  checkGate,
  evaluateJob,
  type JobDeps,
} from '@/evals/voice-capture/harness';
import type { CaptureEvalCase } from '@/evals/voice-capture/types';
import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';

const evalCase: CaptureEvalCase = {
  id: 'c1',
  title: 't',
  difficulty: 'easy',
  tags: [],
  images: [],
  today: '2026-10-17',
  accounts: [],
  categories: [{ id: 'salud', name: 'Salud', kind: 'EXPENSE' }],
  history: [{ description: 'Farmacia SAAS', category: 'Salud' }],
  expected: [
    {
      date: '2026-10-05',
      amount: 10,
      currency: 'VES',
      type: 'EXPENSE',
      category: 'Salud',
      keywords: [],
    },
  ],
  forbidden: [],
};

const movement: CapturedTransaction = {
  date: '2026-10-05',
  dateInferred: false,
  amount: 10,
  currency: 'VES',
  type: 'EXPENSE',
  description: 'Farmacia',
  categoryId: 'salud',
  accountId: null,
  sourceImage: 0,
  confidence: 'HIGH',
  merchant: 'FARMATODO',
};

const deps = (overrides: Partial<JobDeps> = {}): JobDeps => ({
  extract: async () => ({ predicted: [movement], latencyMs: 5, usage: {} }),
  embed: async () => [1, 0],
  documentCache: new Map(),
  lexicalThreshold: 0.5,
  embeddingThreshold: 0.75,
  ...overrides,
});

const byVariant = (runs: Awaited<ReturnType<typeof evaluateJob>>) =>
  runs.map((r) => `${r.variant}:${r.score ? 'scored' : 'error'}`).sort();

describe('evaluateJob', () => {
  it('records exactly one result per variant', async () => {
    expect(byVariant(await evaluateJob(evalCase, 0, deps()))).toEqual([
      'embedding:scored',
      'full-history:scored',
      'lexical:scored',
      'none:scored',
    ]);
  });

  it('keeps the baseline and lexical results when only the embedding API fails', async () => {
    const runs = await evaluateJob(
      evalCase,
      0,
      deps({
        embed: async () => {
          throw new Error('embedding quota');
        },
      })
    );
    expect(byVariant(runs)).toEqual([
      'embedding:error',
      'full-history:scored',
      'lexical:scored',
      'none:scored',
    ]);
    expect(runs.find((r) => r.variant === 'embedding')?.error).toMatch(/quota/);
  });

  it('marks the three derived variants as errors when the base extraction fails', async () => {
    let call = 0;
    const runs = await evaluateJob(
      evalCase,
      0,
      deps({
        extract: async () => {
          if (call++ === 0) throw new Error('model down');
          return { predicted: [movement], latencyMs: 5, usage: {} };
        },
      })
    );
    expect(byVariant(runs)).toEqual([
      'embedding:error',
      'full-history:scored',
      'lexical:error',
      'none:error',
    ]);
  });
});

describe('checkGate', () => {
  const summary = { recall: 0.9, forbiddenHits: 1 };

  it('fails below a minimum and above maxForbiddenHits', () => {
    expect(checkGate(summary, { recall: 0.95, maxForbiddenHits: 0 })).toEqual({
      ok: false,
      failures: ['recall: 0.9 vs 0.95', 'maxForbiddenHits: 1 vs 0'],
    });
  });

  it('passes when every threshold holds', () => {
    expect(checkGate(summary, { recall: 0.8, maxForbiddenHits: 1 }).ok).toBe(
      true
    );
  });

  it('fails when the gate is requested without thresholds instead of passing silently', () => {
    const result = checkGate(summary, null);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/thresholds/i);
  });

  it('fails on a threshold for a metric the summary does not have', () => {
    expect(checkGate(summary, { recal: 0.5 }).ok).toBe(false);
  });
});
