import type { TransactionFilters } from '@/lib/services/transaction-service.interface';

/**
 * Query key factory for transactions.
 *
 * Creates consistent, hierarchical React Query keys for cache management.
 * Follows the factory pattern from the design doc.
 *
 * Usage:
 * - transactionKeys.all → ['transactions']
 * - transactionKeys.lists() → ['transactions', 'list']
 * - transactionKeys.list({ type: 'EXPENSE' }) → ['transactions', 'list', { type: 'EXPENSE' }]
 * - transactionKeys.detail('tx-1') → ['transactions', 'detail', 'tx-1']
 */
export const transactionKeys = {
  /** Root key for all transaction queries */
  all: ['transactions'] as const,

  /** Key for all list queries */
  lists: () => [...transactionKeys.all, 'list'] as const,

  /** Key for a specific filtered list */
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,

  /** Key for all detail queries */
  details: () => [...transactionKeys.all, 'detail'] as const,

  /** Key for a specific transaction detail */
  detail: (id: string) => [...transactionKeys.details(), id] as const,

  /** Key for monthly report */
  monthlyReport: (year: number, month: number) =>
    [...transactionKeys.all, 'monthly', year, month] as const,

  /** Cache tag factory for targeted invalidation */
  tags: {
    /** Tag for all transactions */
    all: () => [...transactionKeys.all, 'tag'] as const,

    /** Tag for transaction list queries */
    list: () => [...transactionKeys.all, 'tag', 'list'] as const,

    /** Tag for a specific transaction detail */
    detail: (id: string) => [...transactionKeys.all, 'tag', 'detail', id] as const,

    /** Tag for monthly report queries */
    monthlyReport: (year: number, month: number) =>
      [...transactionKeys.all, 'tag', 'monthly', year, month] as const,

    /** Tag for account-scoped queries */
    byAccount: (accountId: string) =>
      [...transactionKeys.all, 'tag', 'account', accountId] as const,
  },

  /** Invalidation helpers that return tags to invalidate */
  invalidate: {
    /** Returns tags for all list invalidation */
    all: () => [
      transactionKeys.tags.list(),
    ],

    /** Returns tags for a specific transaction detail */
    detail: (id: string) => [
      transactionKeys.tags.detail(id),
    ],

    /** Returns tags for account-related invalidation */
    byAccount: (accountId: string) => [
      transactionKeys.tags.byAccount(accountId),
      transactionKeys.tags.list(),
    ],
  },
};
