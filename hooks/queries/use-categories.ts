'use client';

import { useQuery } from '@tanstack/react-query';
import { categoryKeys } from './category-keys';
import type { Category, CategoryKind } from '@/types';

interface CategoryFilters {
  kind?: CategoryKind;
  active?: boolean;
  parentId?: string;
}

interface UseCategoriesOptions {
  filters?: CategoryFilters;
  enabled?: boolean;
}

interface UseCategoriesResult {
  data: Category[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * React Query hook for fetching categories.
 *
 * Wraps useQuery with proper key management and staleTime configuration.
 * Cache TTL: 30 minutes (matching existing useOptimizedData).
 *
 * @param options - Optional filters and query options
 * @returns Query result with categories data
 */
export function useCategories(
  options: UseCategoriesOptions = {}
): UseCategoriesResult {
  const { filters, enabled = true } = options;

  const query = useQuery({
    queryKey: categoryKeys.list(filters ?? {}),
    queryFn: async (): Promise<Category[]> => {
      const params = new URLSearchParams();

      if (filters?.kind) params.set('kind', filters.kind);
      if (filters?.active !== undefined) params.set('active', String(filters.active));
      if (filters?.parentId) params.set('parentId', filters.parentId);

      const response = await fetch(`/api/categories?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const envelope = await response.json();
      return envelope.data?.categories ?? [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - matches useOptimizedData
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
