import {
  TransactionType,
  type Account,
  type CreateTransactionDTO,
} from '@/types/domain';

export const RECONCILIATION_TAG = 'conciliacion';
export const RECONCILIATION_DESCRIPTION = 'Ajuste de conciliación';

export interface ReconciliationInput {
  account: Pick<Account, 'id' | 'currencyCode' | 'balance'>;
  actualBalanceMinor: number;
  date: string;
  exchangeRate?: number;
}

/**
 * Builds the single transaction that moves the recorded balance to the real
 * one. It is a regular INCOME/EXPENSE so it counts in statistics; the tag
 * keeps it identifiable. Returns null when the balances already match.
 */
export function buildReconciliationTransaction({
  account,
  actualBalanceMinor,
  date,
  exchangeRate,
}: ReconciliationInput): CreateTransactionDTO | null {
  if (!Number.isInteger(actualBalanceMinor)) {
    throw new Error('actualBalanceMinor must be an integer');
  }

  const difference = actualBalanceMinor - (Number(account.balance) || 0);
  if (difference === 0) return null;

  return {
    type: difference < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
    accountId: account.id,
    currencyCode: account.currencyCode,
    amountMinor: Math.abs(difference),
    exchangeRate: account.currencyCode === 'VES' ? exchangeRate : undefined,
    date,
    description: RECONCILIATION_DESCRIPTION,
    tags: [RECONCILIATION_TAG],
  };
}
