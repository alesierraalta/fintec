import type { CategoryKind } from '@/types';

/**
 * Query key factory for categories.
 *
 * Creates consistent, hierarchical React Query keys for cache management.
 *
 * Usage:
 * - categoryKeys.all → ['categories']
 * - categoryKeys.lists() → ['categories', 'list']
 * - categoryKeys.list({ kind: 'EXPENSE' }) → ['categories', 'list', { kind: 'EXPENSE' }]
 * - categoryKeys.detail('cat-1') → ['categories', 'detail', 'cat-1']
 */
export const categoryKeys = {
  /** Root key for all category queries */
  all: ['categories'] as const,

  /** Key for all list queries */
  lists: () => [...categoryKeys.all, 'list'] as const,

  /** Key for a specific filtered list */
  list: (filters: { kind?: CategoryKind; active?: boolean; parentId?: string }) =>
    [...categoryKeys.lists(), filters] as const,

  /** Key for all detail queries */
  details: () => [...categoryKeys.all, 'detail'] as const,

  /** Key for a specific category detail */
  detail: (id: string) => [...categoryKeys.details(), id] as const,

  /** Key for category tree */
  tree: (kind?: CategoryKind) =>
    [...categoryKeys.all, 'tree', kind] as const,
};
