import type { EvalGoldenCase } from '../types';

/**
 * Golden dataset covering the four required categories (ai-eval-harness
 * req. 3): retrieval, aggregate, money (non-2-decimal currency), HITL
 * write. The money case and the HITL case are the SAME case
 * (`money-cop-goal-hitl`) — `createGoal` always requires approval
 * (`DEFAULT_AUTONOMY_POLICY.createGoal.autoApprove === false`,
 * lib/ai/hitl/autonomy-policy.ts:16), so a COP-denominated goal exercises
 * both the non-2-decimal money-conversion path AND a real HITL approval
 * lifecycle in one case, without inventing an artificial second scenario.
 *
 * `retrieval-groceries`'s `expectedIds` holds SEED golden-case ids (see
 * `evals/fixtures/seed.ts`'s `GOLDEN_CASES`), resolved to real seeded
 * transaction UUIDs at run time by `evals/golden/resolve.ts`.
 */
export const GOLDEN_CASES: EvalGoldenCase[] = [
  {
    caseId: 'retrieval-groceries',
    categories: ['retrieval'],
    prompt: 'Find my grocery shopping transactions',
    toolName: 'searchTransactions',
    toolArgs: { query: 'grocery shopping supermarket', limit: 10 },
    groundTruth: { expectedIds: ['groceries-1'] },
  },
  {
    caseId: 'aggregate-expense-sum',
    categories: ['aggregate'],
    prompt: 'How much did I spend in total on Eval Fixture Expense?',
    toolName: 'queryTransactions',
    toolArgs: { category: 'Eval Fixture Expense', aggregate: 'sum' },
    // Sum of the seeded USD expense fixtures (groceries-1: 4550 minor +
    // rent-1: 120000 minor = 124550 minor = $1245.50 major), per
    // evals/fixtures/seed.ts's GOLDEN_CASES.
    groundTruth: { expectedAggregate: 1245.5 },
  },
  {
    caseId: 'money-cop-goal-hitl',
    categories: ['money', 'hitl'],
    prompt: 'Create a savings goal of 1,500,000 COP by 2030-01-01',
    toolName: 'createGoal',
    toolArgs: {
      name: 'Fondo COP',
      targetAmount: 1500000,
      deadline: '2030-01-01',
    },
    baseCurrencyCode: 'COP',
    // COP has 0 decimals (lib/money.ts CURRENCIES.COP) — toMinorUnits
    // must NOT apply the 2-decimal Math.round(amount*100) shortcut.
    groundTruth: { expectedArgsMinor: { targetBaseMinor: 1500000 } },
  },
];
