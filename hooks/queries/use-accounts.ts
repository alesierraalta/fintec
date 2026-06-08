'use client';

import { useQuery } from '@tanstack/react-query';
import { accountKeys } from './account-keys';
import type { Account, AccountType } from '@/types';

interface AccountFilters {
  type?: AccountType;
  active?: boolean;
  currencyCode?: string;
}

interface UseAccountsOptions {
  filters?: AccountFilters;
  enabled?: boolean;
}

interface UseAccountsResult {
  data: Account[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * React Query hook for fetching accounts.
 *
 * Wraps useQuery with proper key management and staleTime configuration.
 * Cache TTL: 10 minutes (matching existing useOptimizedData).
 *
 * @param options - Optional filters and query options
 * @returns Query result with accounts data
 */
export function useAccounts(
  options: UseAccountsOptions = {}
): UseAccountsResult {
  const { filters, enabled = true } = options;

  const query = useQuery({
    queryKey: accountKeys.list(filters ?? {}),
    queryFn: async (): Promise<Account[]> => {
      const params = new URLSearchParams();

      if (filters?.type) params.set('type', filters.type);
      if (filters?.active !== undefined) params.set('active', String(filters.active));
      if (filters?.currencyCode) params.set('currency', filters.currencyCode);

      const response = await fetch(`/api/accounts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const envelope = await response.json();
      return envelope.data?.accounts ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - matches useOptimizedData
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
