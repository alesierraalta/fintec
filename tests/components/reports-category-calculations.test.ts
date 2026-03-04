import { describe, expect, it } from '@jest/globals';
import {
  DEBT_PORTFOLIO_MODE,
  filterTransactionsByDebtMode,
  OPERATIONAL_DEBT_MODE,
} from '@/lib/reports/transaction-reporting-boundaries';
import { DebtDirection, TransactionType, type Transaction } from '@/types';

const dataset: Partial<Transaction>[] = [
  {
    id: 'tx-op-income',
    type: TransactionType.INCOME,
    amountBaseMinor: 10000,
    categoryId: 'salary',
    isDebt: false,
  },
  {
    id: 'tx-op-expense',
    type: TransactionType.EXPENSE,
    amountBaseMinor: 3500,
    categoryId: 'food',
    isDebt: false,
  },
  {
    id: 'tx-debt-owed',
    type: TransactionType.INCOME,
    amountBaseMinor: 9000,
    categoryId: 'salary',
    isDebt: true,
    debtDirection: DebtDirection.OWED_TO_ME,
  },
  {
    id: 'tx-debt-owe',
    type: TransactionType.EXPENSE,
    amountBaseMinor: 1200,
    categoryId: 'food',
    isDebt: true,
    debtDirection: DebtDirection.OWE,
  },
] as const;

function sumByType(transactions: Partial<Transaction>[]) {
  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        acc.income += transaction.amountBaseMinor || 0;
      }

      if (transaction.type === TransactionType.EXPENSE) {
        acc.expense += transaction.amountBaseMinor || 0;
      }

      return acc;
    },
    { income: 0, expense: 0 }
  );
}

describe('Reports Category Calculations', () => {
  it('excludes debt transactions from operational KPI totals', () => {
    const operationalTransactions = filterTransactionsByDebtMode(
      [...dataset],
      OPERATIONAL_DEBT_MODE
    );
    const totals = sumByType(operationalTransactions);

    expect(operationalTransactions).toHaveLength(2);
    expect(totals.income).toBe(10000);
    expect(totals.expense).toBe(3500);
  });

  it('includes only debt transactions in debt portfolio mode', () => {
    const debtTransactions = filterTransactionsByDebtMode(
      [...dataset],
      DEBT_PORTFOLIO_MODE
    );
    const totals = sumByType(debtTransactions);

    expect(debtTransactions).toHaveLength(2);
    expect(totals.income).toBe(9000);
    expect(totals.expense).toBe(1200);
  });

  it('preserves legacy behavior for transactions without debt metadata', () => {
    const legacyTransactions = [
      {
        id: 'legacy-1',
        type: TransactionType.EXPENSE,
        amountBaseMinor: 500,
      },
      {
        id: 'legacy-2',
        type: TransactionType.INCOME,
        amountBaseMinor: 1200,
      },
    ];

    const operationalTransactions = filterTransactionsByDebtMode(
      legacyTransactions,
      OPERATIONAL_DEBT_MODE
    );

    expect(operationalTransactions).toHaveLength(2);
    expect(sumByType(operationalTransactions)).toEqual({
      income: 1200,
      expense: 500,
    });
  });
});
