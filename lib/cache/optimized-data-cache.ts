import { logger } from '@/lib/utils/logger';

export interface OptimizedDataCache {
  transactions: any[];
  accounts: any[];
  categories: any[];
  lastUpdated: {
    transactions: number;
    accounts: number;
    categories: number;
  };
}

const CACHE_STORAGE_PREFIX = 'fintec_data_cache_v1';
const LEGACY_CACHE_STORAGE_KEY = 'fintec_data_cache_v1';

/** Maximum number of transaction rows kept in the persisted cache. */
export const MAX_CACHED_TRANSACTIONS = 150;

/**
 * Fields preserved when projecting transactions for persistence. Matches what
 * current `useOptimizedData` consumers read from the cached list (list rows,
 * detail panel, reports, edit form); heavy/unread fields (e.g. `updatedAt`)
 * and any future additions are deliberately dropped to keep the localStorage
 * payload bounded.
 */
const TRANSACTION_CACHE_FIELDS = [
  'id',
  'type',
  'accountId',
  'categoryId',
  'currencyCode',
  'amountMinor',
  'amountBaseMinor',
  'exchangeRate',
  'date',
  'description',
  'note',
  'tags',
  'pending',
  'transferId',
  'createdAt',
  'isDebt',
  'debtDirection',
  'debtStatus',
  'paidAmountMinor',
  'paidAmountBaseMinor',
  'remainingAmountMinor',
  'remainingAmountBaseMinor',
  'counterpartyName',
  'settledAt',
] as const;

function projectCacheForPersistence(
  cache: OptimizedDataCache
): OptimizedDataCache {
  return {
    ...cache,
    transactions: cache.transactions
      .slice(0, MAX_CACHED_TRANSACTIONS)
      .map((t) => {
        const projected: Record<string, unknown> = {};
        for (const field of TRANSACTION_CACHE_FIELDS) {
          if (field in t) {
            projected[field] = t[field];
          }
        }
        return projected;
      }),
  };
}

export function createEmptyOptimizedDataCache(): OptimizedDataCache {
  return {
    transactions: [],
    accounts: [],
    categories: [],
    lastUpdated: {
      transactions: 0,
      accounts: 0,
      categories: 0,
    },
  };
}

export function getOptimizedDataCacheKey(userId: string): string {
  return `${CACHE_STORAGE_PREFIX}:${userId}`;
}

function isValidCacheShape(value: any): value is OptimizedDataCache {
  return Boolean(
    value &&
      Array.isArray(value.transactions) &&
      Array.isArray(value.accounts) &&
      Array.isArray(value.categories) &&
      value.lastUpdated &&
      typeof value.lastUpdated.transactions === 'number' &&
      typeof value.lastUpdated.accounts === 'number' &&
      typeof value.lastUpdated.categories === 'number'
  );
}

export function loadOptimizedDataCache(
  userId: string
): OptimizedDataCache | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(getOptimizedDataCacheKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!isValidCacheShape(parsed)) {
      logger.warn('[optimized-data-cache] invalid cache payload for user');
      return null;
    }

    return parsed;
  } catch (error) {
    logger.warn('[optimized-data-cache] failed to read cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function persistOptimizedDataCache(
  userId: string,
  cache: OptimizedDataCache
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(
      getOptimizedDataCacheKey(userId),
      JSON.stringify(projectCacheForPersistence(cache))
    );
  } catch (error) {
    logger.warn('[optimized-data-cache] failed to persist cache', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function clearAllOptimizedDataCaches(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(LEGACY_CACHE_STORAGE_KEY);
  } catch (error) {
    logger.warn('[optimized-data-cache] failed to clear caches', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
