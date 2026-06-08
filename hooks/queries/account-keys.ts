import type { AccountType } from '@/types';

/**
 * Query key factory for accounts.
 *
 * Creates consistent, hierarchical React Query keys for cache management.
 *
 * Usage:
 * - accountKeys.all → ['accounts']
 * - accountKeys.lists() → ['accounts', 'list']
 * - accountKeys.list({ type: 'BANK' }) → ['accounts', 'list', { type: 'BANK' }]
 * - accountKeys.detail('acc-1') → ['accounts', 'detail', 'acc-1']
 */
export const accountKeys = {
  /** Root key for all account queries */
  all: ['accounts'] as const,

  /** Key for all list queries */
  lists: () => [...accountKeys.all, 'list'] as const,

  /** Key for a specific filtered list */
  list: (filters: { type?: AccountType; active?: boolean; currencyCode?: string }) =>
    [...accountKeys.lists(), filters] as const,

  /** Key for all detail queries */
  details: () => [...accountKeys.all, 'detail'] as const,

  /** Key for a specific account detail */
  detail: (id: string) => [...accountKeys.details(), id] as const,

  /** Key for balance summary */
  balanceSummary: () => [...accountKeys.all, 'balance-summary'] as const,
};
