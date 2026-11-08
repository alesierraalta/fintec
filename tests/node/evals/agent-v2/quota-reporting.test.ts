import { isQuotaError, liveMarkdown } from '../../../../evals/agent-v2/run';

describe('quota reporting', () => {
  it('classifies quota errors without treating ordinary failures as quota', () => {
    expect(isQuotaError(new Error('Provider QUOTA exhausted'))).toBe(true);
    expect(isQuotaError(new Error('You exceeded your current quota'))).toBe(
      true
    );
    expect(isQuotaError({ status: 429 })).toBe(true);
    expect(isQuotaError({ statusCode: 429 })).toBe(true);
    expect(isQuotaError(new Error('invalid tool arguments'))).toBe(false);
  });

  it('reports only measured cases in rates and failures', () => {
    const report = liveMarkdown([
      {
        id: 'passed',
        intent: 'query',
        utterance: 'passed case',
        calls: [],
        checks: { tool: true },
        passed: true,
      },
      {
        id: 'failed',
        intent: 'query',
        utterance: 'failed case',
        calls: [],
        checks: { tool: false },
        passed: false,
      },
      {
        id: 'skipped',
        intent: 'query',
        utterance: 'unmeasured case',
        calls: [],
        checks: { tool: false },
        unmeasured: true,
      },
    ]);

    expect(report).toContain(
      'Cases: 3. Measured: 2. Passed: 1. Unmeasured: 1. Pass rate: 50.0%.'
    );
    expect(report).toContain('| query | 50.0% | 2 |');
    expect(report).toContain('| tool | 50.0% | 2 |');
    const failures = report.split('## Failures')[1];
    expect(failures).toContain('1 cases were not measured.');
    expect(failures).toContain('failed case');
    expect(failures).not.toContain('unmeasured case');
  });
});
