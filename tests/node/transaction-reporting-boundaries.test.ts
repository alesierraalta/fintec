import { describe, it, expect } from '@jest/globals';
import {
  filterTransactionsByDebtMode,
  matchesDebtMode,
  OPERATIONAL_DEBT_MODE,
  DEBT_PORTFOLIO_MODE,
} from '@/lib/reports/transaction-reporting-boundaries';

const transactions = [
  {
    id: 'legacy-income',
    type: 'INCOME',
    amountBaseMinor: 1000,
  },
  {
    id: 'normal-expense',
    type: 'EXPENSE',
    amountBaseMinor: 500,
    isDebt: false,
  },
  {
    id: 'debt-owe',
    type: 'EXPENSE',
    amountBaseMinor: 200,
    isDebt: true,
  },
  {
    id: 'debt-owed-to-me',
    type: 'INCOME',
    amountBaseMinor: 300,
    isDebt: true,
  },
];

describe('transaction reporting boundaries', () => {
  it('keeps operational mode excluding debt transactions', () => {
    const result = filterTransactionsByDebtMode(
      transactions,
      OPERATIONAL_DEBT_MODE
    );

    expect(result.map((transaction) => transaction.id)).toEqual([
      'legacy-income',
      'normal-expense',
    ]);
  });

  it('keeps debt portfolio mode including only debt transactions', () => {
    const result = filterTransactionsByDebtMode(
      transactions,
      DEBT_PORTFOLIO_MODE
    );

    expect(result.map((transaction) => transaction.id)).toEqual([
      'debt-owe',
      'debt-owed-to-me',
    ]);
  });

  it('treats legacy transactions without metadata as non-debt', () => {
    expect(matchesDebtMode({ id: 'legacy' }, 'EXCLUDE_DEBT')).toBe(true);
    expect(matchesDebtMode({ id: 'legacy' }, 'ONLY_DEBT')).toBe(false);
  });
});
