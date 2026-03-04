import { DebtMode, Transaction } from '@/types';

export const OPERATIONAL_DEBT_MODE: DebtMode = 'EXCLUDE_DEBT';
export const DEBT_PORTFOLIO_MODE: DebtMode = 'ONLY_DEBT';

export function isDebtTransaction(transaction: Partial<Transaction>): boolean {
  return transaction.isDebt === true;
}

export function matchesDebtMode(
  transaction: Partial<Transaction>,
  debtMode: DebtMode = 'ALL'
): boolean {
  const isDebt = isDebtTransaction(transaction);

  if (debtMode === 'ONLY_DEBT') {
    return isDebt;
  }

  if (debtMode === 'EXCLUDE_DEBT') {
    return !isDebt;
  }

  return true;
}

export function filterTransactionsByDebtMode<T extends Partial<Transaction>>(
  transactions: T[],
  debtMode: DebtMode = 'ALL'
): T[] {
  return transactions.filter((transaction) =>
    matchesDebtMode(transaction, debtMode)
  );
}
