/**
 * Binance Rates Service
 * Handles fetching, caching, and managing Binance P2P exchange rates
 * Extracted from currency-service.ts as part of Phase 3 refactoring
 */

import type { BinanceRates } from '@/types/rates';
import { binanceHistoryService, BinanceTrend } from './binance-history-service';
import { logger } from '@/lib/utils/logger';

class BinanceRatesService {
  private static instance: BinanceRatesService;
  private cachedRates: BinanceRates | null = null;
  private cachedAt = 0;
  private inFlightFetch: Promise<BinanceRates> | null = null;
  private static readonly FRESH_CACHE_WINDOW_MS = 30 * 1000;

  private constructor() {}

  static getInstance(): BinanceRatesService {
    if (!BinanceRatesService.instance) {
      BinanceRatesService.instance = new BinanceRatesService();
    }
    return BinanceRatesService.instance;
  }

  /**
   * Fetch Binance P2P rates from API with fallback strategies
   * @returns Promise<BinanceRates>
   */
  async fetchRates(): Promise<BinanceRates> {
    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    if (
      this.cachedRates &&
      Date.now() - this.cachedAt < BinanceRatesService.FRESH_CACHE_WINDOW_MS
    ) {
      return this.cachedRates;
    }

    const fetchPromise = this.fetchRatesInternal();
    this.inFlightFetch = fetchPromise;

    try {
      return await fetchPromise;
    } finally {
      this.inFlightFetch = null;
    }
  }

  private async fetchRatesInternal(): Promise<BinanceRates> {
    try {
      const response = await fetch('/api/binance-rates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (
          response.status >= 500 ||
          response.status === 404 ||
          response.status === 503
        ) {
          logger.warn(
            `[BinanceRatesService] API returned ${response.status}, attempting local fallback`
          );
          // Continue to catch block for local fallback
          throw new Error(`API_ERROR_${response.status}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // * Handle the actual API response structure from Python scraper
        const rates: BinanceRates = {
          usd_ves: result.data.usd_ves,
          usdt_ves: result.data.usdt_ves,
          busd_ves: result.data.busd_ves || result.data.usdt_ves,
          sell_rate: {
            min: result.data.sell_min || result.data.sell_rate || 228.5,
            avg: result.data.sell_avg || result.data.sell_rate || 228.5,
            max: result.data.sell_max || result.data.sell_rate || 228.5,
          },
          buy_rate: {
            min: result.data.buy_min || result.data.buy_rate || 228.0,
            avg: result.data.buy_avg || result.data.buy_rate || 228.0,
            max: result.data.buy_max || result.data.buy_rate || 228.0,
          },
          spread: result.data.spread,
          sell_prices_used: result.data.sell_prices_used,
          buy_prices_used: result.data.buy_prices_used,
          prices_used: result.data.prices_used,
          price_range: result.data.price_range,
          lastUpdated: result.data.lastUpdated || new Date().toISOString(),
        };

        this.cachedRates = rates;
        this.cachedAt = Date.now();

        // * Save to history
        try {
          await binanceHistoryService.saveRates(rates.usd_ves);
        } catch (historyError) {
          logger.error(
            '[BinanceRatesService] Failed to save rates to history:',
            {
              error: historyError,
              usd: rates.usd_ves,
            }
          );
        }

        return rates;
      } else {
        // * Use fallback data if API returns error but has fallback
        if (result.fallback && result.data) {
          const fallbackRates: BinanceRates = {
            usd_ves: result.data.usd_ves || 228.25,
            usdt_ves: result.data.usdt_ves || 228.25,
            busd_ves: result.data.busd_ves || result.data.usdt_ves || 228.25,
            sell_rate: {
              min: result.data.sell_min || result.data.sell_rate || 228.5,
              avg: result.data.sell_avg || result.data.sell_rate || 228.5,
              max: result.data.sell_max || result.data.sell_rate || 228.5,
            },
            buy_rate: {
              min: result.data.buy_min || result.data.buy_rate || 228.0,
              avg: result.data.buy_avg || result.data.buy_rate || 228.0,
              max: result.data.buy_max || result.data.buy_rate || 228.0,
            },
            spread: result.data.spread || 0.5,
            sell_prices_used: result.data.sell_prices_used || 0,
            buy_prices_used: result.data.buy_prices_used || 0,
            prices_used: result.data.prices_used || 0,
            price_range: result.data.price_range || {
              sell_min: 228.5,
              sell_max: 228.5,
              buy_min: 228.0,
              buy_max: 228.0,
              min: 228.0,
              max: 228.5,
            },
            lastUpdated: result.data.lastUpdated || new Date().toISOString(),
          };

          this.cachedRates = fallbackRates;
          this.cachedAt = Date.now();
          return fallbackRates;
        }

        throw new Error(result.error || 'Unknown error fetching Binance rates');
      }
    } catch (error) {
      logger.error('[BinanceRatesService] Error fetching rates:', error);

      // * Return cached rates if available
      if (this.cachedRates) {
        logger.info('[BinanceRatesService] Returning cached rates');
        return this.cachedRates;
      }

      // * Last resort: hardcoded fallback
      logger.warn('[BinanceRatesService] Using hardcoded fallback rates');
      const fallbackRates: BinanceRates = {
        usd_ves: 228.5,
        usdt_ves: 228.5,
        busd_ves: 228.5,
        sell_rate: {
          min: 228.5,
          avg: 228.5,
          max: 228.5,
        },
        buy_rate: {
          min: 228.5,
          avg: 228.5,
          max: 228.5,
        },
        spread: 0,
        sell_prices_used: 0,
        buy_prices_used: 0,
        prices_used: 0,
        price_range: {
          sell_min: 228.5,
          sell_max: 228.5,
          buy_min: 228.5,
          buy_max: 228.5,
          min: 228.5,
          max: 228.5,
        },
        lastUpdated: new Date().toISOString(),
      };

      this.cachedRates = fallbackRates;
      this.cachedAt = Date.now();
      return fallbackRates;
    }
  }

  /**
   * Get cached Binance rates
   * @returns BinanceRates | null
   */
  getCachedRates(): BinanceRates | null {
    return this.cachedRates;
  }

  /**
   * Get Binance trends from history
   * @returns Promise<{ usdVes: { '1d': BinanceTrend; '1w': BinanceTrend; '1m': BinanceTrend } } | null>
   */
  async getTrends(): Promise<{
    usdVes: { '1d': BinanceTrend; '1w': BinanceTrend; '1m': BinanceTrend };
  } | null> {
    try {
      const trends = await binanceHistoryService.getMultiPeriodTrends();
      if (!trends) return null;

      return {
        usdVes: trends,
      };
    } catch (error) {
      logger.error('[BinanceRatesService] Error getting trends:', error);
      return null;
    }
  }

  /**
   * Clear cached rates (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cachedRates = null;
    this.cachedAt = 0;
    this.inFlightFetch = null;
  }
}

export const binanceRatesService = BinanceRatesService.getInstance();
export { BinanceRatesService };
