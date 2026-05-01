import type {
  BCVRateHistoryEntry,
  BinanceRateHistoryEntry,
  ExchangeRateSnapshot,
  RatesHistoryRepository,
} from '@/repositories/contracts';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RequestContext } from '@/lib/cache/request-context';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { isBackendSharedReadCacheEnabled } from '@/lib/backend/feature-flags';
import { sanitizeError, isRetryable } from '@/lib/supabase/error-handler';
import { withExponentialBackoff } from '@/lib/utils/retry-utils';
import {
  BCV_RATE_HISTORY_LIST_PROJECTION,
  BINANCE_RATE_HISTORY_LIST_PROJECTION,
  EXCHANGE_RATE_SNAPSHOT_LIST_PROJECTION,
} from './rates-history-projections';

export class SupabaseRatesHistoryRepository implements RatesHistoryRepository {
  private readonly client: SupabaseClient;
  private readonly requestContext?: RequestContext;
  private readonly readCache: ServerReadCache;

  constructor(
    client?: SupabaseClient,
    requestContext?: RequestContext,
    readCache?: ServerReadCache
  ) {
    this.client = client || createClient();
    this.requestContext = requestContext;
    // Default to a no-op cache (no Redis client) to stay client-safe
    this.readCache = readCache ?? new ServerReadCache(null);
  }

  private shouldUseSharedCache(): boolean {
    return isBackendSharedReadCacheEnabled() && this.readCache.isAvailable();
  }

  private recordCacheEvent(
    name: string,
    status: 'hit' | 'miss' | 'stale_fallback',
    value: unknown
  ) {
    if (!this.requestContext) {
      return;
    }

    const bytes = JSON.stringify(value)?.length ?? 0;
    const rowCount = Array.isArray(value) ? value.length : value ? 1 : 0;

    this.requestContext.profiler.record({
      name: `cache_${status}_${name}`,
      durationMs: 0,
      bytes,
      queryCount: 0,
      rowCount,
    });
  }

  /**
   * Internal helper to fetch data from Supabase with retry and cache fallback.
   */
  private async readThroughSharedCache<T>(
    name: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    if (!this.shouldUseSharedCache()) {
      try {
        return await withExponentialBackoff(loader, {
          attempts: 3,
        });
      } catch (error: any) {
        throw new Error(sanitizeError(error));
      }
    }

    // Try to get cached data AND metadata
    let cached: T | null = null;
    let expiresAt: number | null = null;

    try {
      // Use raw client access to see the envelope { value, expiresAt }
      const raw = await this.readCache.get<any>(key);
      if (raw && typeof raw === 'object' && 'value' in raw) {
        cached = raw.value;
        expiresAt = raw.expiresAt;
      }
    } catch (e) {
      // Cache read failed, ignore and move to loader
    }

    const isFresh = expiresAt && expiresAt > Date.now();

    if (cached !== null && isFresh) {
      this.recordCacheEvent(name, 'hit', cached);
      return cached;
    }

    try {
      const loaded = await withExponentialBackoff(loader, { attempts: 3 });
      await this.readCache.setWithMetadata(key, loaded, ttlSeconds);
      this.recordCacheEvent(name, 'miss', loaded);
      return loaded;
    } catch (error: any) {
      // Emergency Fallback: If backend fails, return STALE cache if exists
      if (cached !== null) {
        this.recordCacheEvent(name, 'stale_fallback', cached);
        return cached;
      }

      throw new Error(sanitizeError(error));
    }
  }

  private async invalidateSharedCache(): Promise<void> {
    if (!this.readCache.isAvailable()) {
      return;
    }

    await this.readCache.invalidatePattern('rates_history:*');
  }

  async upsertBCVRate(entry: BCVRateHistoryEntry): Promise<void> {
    const { error } = await this.client.from('bcv_rate_history').upsert(
      {
        date: entry.date,
        usd: entry.usd,
        eur: entry.eur,
        source: entry.source,
        timestamp: entry.timestamp,
      },
      { onConflict: 'date' }
    );

    if (error) {
      throw new Error(`Failed to sync BCV rate: ${error.message}`);
    }

    await this.invalidateSharedCache();
  }

  async listBCVRatesSince(date: string): Promise<BCVRateHistoryEntry[]> {
    const cacheKey = this.readCache.makeKey(
      'rates_history',
      'bcv',
      'since',
      date
    );

    return this.readThroughSharedCache(
      'rates_history_listBCVRatesSince',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('bcv_rate_history')
          .select(BCV_RATE_HISTORY_LIST_PROJECTION)
          .gte('date', date)
          .order('date', { ascending: false });

        if (error) {
          throw new Error(`Failed to load BCV rates: ${error.message}`);
        }

        return (data || []).map((row: any) => ({
          date: row.date,
          usd: Number(row.usd),
          eur: Number(row.eur),
          source: row.source,
          timestamp: row.timestamp,
        }));
      }
    );
  }

  async upsertBinanceRate(entry: BinanceRateHistoryEntry): Promise<void> {
    const { error } = await this.client.from('binance_rate_history').upsert(
      {
        date: entry.date,
        usd: entry.usd,
        source: entry.source,
        timestamp: entry.timestamp,
      },
      { onConflict: 'date' }
    );

    if (error) {
      throw new Error(`Failed to sync Binance rate: ${error.message}`);
    }

    await this.invalidateSharedCache();
  }

  async listBinanceRatesSince(
    date: string
  ): Promise<BinanceRateHistoryEntry[]> {
    const cacheKey = this.readCache.makeKey(
      'rates_history',
      'binance',
      'since',
      date
    );

    return this.readThroughSharedCache(
      'rates_history_listBinanceRatesSince',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('binance_rate_history')
          .select(BINANCE_RATE_HISTORY_LIST_PROJECTION)
          .gte('date', date)
          .order('date', { ascending: false });

        if (error) {
          throw new Error(`Failed to load Binance rates: ${error.message}`);
        }

        return (data || []).map((row: any) => ({
          date: row.date,
          usd: Number(row.usd),
          source: row.source,
          timestamp: row.timestamp,
        }));
      }
    );
  }

  async insertExchangeRateSnapshot(
    snapshot: ExchangeRateSnapshot
  ): Promise<void> {
    const { error } = await this.client.from('exchange_rates').insert({
      usd_ves: snapshot.usdVes,
      usdt_ves: snapshot.usdtVes,
      sell_rate: snapshot.sellRate,
      buy_rate: snapshot.buyRate,
      last_updated: snapshot.lastUpdated,
      source: snapshot.source,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(
        `Failed to store exchange rate snapshot: ${error.message}`
      );
    }

    await this.invalidateSharedCache();
  }

  async getLatestExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
    const cacheKey = this.readCache.makeKey(
      'rates_history',
      'snapshots',
      'latest'
    );

    return this.readThroughSharedCache(
      'rates_history_getLatestSnapshot',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('exchange_rates')
          .select(EXCHANGE_RATE_SNAPSHOT_LIST_PROJECTION)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(
            `Failed to fetch latest exchange rate: ${error.message}`
          );
        }

        if (!data) {
          return null;
        }

        return {
          usdVes: (data as any).usd_ves,
          usdtVes: (data as any).usdt_ves,
          sellRate: (data as any).sell_rate,
          buyRate: (data as any).buy_rate,
          lastUpdated: (data as any).last_updated,
          source: (data as any).source,
        };
      }
    );
  }

  async getLatestBCVRate(): Promise<BCVRateHistoryEntry | null> {
    const cacheKey = this.readCache.makeKey('rates_history', 'bcv', 'latest');

    return this.readThroughSharedCache(
      'rates_history_getLatestBCVRate',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('bcv_rate_history')
          .select(BCV_RATE_HISTORY_LIST_PROJECTION)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to fetch latest BCV rate: ${error.message}`);
        }

        if (!data) return null;

        const row = data as any;

        return {
          date: row.date,
          usd: Number(row.usd),
          eur: Number(row.eur),
          source: row.source,
          timestamp: row.timestamp,
        };
      }
    );
  }

  async getLatestBinanceRate(): Promise<BinanceRateHistoryEntry | null> {
    const cacheKey = this.readCache.makeKey(
      'rates_history',
      'binance',
      'latest'
    );

    return this.readThroughSharedCache(
      'rates_history_getLatestBinanceRate',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('binance_rate_history')
          .select(BINANCE_RATE_HISTORY_LIST_PROJECTION)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(
            `Failed to fetch latest Binance rate: ${error.message}`
          );
        }

        if (!data) return null;

        const row = data as any;

        return {
          date: row.date,
          usd: Number(row.usd),
          source: row.source,
          timestamp: row.timestamp,
        };
      }
    );
  }

  async listExchangeRateSnapshots(
    limit: number
  ): Promise<ExchangeRateSnapshot[]> {
    const cacheKey = this.readCache.makeKey(
      'rates_history',
      'snapshots',
      'list',
      limit.toString()
    );

    return this.readThroughSharedCache(
      'rates_history_listSnapshots',
      cacheKey,
      async () => {
        const { data, error } = await this.client
          .from('exchange_rates')
          .select(EXCHANGE_RATE_SNAPSHOT_LIST_PROJECTION)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          throw new Error(
            `Failed to fetch exchange rate history: ${error.message}`
          );
        }

        return (data || []).map((row: any) => ({
          usdVes: row.usd_ves,
          usdtVes: row.usdt_ves,
          sellRate: row.sell_rate,
          buyRate: row.buy_rate,
          lastUpdated: row.last_updated,
          source: row.source,
        }));
      }
    );
  }
}
