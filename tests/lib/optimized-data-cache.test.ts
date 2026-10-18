import {
  createEmptyOptimizedDataCache,
  getOptimizedDataCacheKey,
  loadOptimizedDataCache,
  persistOptimizedDataCache,
  clearAllOptimizedDataCaches,
  markOptimizedDataCacheStale,
  updateOptimizedDataCache,
  MAX_CACHED_TRANSACTIONS,
} from '@/lib/cache/optimized-data-cache';

describe('optimized data cache storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isolates persisted cache by user id', () => {
    const cacheA = createEmptyOptimizedDataCache();
    cacheA.transactions = [{ id: 'tx-a' } as any];

    const cacheB = createEmptyOptimizedDataCache();
    cacheB.transactions = [{ id: 'tx-b' } as any];

    persistOptimizedDataCache('user-a', cacheA);
    persistOptimizedDataCache('user-b', cacheB);

    expect(getOptimizedDataCacheKey('user-a')).not.toEqual(
      getOptimizedDataCacheKey('user-b')
    );
    expect(loadOptimizedDataCache('user-a')?.transactions).toEqual([
      { id: 'tx-a' },
    ]);
    expect(loadOptimizedDataCache('user-b')?.transactions).toEqual([
      { id: 'tx-b' },
    ]);
  });

  it('does not load a legacy global payload for a user', () => {
    const legacyCache = createEmptyOptimizedDataCache();
    legacyCache.transactions = [{ id: 'global-tx' }] as any;
    localStorage.setItem('fintec_data_cache_v1', JSON.stringify(legacyCache));

    expect(loadOptimizedDataCache('user-a')).toBeNull();
  });

  it('clears all user-scoped and legacy cache keys', () => {
    localStorage.setItem('fintec_data_cache_v1:user-a', '{}');
    localStorage.setItem('fintec_data_cache_v1:user-b', '{}');
    localStorage.setItem('fintec_data_cache_v1', '{}');

    clearAllOptimizedDataCaches();

    expect(localStorage.getItem('fintec_data_cache_v1:user-a')).toBeNull();
    expect(localStorage.getItem('fintec_data_cache_v1:user-b')).toBeNull();
    expect(localStorage.getItem('fintec_data_cache_v1')).toBeNull();
  });
});

describe('optimized data cache projection and bounds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists at most MAX_CACHED_TRANSACTIONS transaction rows', () => {
    const cache = createEmptyOptimizedDataCache();
    cache.transactions = Array.from({ length: 200 }, (_, i) => ({
      id: `tx-${i}`,
    })) as any;

    persistOptimizedDataCache('user-a', cache);

    const loaded = loadOptimizedDataCache('user-a');
    expect(loaded?.transactions).toHaveLength(MAX_CACHED_TRANSACTIONS);
    expect(loaded?.transactions[0]).toEqual({ id: 'tx-0' });
  });

  it('persists only the projected transaction fields', () => {
    const cache = createEmptyOptimizedDataCache();
    cache.transactions = [
      {
        id: 'tx-1',
        type: 'EXPENSE',
        amountMinor: 100,
        currencyCode: 'USD',
        note: 'projected note',
        updatedAt: 'should-be-dropped',
        heavyField: { big: [1, 2, 3] },
      } as any,
    ];

    persistOptimizedDataCache('user-a', cache);

    const loaded = loadOptimizedDataCache('user-a');
    expect(loaded?.transactions[0]).toEqual({
      id: 'tx-1',
      type: 'EXPENSE',
      amountMinor: 100,
      currencyCode: 'USD',
      note: 'projected note',
    });
  });

  it('hydrates a legacy full-object payload already in localStorage', () => {
    const legacyCache = createEmptyOptimizedDataCache();
    legacyCache.transactions = [
      { id: 'tx-legacy', type: 'EXPENSE', updatedAt: 'keep-me' },
    ] as any;
    localStorage.setItem(
      getOptimizedDataCacheKey('user-a'),
      JSON.stringify(legacyCache)
    );

    const loaded = loadOptimizedDataCache('user-a');
    expect(loaded?.transactions).toEqual([
      { id: 'tx-legacy', type: 'EXPENSE', updatedAt: 'keep-me' },
    ]);
  });
});

describe('optimized data cache freshness', () => {
  beforeEach(() => {
    clearAllOptimizedDataCaches();
    localStorage.clear();
  });

  it('marks a domain stale without dropping cached rows', () => {
    updateOptimizedDataCache('user-a', { transactions: [{ id: 'tx-1' }] }, [
      'transactions',
    ]);

    const stale = markOptimizedDataCacheStale('user-a', 'transactions');

    expect(stale.transactions).toEqual([{ id: 'tx-1' }]);
    expect(stale.lastUpdated.transactions).toBe(0);
    expect(loadOptimizedDataCache('user-a')?.transactions).toEqual([
      { id: 'tx-1' },
    ]);
    expect(loadOptimizedDataCache('user-a')?.lastUpdated.transactions).toBe(0);
  });
});

describe('optimized data cache failure semantics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for a corrupted payload without crashing', () => {
    localStorage.setItem(getOptimizedDataCacheKey('user-a'), 'not-json{{');

    expect(loadOptimizedDataCache('user-a')).toBeNull();
  });
});
