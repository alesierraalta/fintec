import { SupabaseExchangeRatesRepository } from '@/repositories/supabase/exchange-rates-repository-impl';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { RequestContext } from '@/lib/cache/request-context';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => {
    const store = new Map();
    return {
      get: jest.fn(async (key) => store.get(key) || null),
      set: jest.fn(async (key, value) => {
        store.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (...keys) => {
        keys.forEach((k) => store.delete(k));
        return keys.length;
      }),
      keys: jest.fn(async (pattern) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Array.from(store.keys()).filter((k) => regex.test(k));
      }),
      on: jest.fn(),
    };
  });
  return RedisMock;
});

describe('SupabaseExchangeRatesRepository Shared Cache', () => {
  let repository: SupabaseExchangeRatesRepository;
  let mockSupabase: any;
  let mockRedis: any;
  let readCache: ServerReadCache;
  let context: RequestContext;

  beforeEach(() => {
    // Enable flag for tests
    process.env.BACKEND_SHARED_READ_CACHE = '1';

    mockRedis = new Redis();
    readCache = new ServerReadCache(mockRedis);
    context = new RequestContext('user-1', 1.0);

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'rate-1',
                rate: 1.5,
                base_currency: 'USD',
                quote_currency: 'EUR',
                date: '2026-04-09',
              },
              error: null,
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'rate-1',
                rate: 1.5,
                base_currency: 'USD',
                quote_currency: 'EUR',
                date: '2026-04-09',
              },
              error: null,
            }),
          })),
          order: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'rate-1',
                    rate: 1.5,
                    base_currency: 'USD',
                    quote_currency: 'EUR',
                    date: '2026-04-09',
                  },
                ],
                error: null,
              }),
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'rate-2', rate: 2.0 },
              error: null,
            }),
          })),
        })),
      })),
    };

    repository = new SupabaseExchangeRatesRepository(
      mockSupabase as any,
      context,
      readCache
    );
  });

  afterEach(() => {
    delete process.env.BACKEND_SHARED_READ_CACHE;
    jest.clearAllMocks();
  });

  it('should have the feature flag enabled', () => {
    const {
      isBackendSharedReadCacheEnabled,
    } = require('@/lib/backend/feature-flags');
    expect(isBackendSharedReadCacheEnabled()).toBe(true);
  });

  it('findAll should miss on first call and hit on second call', async () => {
    // Debug info
    console.log(
      'Shared Cache Enabled:',
      (repository as any).shouldUseSharedCache()
    );
    // 1. First call (MISS)
    const result1 = await repository.findAll();
    expect(mockSupabase.from).toHaveBeenCalledWith('exchange_rates');
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalled();

    // Verify profiler recorded miss
    const events = context.profiler.events;
    expect(
      events.find((m) => m.name === 'cache_miss_exchange_rates_findAll')
    ).toBeDefined();

    // 2. Second call (HIT)
    jest.clearAllMocks();
    const result2 = await repository.findAll();
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
    expect(result2).toEqual(result1);

    // Verify profiler recorded hit
    const events2 = context.profiler.events;
    expect(
      events2.find((m) => m.name === 'cache_hit_exchange_rates_findAll')
    ).toBeDefined();
  });

  it('findById should use cache after hardening', async () => {
    // 1. First call (MISS)
    await repository.findById('rate-1');
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRedis.set).toHaveBeenCalled();

    // 2. Second call (HIT)
    jest.clearAllMocks();
    await repository.findById('rate-1');
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockRedis.get).toHaveBeenCalled();
  });

  it('update should invalidate the cache', async () => {
    // 1. Fill cache
    await repository.findAll();
    expect(await mockRedis.get('exchange_rates:list')).toBeDefined();

    // 2. Perform update
    mockSupabase.from.mockReturnValueOnce({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'rate-1', rate: 1.6 },
              error: null,
            }),
          })),
        })),
      })),
    });

    await repository.update('rate-1', { id: 'rate-1', rate: 1.6 });

    // 3. Verify Redis del was called (via invalidatePattern)
    expect(mockRedis.keys).toHaveBeenCalledWith('exchange_rates:*');
    expect(mockRedis.del).toHaveBeenCalled();

    // 4. Verify next read is a MISS
    jest.clearAllMocks();
    await repository.findAll();
    expect(mockSupabase.from).toHaveBeenCalled();
  });
});
