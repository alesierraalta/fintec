import { logger } from '@/lib/utils/logger';

export type OptimizedDataDomain = 'transactions' | 'accounts' | 'categories';

export interface OptimizedDataCache {
  transactions: any[];
  accounts: any[];
  categories: any[];
  lastUpdated: Record<OptimizedDataDomain, number>;
}

const CACHE_STORAGE_PREFIX = 'fintec_data_cache_v1';
const LEGACY_CACHE_STORAGE_KEY = 'fintec_data_cache_v1';
export const MAX_CACHED_TRANSACTIONS = 150;
const TRANSACTION_CACHE_FIELDS = [
  'id', 'type', 'accountId', 'categoryId', 'currencyCode', 'amountMinor',
  'amountBaseMinor', 'exchangeRate', 'date', 'description', 'note', 'tags',
  'pending', 'transferId', 'createdAt', 'isDebt', 'debtDirection', 'debtStatus',
  'paidAmountMinor', 'paidAmountBaseMinor', 'remainingAmountMinor',
  'remainingAmountBaseMinor', 'counterpartyName', 'settledAt',
] as const;

export function createEmptyOptimizedDataCache(): OptimizedDataCache {
  return {
    transactions: [],
    accounts: [],
    categories: [],
    lastUpdated: { transactions: 0, accounts: 0, categories: 0 },
  };
}

export function getOptimizedDataCacheKey(userId: string): string {
  return `${CACHE_STORAGE_PREFIX}:${userId}`;
}

function projectCacheForPersistence(cache: OptimizedDataCache): OptimizedDataCache {
  return {
    ...cache,
    transactions: cache.transactions.slice(0, MAX_CACHED_TRANSACTIONS).map((transaction) =>
      Object.fromEntries(
        TRANSACTION_CACHE_FIELDS
          .filter((field) => field in transaction)
          .map((field) => [field, transaction[field]]),
      ),
    ),
  };
}

function isValidCacheShape(value: unknown): value is Partial<OptimizedDataCache> & {
  lastUpdated: Partial<Record<OptimizedDataDomain, number>>;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const timestamps = candidate.lastUpdated;
  return Array.isArray(candidate.transactions) && Array.isArray(candidate.accounts)
    && Array.isArray(candidate.categories) && !!timestamps && typeof timestamps === 'object'
    && Object.values(timestamps).every((timestamp) => typeof timestamp === 'number');
}

export function loadOptimizedDataCache(userId: string): OptimizedDataCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getOptimizedDataCacheKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidCacheShape(parsed)) {
      logger.warn('[optimized-data-cache] invalid cache payload for user');
      return null;
    }
    const empty = createEmptyOptimizedDataCache();
    return {
      transactions: parsed.transactions ?? [],
      accounts: parsed.accounts ?? [],
      categories: parsed.categories ?? [],
      lastUpdated: { ...empty.lastUpdated, ...parsed.lastUpdated },
    };
  } catch (error) {
    logger.warn('[optimized-data-cache] failed to read cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function persistOptimizedDataCache(userId: string, cache: OptimizedDataCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getOptimizedDataCacheKey(userId), JSON.stringify(projectCacheForPersistence(cache)));
  } catch (error) {
    logger.warn('[optimized-data-cache] failed to persist cache', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function clearAllOptimizedDataCaches(): void {
  const users = new Set([...snapshots.keys(), ...listeners.keys()]);
  snapshots.clear();
  if (typeof window !== 'undefined') {
    try {
      const keys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(CACHE_STORAGE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem(LEGACY_CACHE_STORAGE_KEY);
    } catch (error) {
      logger.warn('[optimized-data-cache] failed to clear caches', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  users.forEach((userId) => notify(userId));
}

const EMPTY_SNAPSHOT = createEmptyOptimizedDataCache();
const snapshots = new Map<string, OptimizedDataCache>();
const listeners = new Map<string, Set<() => void>>();
let batchDepth = 0;
const pendingNotifications = new Set<string>();

export function getOptimizedDataSnapshot(userId: string | null): OptimizedDataCache {
  if (!userId) return EMPTY_SNAPSHOT;
  let snapshot = snapshots.get(userId);
  if (!snapshot) {
    snapshot = loadOptimizedDataCache(userId) ?? createEmptyOptimizedDataCache();
    snapshots.set(userId, snapshot);
  }
  return snapshot;
}

export function subscribeOptimizedData(userId: string | null, listener: () => void): () => void {
  if (!userId) return () => undefined;
  const scopedListeners = listeners.get(userId) ?? new Set<() => void>();
  scopedListeners.add(listener);
  listeners.set(userId, scopedListeners);
  return () => {
    scopedListeners.delete(listener);
    if (scopedListeners.size === 0) listeners.delete(userId);
  };
}

function notify(userId: string): void {
  if (batchDepth > 0) {
    pendingNotifications.add(userId);
    return;
  }
  listeners.get(userId)?.forEach((listener) => listener());
}

export function batchOptimizedDataUpdates<T>(callback: () => T): T {
  batchDepth += 1;
  try {
    return callback();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) {
      const users = [...pendingNotifications];
      pendingNotifications.clear();
      users.forEach((userId) => notify(userId));
    }
  }
}

export function updateOptimizedDataCache(
  userId: string,
  patch: Partial<Pick<OptimizedDataCache, OptimizedDataDomain>>,
  domains?: OptimizedDataDomain[],
): OptimizedDataCache {
  const current = getOptimizedDataSnapshot(userId);
  const changedDomains = domains ?? (Object.keys(patch) as OptimizedDataDomain[]);
  const next: OptimizedDataCache = {
    ...current,
    ...patch,
    lastUpdated: { ...current.lastUpdated },
  };
  changedDomains.forEach((domain) => { next.lastUpdated[domain] = Date.now(); });
  snapshots.set(userId, next);
  persistOptimizedDataCache(userId, next);
  notify(userId);
  return next;
}

export function invalidateOptimizedDataCache(
  userId: string,
  domain?: OptimizedDataDomain,
): OptimizedDataCache {
  if (domain) return updateOptimizedDataCache(userId, { [domain]: [] }, [domain]);
  return updateOptimizedDataCache(userId, {
    transactions: [], accounts: [], categories: [],
  }, ['transactions', 'accounts', 'categories']);
}

export function resetOptimizedDataStore(): void {
  clearAllOptimizedDataCaches();
}

export const subscribe = subscribeOptimizedData;
export const getSnapshot = getOptimizedDataSnapshot;
export const update = updateOptimizedDataCache;
export const invalidate = invalidateOptimizedDataCache;
