import { recallAtK, precisionAtK } from '@/evals/metrics/retrieval';
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

describe('recallAtK / precisionAtK — pure functions over EvalRunRecord[]', () => {
  it('computes perfect recall/precision when all expected ids are in the top k', () => {
    const records = [
      record({
        retrieved: [
          { id: 'a', score: 0.9 },
          { id: 'b', score: 0.5 },
        ],
        groundTruth: { expectedIds: ['a', 'b'] },
      }),
    ];
    expect(recallAtK(records, 2)).toEqual({ value: 1, n: 1 });
    expect(precisionAtK(records, 2)).toEqual({ value: 1, n: 1 });
  });

  it('computes partial recall/precision when only some expected ids are ranked in the top k', () => {
    const records = [
      record({
        retrieved: [
          { id: 'x', score: 0.9 },
          { id: 'a', score: 0.5 },
        ],
        groundTruth: { expectedIds: ['a', 'b'] },
      }),
    ];
    expect(recallAtK(records, 2)).toEqual({ value: 0.5, n: 1 });
    expect(precisionAtK(records, 2)).toEqual({ value: 0.5, n: 1 });
  });

  it('ignores records with no expectedIds (not a retrieval case)', () => {
    const records = [record({ groundTruth: {} })];
    expect(recallAtK(records, 5)).toEqual({ value: 0, n: 0 });
    expect(precisionAtK(records, 5)).toEqual({ value: 0, n: 0 });
  });

  it('only counts ids within the top k window, not the full retrieved list', () => {
    const records = [
      record({
        retrieved: [
          { id: 'x', score: 0.99 },
          { id: 'y', score: 0.9 },
          { id: 'a', score: 0.1 }, // outside top-2
        ],
        groundTruth: { expectedIds: ['a'] },
      }),
    ];
    expect(recallAtK(records, 2)).toEqual({ value: 0, n: 1 });
  });
});
