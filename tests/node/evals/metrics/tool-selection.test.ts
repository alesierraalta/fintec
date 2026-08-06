import { toolSelectionAccuracy } from '@/evals/metrics/tool-selection';
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

describe('toolSelectionAccuracy — pure function over EvalRunRecord[]', () => {
  it('scores 1.0 when the first tool call matches the expected tool', () => {
    const records = [
      record({
        toolCalls: [{ toolName: 'searchTransactions', args: {} }],
        groundTruth: { expectedTool: 'searchTransactions' },
      }),
    ];
    expect(toolSelectionAccuracy(records)).toEqual({ value: 1, n: 1 });
  });

  it('marks a case as a miss when the wrong tool is called', () => {
    const records = [
      record({
        toolCalls: [{ toolName: 'queryTransactions', args: {} }],
        groundTruth: { expectedTool: 'searchTransactions' },
      }),
    ];
    expect(toolSelectionAccuracy(records)).toEqual({ value: 0, n: 1 });
  });

  it('averages across multiple scored records', () => {
    const records = [
      record({
        toolCalls: [{ toolName: 'searchTransactions', args: {} }],
        groundTruth: { expectedTool: 'searchTransactions' },
      }),
      record({
        toolCalls: [{ toolName: 'queryTransactions', args: {} }],
        groundTruth: { expectedTool: 'searchTransactions' },
      }),
    ];
    expect(toolSelectionAccuracy(records)).toEqual({ value: 0.5, n: 2 });
  });

  it('ignores records with no expectedTool', () => {
    expect(toolSelectionAccuracy([record({ groundTruth: {} })])).toEqual({
      value: 0,
      n: 0,
    });
  });
});
