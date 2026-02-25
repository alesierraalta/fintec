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
      return null;
    }

    return parsed;
  } catch {
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
      JSON.stringify(cache)
    );
  } catch {
    // Ignore persistence failures to avoid blocking UX.
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
  } catch {
    // Ignore cleanup failures to avoid blocking sign-out.
  }
}
