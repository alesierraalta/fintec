/**
 * ai-eval-harness req. 10: `evaluateGate(baseline, observed)` fails ONLY
 * when `observed < value - tolerance AND blocking === true`. A metric with
 * `blocking: false` never fails the gate regardless of observed value.
 */
import { evaluateGate, type Baseline } from '@/evals/gate/evaluate-gate';

function makeBaseline(overrides: Partial<Baseline['metrics']> = {}): Baseline {
  return {
    schemaVersion: 1,
    commit: 'abc123',
    runAt: '2026-08-06T00:00:00.000Z',
    transport: 'recorded',
    metrics: {
      moneyCorrectness: { value: 1, n: 3, tolerance: 0, blocking: true },
      hitlCorrectness: { value: 1, n: 1, tolerance: 0, blocking: true },
      recallAt10: { value: 1, n: 1, tolerance: 0.1, blocking: false },
      ...overrides,
    },
  };
}

describe('evaluateGate', () => {
  it('passes when every observed metric meets its baseline threshold', () => {
    const verdict = evaluateGate(makeBaseline(), {
      moneyCorrectness: 1,
      hitlCorrectness: 1,
      recallAt10: 1,
    });
    expect(verdict.passed).toBe(true);
    expect(verdict.failures).toEqual([]);
  });

  it('fails the gate when a BLOCKING metric regresses past value - tolerance', () => {
    const verdict = evaluateGate(makeBaseline(), {
      moneyCorrectness: 0.5, // regressed, blocking: true
      hitlCorrectness: 1,
      recallAt10: 1,
    });
    expect(verdict.passed).toBe(false);
    expect(verdict.failures).toEqual([
      { metric: 'moneyCorrectness', observed: 0.5, threshold: 1 },
    ]);
  });

  it('does NOT fail the gate when a non-blocking metric regresses, but reports it', () => {
    const verdict = evaluateGate(makeBaseline(), {
      moneyCorrectness: 1,
      hitlCorrectness: 1,
      recallAt10: 0.2, // regressed, but blocking: false
    });
    expect(verdict.passed).toBe(true);
    expect(verdict.failures).toEqual([]);
    expect(verdict.reported).toEqual([
      { metric: 'recallAt10', observed: 0.2, baselineValue: 1 },
    ]);
  });

  it('does not fail when observed sits exactly at value - tolerance (boundary is inclusive of the threshold)', () => {
    const verdict = evaluateGate(makeBaseline(), {
      moneyCorrectness: 1,
      hitlCorrectness: 1,
      recallAt10: 0.9, // 1 - 0.1 tolerance == 0.9, not below
    });
    expect(verdict.passed).toBe(true);
    expect(verdict.reported).toEqual([]);
  });

  it('ignores metrics with no observed value (not run this time)', () => {
    const verdict = evaluateGate(makeBaseline(), { moneyCorrectness: 1 });
    expect(verdict.passed).toBe(true);
  });
});
