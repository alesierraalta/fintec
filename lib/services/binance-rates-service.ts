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

    private constructor() { }

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
        try {
            const response = await fetch('/api/binance-rates', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
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
                        min: result.data.sell_min || result.data.sell_rate || 228.50,
                        avg: result.data.sell_avg || result.data.sell_rate || 228.50,
                        max: result.data.sell_max || result.data.sell_rate || 228.50
                    },
                    buy_rate: {
                        min: result.data.buy_min || result.data.buy_rate || 228.00,
                        avg: result.data.buy_avg || result.data.buy_rate || 228.00,
                        max: result.data.buy_max || result.data.buy_rate || 228.00
                    },
                    spread: result.data.spread,
                    sell_prices_used: result.data.sell_prices_used,
                    buy_prices_used: result.data.buy_prices_used,
                    prices_used: result.data.prices_used,
                    price_range: result.data.price_range,
                    lastUpdated: result.data.lastUpdated || new Date().toISOString()
                };

                this.cachedRates = rates;

                // * Save to history
                try {
                    await binanceHistoryService.saveRates(rates.usd_ves);
                } catch (historyError) {
                    logger.warn('[BinanceRatesService] Failed to save rates to history:', historyError);
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
                            min: result.data.sell_min || result.data.sell_rate || 228.50,
                            avg: result.data.sell_avg || result.data.sell_rate || 228.50,
                            max: result.data.sell_max || result.data.sell_rate || 228.50
                        },
                        buy_rate: {
                            min: result.data.buy_min || result.data.buy_rate || 228.00,
                            avg: result.data.buy_avg || result.data.buy_rate || 228.00,
                            max: result.data.buy_max || result.data.buy_rate || 228.00
                        },
                        spread: result.data.spread || 0.50,
                        sell_prices_used: result.data.sell_prices_used || 0,
                        buy_prices_used: result.data.buy_prices_used || 0,
                        prices_used: result.data.prices_used || 0,
                        price_range: result.data.price_range || {
                            sell_min: 228.50, sell_max: 228.50,
                            buy_min: 228.00, buy_max: 228.00,
                            min: 228.00, max: 228.50
                        },
                        lastUpdated: result.data.lastUpdated || new Date().toISOString()
                    };

                    this.cachedRates = fallbackRates;
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
                usd_ves: 228.50,
                usdt_ves: 228.50,
                busd_ves: 228.50,
                sell_rate: {
                    min: 228.50,
                    avg: 228.50,
                    max: 228.50
                },
                buy_rate: {
                    min: 228.50,
                    avg: 228.50,
                    max: 228.50
                },
                spread: 0,
                sell_prices_used: 0,
                buy_prices_used: 0,
                prices_used: 0,
                price_range: {
                    sell_min: 228.50,
                    sell_max: 228.50,
                    buy_min: 228.50,
                    buy_max: 228.50,
                    min: 228.50,
                    max: 228.50
                },
                lastUpdated: new Date().toISOString()
            };

            this.cachedRates = fallbackRates;
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
    async getTrends(): Promise<{ usdVes: { '1d': BinanceTrend; '1w': BinanceTrend; '1m': BinanceTrend } } | null> {
        try {
            const trends = await binanceHistoryService.getMultiPeriodTrends();
            if (!trends) return null;

            return {
                usdVes: trends
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
    }
}

export const binanceRatesService = BinanceRatesService.getInstance();
export { BinanceRatesService };
