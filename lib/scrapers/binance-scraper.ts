/**
 * Binance P2P Scraper - Refactored with BaseScraper
 * Fetches VES/USDT exchange rates from Binance P2P API
 * Now includes circuit breaker, retry handler, and health monitoring
 */

import { BaseScraper } from './base-scraper';
import { ScraperResult, ScraperError } from './types';
import { BINANCE_CONFIG } from './config';
import { STATIC_BINANCE_FALLBACK_RATES } from '@/lib/services/rates-fallback';

interface PriceData {
  price: number;
  adId: string;
  tradeType: string;
}

interface BinanceData {
  usd_ves: number;
  usdt_ves: number;
  busd_ves: number;
  sell_rate: number;
  buy_rate: number;
  sell_min: number;
  sell_avg: number;
  sell_max: number;
  buy_min: number;
  buy_avg: number;
  buy_max: number;
  overall_min: number;
  overall_max: number;
  spread: number;
  sell_prices_used: number;
  buy_prices_used: number;
  prices_used: number;
  price_range: {
    sell_min: number;
    sell_max: number;
    buy_min: number;
    buy_max: number;
    min: number;
    max: number;
  };
  lastUpdated: string;
  source: string;
  execution_time?: number;
}

interface BinanceApiResponse {
  data?: Array<{
    adv?: {
      price?: string;
      advNo?: string;
    };
  }>;
}

// Constants
const BINANCE_P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const MAX_PAGES = 2;
const ROWS_PER_PAGE = 20;
const PRICE_MIN = 100;
const PRICE_MAX = 500;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/**
 * Binance Scraper implementation
 */
class BinanceScraper extends BaseScraper<BinanceData> {
  constructor() {
    super(BINANCE_CONFIG);
  }

  /**
   * Fetch raw data from Binance API
   */
  protected async _fetchData(): Promise<{ usdt: { sell: PriceData[]; buy: PriceData[] }; busd: { sell: PriceData[]; buy: PriceData[] } }> {
    // Fetch SELL and BUY offers concurrently for both assets
    const [usdtSell, usdtBuy, busdSell, busdBuy] = await Promise.all([
      this.fetchOffers('SELL', 'USDT'),
      this.fetchOffers('BUY', 'USDT'),
      this.fetchOffers('SELL', 'BUSD'),
      this.fetchOffers('BUY', 'BUSD'),
    ]);

    return {
      usdt: { sell: usdtSell, buy: usdtBuy },
      busd: { sell: busdSell, buy: busdBuy }
    };
  }

  /**
   * Parse raw data
   */
  protected async _parseData(
    data: unknown
  ): Promise<{ usdt: { sell: PriceData[]; buy: PriceData[] }; busd: { sell: PriceData[]; buy: PriceData[] } }> {
    if (
      !data ||
      typeof data !== 'object' ||
      !('usdt' in data) ||
      !('busd' in data)
    ) {
      throw new ScraperError('Invalid data structure', 'PARSE_ERROR');
    }

    return data as { usdt: { sell: PriceData[]; buy: PriceData[] }; busd: { sell: PriceData[]; buy: PriceData[] } };
  }

  /**
   * Validate parsed data
   */
  protected _validateData(
    data: unknown
  ): ScraperError | null {
    const parsed = data as { usdt: { sell: PriceData[]; buy: PriceData[] }; busd: { sell: PriceData[]; buy: PriceData[] } };

    if (!parsed.usdt?.sell || !parsed.usdt?.buy) {
      return new ScraperError('Missing USDT data', 'VALIDATION_ERROR');
    }

    if (parsed.usdt.sell.length === 0 && parsed.usdt.buy.length === 0) {
      return new ScraperError('No valid USDT prices found', 'NO_DATA_ERROR', undefined, true);
    }

    return null;
  }

  /**
   * Transform parsed data into final format
   */
  protected _transformData(
    data: unknown
  ): BinanceData {
    const parsed = data as { usdt: { sell: PriceData[]; buy: PriceData[] }; busd: { sell: PriceData[]; buy: PriceData[] } };

    // --- Process USDT ---
    const usdtFilteredSell = this.filterOutliers(parsed.usdt.sell);
    const usdtFilteredBuy = this.filterOutliers(parsed.usdt.buy);
    const usdtSellStats = this.calculateStats(usdtFilteredSell);
    const usdtBuyStats = this.calculateStats(usdtFilteredBuy);
    const usdtGeneralAvg =
      usdtFilteredSell.length > 0 && usdtFilteredBuy.length > 0
        ? (usdtSellStats.avg + usdtBuyStats.avg) / 2
        : usdtFilteredSell.length > 0
          ? usdtSellStats.avg
          : usdtBuyStats.avg;

    // --- Process BUSD ---
    const busdFilteredSell = this.filterOutliers(parsed.busd.sell);
    const busdFilteredBuy = this.filterOutliers(parsed.busd.buy);
    const busdSellStats = this.calculateStats(busdFilteredSell);
    const busdBuyStats = this.calculateStats(busdFilteredBuy);
    let busdGeneralAvg =
      busdFilteredSell.length > 0 && busdFilteredBuy.length > 0
        ? (busdSellStats.avg + busdBuyStats.avg) / 2
        : busdFilteredSell.length > 0
          ? busdSellStats.avg
          : busdBuyStats.avg;

    // Fallback: If BUSD has no data (avg is 0), use USDT avg
    if (busdGeneralAvg === 0) {
      busdGeneralAvg = usdtGeneralAvg;
    }

    // Overall min/max (using USDT as reference)
    const allPrices = [...usdtFilteredSell, ...usdtFilteredBuy];
    const overallMin =
      allPrices.length > 0 ? Math.min(...allPrices.map(p => p.price)) : 0;
    const overallMax =
      allPrices.length > 0 ? Math.max(...allPrices.map(p => p.price)) : 0;

    // Calculate spread (USDT)
    const spread = Math.abs(usdtSellStats.avg - usdtBuyStats.avg);

    return {
      usd_ves: Math.round(usdtGeneralAvg * 100) / 100,
      usdt_ves: Math.round(usdtGeneralAvg * 100) / 100,
      busd_ves: Math.round(busdGeneralAvg * 100) / 100,
      sell_rate: usdtSellStats.avg,
      buy_rate: usdtBuyStats.avg,
      sell_min: usdtSellStats.min || 300.0,
      sell_avg: usdtSellStats.avg || 302.0,
      sell_max: usdtSellStats.max || 304.0,
      buy_min: usdtBuyStats.min || 296.0,
      buy_avg: usdtBuyStats.avg || 298.0,
      buy_max: usdtBuyStats.max || 300.0,
      overall_min: Math.round(overallMin * 100) / 100 || 296.0,
      overall_max: Math.round(overallMax * 100) / 100 || 304.0,
      spread: Math.round(spread * 100) / 100,
      sell_prices_used: usdtFilteredSell.length,
      buy_prices_used: usdtFilteredBuy.length,
      prices_used: usdtFilteredSell.length + usdtFilteredBuy.length,
      price_range: {
        sell_min: usdtSellStats.min || 300.0,
        sell_max: usdtSellStats.max || 304.0,
        buy_min: usdtBuyStats.min || 296.0,
        buy_max: usdtBuyStats.max || 300.0,
        min: Math.round(overallMin * 100) / 100 || 296.0,
        max: Math.round(overallMax * 100) / 100 || 304.0,
      },
      lastUpdated: new Date().toISOString(),
      source: 'Binance P2P',
    };
  }

  /**
   * Create error result with fallback data
   */
  protected createErrorResult(
    error: ScraperError,
    startTime: number
  ): ScraperResult<BinanceData> {
    const executionTime = Date.now() - startTime;
    const fb = STATIC_BINANCE_FALLBACK_RATES;

    return {
      success: false,
      error: error.message,
      data: {
        usd_ves: fb.usd_ves,
        usdt_ves: fb.usdt_ves,
        busd_ves: fb.busd_ves,
        sell_rate: fb.sell_rate,
        buy_rate: fb.buy_rate,
        sell_min: fb.buy_rate,
        sell_avg: fb.sell_rate,
        sell_max: fb.sell_rate + fb.spread,
        buy_min: fb.buy_rate - fb.spread,
        buy_avg: fb.buy_rate,
        buy_max: fb.buy_rate,
        overall_min: fb.buy_rate - fb.spread,
        overall_max: fb.sell_rate + fb.spread,
        spread: fb.spread,
        sell_prices_used: 0,
        buy_prices_used: 0,
        prices_used: 0,
        price_range: {
          sell_min: fb.buy_rate,
          sell_max: fb.sell_rate + fb.spread,
          buy_min: fb.buy_rate - fb.spread,
          buy_max: fb.buy_rate,
          min: fb.buy_rate - fb.spread,
          max: fb.sell_rate + fb.spread,
        },
        lastUpdated: new Date().toISOString(),
        source: 'Binance P2P (fallback)',
        execution_time: executionTime,
      },
      executionTime,
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Fetch offers for a specific trade type
   */
  private async fetchOffers(tradeType: 'SELL' | 'BUY', asset: string = 'USDT'): Promise<PriceData[]> {
    const allPrices: PriceData[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const payload = {
          page,
          rows: ROWS_PER_PAGE,
          payTypes: [],
          countries: [],
          publisherType: null,
          asset,
          fiat: 'VES',
          tradeType,
          proMerchantAds: false,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        try {
          const response = await fetch(BINANCE_P2P_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': USER_AGENT,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 429) {
              throw new ScraperError(
                'Rate limited',
                'RATE_LIMIT',
                response.status,
                true
              );
            }
            continue;
          }

          const data = (await response.json()) as BinanceApiResponse;

          if (data?.data && Array.isArray(data.data)) {
            for (const offer of data.data) {
              try {
                const price = parseFloat(offer?.adv?.price || '');
                const adId = offer?.adv?.advNo || '';

                if (!isNaN(price) && price >= PRICE_MIN && price <= PRICE_MAX) {
                  allPrices.push({
                    price,
                    adId,
                    tradeType,
                  });
                }
              } catch (e) {
                // Skip invalid offers
                continue;
              }
            }
          }

          // Delay between pages to respect rate limits
          if (page < MAX_PAGES && this.config.rateLimitDelay) {
            await new Promise(resolve =>
              setTimeout(resolve, this.config.rateLimitDelay!)
            );
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof ScraperError) {
            throw fetchError;
          }
          // Continue to next page on other errors
          continue;
        }
      } catch (error) {
        // Error fetching page, continue to next
        if (error instanceof ScraperError) {
          throw error;
        }
        continue;
      }
    }

    return allPrices;
  }

  /**
   * Filter outliers using IQR method with extreme preservation
   */
  private filterOutliers(prices: PriceData[]): PriceData[] {
    if (prices.length < 5) {
      return prices;
    }

    const sorted = [...prices].sort((a, b) => a.price - b.price);

    // Preserve top and bottom 10%
    const preserveCount = Math.max(2, Math.floor(prices.length * 0.1));
    const preservedLow = sorted.slice(0, preserveCount);
    const preservedHigh = sorted.slice(-preserveCount);
    const middle = sorted.slice(preserveCount, -preserveCount);

    if (middle.length < 3) {
      return prices;
    }

    // Calculate IQR for middle values
    const middleValues = middle.map(p => p.price);
    middleValues.sort((a, b) => a - b);

    const q1Index = Math.floor(middleValues.length * 0.25);
    const q3Index = Math.floor(middleValues.length * 0.75);
    const q1 = middleValues[q1Index];
    const q3 = middleValues[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 2.5 * iqr;
    const upperBound = q3 + 2.5 * iqr;

    // Filter middle values
    const filteredMiddle = middle.filter(
      p => p.price >= lowerBound && p.price <= upperBound
    );

    // Combine preserved extremes with filtered middle
    const result = [...preservedLow, ...filteredMiddle, ...preservedHigh];

    // Remove duplicates by adId
    const seen = new Set<string>();
    return result.filter(p => {
      if (seen.has(p.adId)) return false;
      seen.add(p.adId);
      return true;
    });
  }

  /**
   * Calculate statistics from price data
   */
  private calculateStats(prices: PriceData[]) {
    if (prices.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }

    const values = prices.map(p => p.price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      min: Math.round(min * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
    };
  }
}

// Singleton instance
let scraperInstance: BinanceScraper | null = null;

/**
 * Main scraping function - maintains backward compatibility
 */
export async function scrapeBinanceRates(): Promise<ScraperResult<BinanceData>> {
  if (!scraperInstance) {
    scraperInstance = new BinanceScraper();
  }

  return scraperInstance.scrape();
}
