import {
  createEmptyOptimizedDataCache,
  getOptimizedDataCacheKey,
  loadOptimizedDataCache,
  persistOptimizedDataCache,
  clearAllOptimizedDataCaches,
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
