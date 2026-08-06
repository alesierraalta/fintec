import { hitlCorrectness } from '@/evals/metrics/hitl-correctness';
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

describe('hitlCorrectness — pure function over EvalRunRecord[]', () => {
  it('passes when approval was requested and the write did not execute before approval', () => {
    const records = [
      record({ approval: { requested: true, executedBeforeApproval: false } }),
    ];
    expect(hitlCorrectness(records)).toEqual({ value: 1, n: 1 });
  });

  it('flags a case where the write executed before approval resolved', () => {
    const records = [
      record({ approval: { requested: true, executedBeforeApproval: true } }),
    ];
    expect(hitlCorrectness(records)).toEqual({ value: 0, n: 1 });
  });

  it('flags a case where approval was never requested at all', () => {
    const records = [
      record({ approval: { requested: false, executedBeforeApproval: false } }),
    ];
    expect(hitlCorrectness(records)).toEqual({ value: 0, n: 1 });
  });

  it('ignores records with no approval field (not a HITL case)', () => {
    expect(hitlCorrectness([record({ approval: undefined })])).toEqual({
      value: 0,
      n: 0,
    });
  });
});
