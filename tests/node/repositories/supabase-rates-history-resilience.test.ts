import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { RequestContext } from '@/lib/cache/request-context';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { isBackendSharedReadCacheEnabled } from '@/lib/backend/feature-flags';

jest.mock('@/lib/backend/feature-flags');

describe('SupabaseRatesHistoryRepository Resilience', () => {
  let mockClient: any;
  let mockRedis: any;
  let readCache: ServerReadCache;
  let requestContext: RequestContext;
  let repo: SupabaseRatesHistoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (isBackendSharedReadCacheEnabled as jest.Mock).mockReturnValue(true);

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    readCache = new ServerReadCache(mockRedis);
    requestContext = new RequestContext();
    
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    repo = new SupabaseRatesHistoryRepository(mockClient, requestContext, readCache);
  });

  describe('listBCVRatesSince Resilience', () => {
    const date = '2026-01-01';
    const cacheKey = `rates_history:bcv:since:${date}`;
    const mockData = [{ date: '2026-01-01', usd: 36.5, eur: 40.0, source: 'bcv', timestamp: '2026-01-01T12:00:00Z' }];

    test('RED: should fallback to stale cache on Supabase ENOTFOUND', async () => {
      // GIVEN: Supabase fails with ENOTFOUND
      mockClient.maybeSingle.mockResolvedValue({ data: null, error: { message: 'getaddrinfo ENOTFOUND bfxkcmoccqgvkrrkkdju.supabase.co' } });
      // In repository-impl.ts, listBCVRatesSince uses .from().select().gte().order()
      // We need to mock the last call in the chain
      (mockClient.order as jest.Mock).mockResolvedValue({ data: null, error: { message: 'getaddrinfo ENOTFOUND' } });

      // AND: Cache has stale data (expiresAt in past)
      const staleValue = {
        value: mockData,
        expiresAt: Date.now() - 10000
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(staleValue));

      // WHEN: calling listBCVRatesSince
      const result = await repo.listBCVRatesSince(date);

      // THEN: returns stale data instead of throwing
      expect(result).toEqual(mockData);
      expect(mockClient.order).toHaveBeenCalled();
      // Should have attempted to get stale cache
      expect(mockRedis.get).toHaveBeenCalledWith(cacheKey);
    });

    test('RED: should retry on 503 before failing', async () => {
      // GIVEN: Supabase returns 503 (retryable)
      (mockClient.order as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Database Unavailable (503)' } });
      
      // AND: Cache is empty
      mockRedis.get.mockResolvedValue(null);

      // WHEN / THEN: calling should throw after retries
      await expect(repo.listBCVRatesSince(date)).rejects.toThrow(/Database Unavailable/);
      
      // Verify retries (default 3 attempts)
      expect(mockClient.order).toHaveBeenCalledTimes(3);
    });
  });

  describe('listBinanceRatesSince Resilience', () => {
    const date = '2026-01-01';
    const cacheKey = `rates_history:binance:since:${date}`;
    const mockData = [{ date: '2026-01-01', usd: 36.5, source: 'binance', timestamp: '2026-01-01T12:00:00Z' }];

    test('should fallback to stale cache on Supabase network error', async () => {
      // GIVEN: Supabase fails
      (mockClient.order as jest.Mock).mockResolvedValue({ data: null, error: { message: 'ETIMEDOUT' } });

      // AND: Cache has stale data
      const staleValue = { value: mockData, expiresAt: Date.now() - 10000 };
      mockRedis.get.mockResolvedValue(JSON.stringify(staleValue));

      // WHEN: calling
      const result = await repo.listBinanceRatesSince(date);

      // THEN: returns stale
      expect(result).toEqual(mockData);
      expect(mockClient.order).toHaveBeenCalled();
    });
  });

  describe('getLatestExchangeRateSnapshot Resilience', () => {
    const cacheKey = 'rates_history:snapshots:latest';
    const mockData = { usdVes: 36.5, usdtVes: 37.0, sellRate: 36.8, buyRate: 36.2, lastUpdated: '2026-01-01T12:00:00Z', source: 'binance' };

    test('should fallback to stale cache on 5xx', async () => {
      // GIVEN: Supabase fails with 500
      // In getLatestExchangeRateSnapshot: .from().select().order().limit().maybeSingle()
      (mockClient.maybeSingle as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Database error (500)' } });

      // AND: Cache has stale data
      const staleValue = { value: mockData, expiresAt: Date.now() - 10000 };
      mockRedis.get.mockResolvedValue(JSON.stringify(staleValue));

      // WHEN: calling
      const result = await repo.getLatestExchangeRateSnapshot();

      // THEN: returns stale
      expect(result).toEqual(mockData);
    });
  });
});
