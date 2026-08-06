/**
 * Pure data validation of the golden dataset — no DB needed (node project).
 * Asserts req. 3 (ai-eval-harness): at least one case per category
 * (retrieval, aggregate, money with a non-2-decimal currency, HITL write).
 */
import { GOLDEN_CASES } from '@/evals/golden/dataset';
import { getCurrencyDecimals } from '@/lib/money';

describe('golden dataset — coverage', () => {
  it('has at least one retrieval case with expected ids', () => {
    const cases = GOLDEN_CASES.filter((c) =>
      c.categories.includes('retrieval')
    );
    expect(cases.length).toBeGreaterThanOrEqual(1);
    for (const c of cases) {
      expect(c.toolName).toBe('searchTransactions');
      expect(c.groundTruth.expectedIds?.length).toBeGreaterThan(0);
    }
  });

  it('has at least one aggregate case with an expected aggregate value', () => {
    const cases = GOLDEN_CASES.filter((c) =>
      c.categories.includes('aggregate')
    );
    expect(cases.length).toBeGreaterThanOrEqual(1);
    for (const c of cases) {
      expect(c.toolName).toBe('queryTransactions');
      expect(c.groundTruth.expectedAggregate).toEqual(expect.any(Number));
    }
  });

  it('has at least one money case using a currency with decimals !== 2', () => {
    const cases = GOLDEN_CASES.filter((c) => c.categories.includes('money'));
    expect(cases.length).toBeGreaterThanOrEqual(1);
    const nonTwoDecimal = cases.filter(
      (c) => getCurrencyDecimals(c.baseCurrencyCode ?? 'USD') !== 2
    );
    expect(nonTwoDecimal.length).toBeGreaterThanOrEqual(1);
    for (const c of nonTwoDecimal) {
      expect(c.groundTruth.expectedArgsMinor).toBeDefined();
    }
  });

  it('has at least one HITL write case', () => {
    const cases = GOLDEN_CASES.filter((c) => c.categories.includes('hitl'));
    expect(cases.length).toBeGreaterThanOrEqual(1);
    for (const c of cases) {
      expect(['createTransaction', 'createGoal']).toContain(c.toolName);
    }
  });

  it('every case has a unique caseId', () => {
    const ids = GOLDEN_CASES.map((c) => c.caseId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
