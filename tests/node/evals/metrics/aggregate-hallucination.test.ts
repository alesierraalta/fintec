import { aggregateFidelity } from '@/evals/metrics/aggregate-hallucination';
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

describe('aggregateFidelity — pure function over EvalRunRecord[]', () => {
  it('passes when the parsed number matches the deterministic expected aggregate', () => {
    const records = [
      record({
        answerText: '📊 Total: $1,245.50\n📄 Transacciones consideradas: 2',
        groundTruth: { expectedAggregate: 1245.5 },
      }),
    ];
    expect(aggregateFidelity(records)).toEqual({ value: 1, n: 1 });
  });

  it('flags a hallucination when the model overstates the total', () => {
    const records = [
      record({
        answerText: '📊 Total: $9,999.00',
        groundTruth: { expectedAggregate: 1245.5 },
      }),
    ];
    expect(aggregateFidelity(records)).toEqual({ value: 0, n: 1 });
  });

  it('treats an unparsable answer as a failure, not a silent skip', () => {
    const records = [
      record({
        answerText: 'no se pudo calcular el total',
        groundTruth: { expectedAggregate: 100 },
      }),
    ];
    expect(aggregateFidelity(records)).toEqual({ value: 0, n: 1 });
  });

  it('ignores records with no expectedAggregate (not an aggregate case)', () => {
    expect(aggregateFidelity([record({ groundTruth: {} })])).toEqual({
      value: 0,
      n: 0,
    });
  });
});
