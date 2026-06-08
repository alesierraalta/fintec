'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionKeys } from './transaction-keys';
import type { TransactionFilters } from '@/lib/services/transaction-service.interface';
import type { Transaction } from '@/types';

interface UseTransactionsOptions {
  filters?: TransactionFilters;
  enabled?: boolean;
}

interface UseTransactionsResult {
  data: Transaction[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * React Query hook for fetching transactions.
 *
 * Wraps useQuery with proper key management and staleTime configuration.
 * Cache TTL: 2 minutes (matching existing useOptimizedData).
 *
 * @param options - Optional filters and query options
 * @returns Query result with transactions data
 */
export function useTransactions(
  options: UseTransactionsOptions = {}
): UseTransactionsResult {
  const { filters, enabled = true } = options;

  const query = useQuery({
    queryKey: transactionKeys.list(filters ?? {}),
    queryFn: async (): Promise<Transaction[]> => {
      const params = new URLSearchParams();

      if (filters?.type) params.set('type', filters.type);
      if (filters?.accountId) params.set('accountId', filters.accountId);
      if (filters?.categoryId) params.set('categoryId', filters.categoryId);
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await fetch(`/api/transactions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const envelope = await response.json();
      return envelope.data?.transactions ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - matches useOptimizedData
    enabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Cache Invalidation Helpers ───────────────────────────────────────────────

interface InvalidationContext {
  type: 'create' | 'update' | 'delete';
  transactionId?: string;
  accountId?: string;
  year?: number;
  month?: number;
}

/**
 * Returns the cache tags that should be invalidated for a given transaction mutation.
 *
 * @param context - Mutation context with operation type and identifiers
 * @returns Array of query key tags to invalidate
 */
export function getInvalidationKeys(context: InvalidationContext): (string | number)[][] {
  const tags: (string | number)[][] = [
    [...transactionKeys.tags.list()],
  ];

  if (context.transactionId) {
    tags.push([...transactionKeys.tags.detail(context.transactionId)]);
  }

  if (context.accountId) {
    tags.push([...transactionKeys.tags.byAccount(context.accountId)]);
  }

  if (context.year !== undefined && context.month !== undefined) {
    tags.push([...transactionKeys.tags.monthlyReport(context.year, context.month)]);
  }

  return tags;
}

/**
 * Hook that provides cache invalidation callbacks for transaction mutations.
 * Use this in mutation hooks to invalidate relevant queries after a mutation.
 *
 * @returns Object with invalidation callbacks for each mutation type
 */
export function useTransactionsInvalidation() {
  const queryClient = useQueryClient();

  return {
    onTransactionCreated: (context: { accountId?: string; year?: number; month?: number }) => {
      const keys = getInvalidationKeys({ type: 'create', ...context });
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },

    onTransactionUpdated: (context: { transactionId: string; accountId?: string; year?: number; month?: number }) => {
      const keys = getInvalidationKeys({ type: 'update', ...context });
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },

    onTransactionDeleted: (context: { transactionId: string; accountId?: string }) => {
      const keys = getInvalidationKeys({ type: 'delete', ...context });
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}
