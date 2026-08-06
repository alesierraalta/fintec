/**
 * ai-eval-harness req. 6: asserts emitted amountMinor/amountBaseMinor/
 * targetBaseMinor equal `toMinorUnits`/`toBaseMinor` (lib/money.ts:333-335),
 * not `Math.round(amount * 100)`. Uses the same 3-decimal-currency-style
 * regression fixture class as tests/node/lib/money.test.ts (Task 2.1).
 */
import { moneyCorrectness } from '@/evals/metrics/money-correctness';
import { toMinorUnits } from '@/lib/money';
import type { EvalRunRecord } from '@/evals/types';

function record(overrides: Partial<EvalRunRecord> = {}): EvalRunRecord {
  return {
    caseId: 'c1',
    prompt: 'p',
    toolCalls: [],
    retrieved: [],
    answerText: '',
    groundTruth: {},
    ...overrides,
  };
}

describe('moneyCorrectness — pure function over EvalRunRecord[]', () => {
  it('passes when the emitted minor-unit value equals toMinorUnits for a 0-decimal currency (COP)', () => {
    const expected = toMinorUnits(1500000, 'COP'); // 1500000, NOT 150000000
    const records = [
      record({
        emittedMinorArgs: { targetBaseMinor: expected },
        groundTruth: { expectedArgsMinor: { targetBaseMinor: expected } },
      }),
    ];
    expect(moneyCorrectness(records)).toEqual({ value: 1, n: 1 });
  });

  it('flags the defect: Math.round(amount*100) disagrees with toMinorUnits for COP', () => {
    const wrongLegacyValue = Math.round(1500000 * 100); // the old bug's output
    const correctExpected = toMinorUnits(1500000, 'COP');
    expect(wrongLegacyValue).not.toBe(correctExpected);

    const records = [
      record({
        emittedMinorArgs: { targetBaseMinor: wrongLegacyValue },
        groundTruth: {
          expectedArgsMinor: { targetBaseMinor: correctExpected },
        },
      }),
    ];
    expect(moneyCorrectness(records)).toEqual({ value: 0, n: 1 });
  });

  it('flags a mismatch when the emitted field is missing entirely', () => {
    const records = [
      record({
        emittedMinorArgs: {},
        groundTruth: { expectedArgsMinor: { amountMinor: 4550 } },
      }),
    ];
    expect(moneyCorrectness(records)).toEqual({ value: 0, n: 1 });
  });

  it('ignores records with no expectedArgsMinor (not a money case)', () => {
    expect(moneyCorrectness([record({ groundTruth: {} })])).toEqual({
      value: 0,
      n: 0,
    });
  });
});
