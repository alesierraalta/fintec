import { Transaction } from '@/types';

export const DEFAULT_TRANSACTION_DISPLAY_NAME = 'Transacción sin descripción';

export function getTransactionDisplayName(
  transaction: Transaction,
  options?: {
    categoryName?: string;
    fallback?: string;
  }
): string {
  const fallback =
    options?.fallback?.trim() || DEFAULT_TRANSACTION_DISPLAY_NAME;

  return (
    transaction.description?.trim() ||
    options?.categoryName?.trim() ||
    transaction.counterpartyName?.trim() ||
    fallback
  );
}
