import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { logger } from '@/lib/utils/logger';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import {
  buildBinanceFallbackData,
  isFallbackSource,
} from '@/lib/services/rates-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_THRESHOLD_SECONDS = 2 * 60 * 60;

/**
 * GET /api/binance-rates
 * Returns the latest Binance P2P exchange rates from the database.
 * If cached database rate is stale (>2h) or missing, triggers a live scrape.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestExchangeRate();

    if (latest) {
      const now = Date.now();
      const lastUpdatedTime = new Date(latest.lastUpdated).getTime();
      const cacheAgeSeconds = Math.round((now - lastUpdatedTime) / 1000);
      const isStale = cacheAgeSeconds > STALE_THRESHOLD_SECONDS;
      const isFallback = latest.source.includes('Reconstructed');

      if (!isStale) {
        return NextResponse.json({
          success: true,
          data: {
            usd_ves: latest.usd_ves,
            usdt_ves: latest.usdt_ves,
            busd_ves: latest.usdt_ves, // Fallback to usdt_ves
            sell_rate: latest.sell_rate,
            buy_rate: latest.buy_rate,
            sell_min: latest.sell_rate,
            sell_avg: latest.sell_rate,
            sell_max: latest.sell_rate,
            buy_min: latest.buy_rate,
            buy_avg: latest.buy_rate,
            buy_max: latest.buy_rate,
            prices_used: 0,
            lastUpdated: latest.lastUpdated,
            source: latest.source,
          },
          cached: true,
          cacheAge: cacheAgeSeconds,
          fromBackground: !isFallback,
          fallback: isFallback,
        });
      }

      // Cache is stale - attempt live scrape
      logger.warn(
        `Binance API: Database data is ${cacheAgeSeconds}s old (>${STALE_THRESHOLD_SECONDS}s threshold), attempting live scrape`
      );
      const liveResult = await scrapeBinanceRates();

      if (liveResult.success && !isFallbackSource(liveResult.data.source)) {
        // Persist fresh data
        try {
          await db.storeExchangeRate({
            usd_ves: liveResult.data.usd_ves,
            usdt_ves: liveResult.data.usdt_ves,
            sell_rate: liveResult.data.sell_rate,
            buy_rate: liveResult.data.buy_rate,
            lastUpdated: liveResult.data.lastUpdated,
            source: liveResult.data.source,
          });
        } catch (persistError) {
          logger.error(
            'Binance API: Failed to persist fresh scrape data:',
            persistError
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            usd_ves: liveResult.data.usd_ves,
            usdt_ves: liveResult.data.usdt_ves,
            busd_ves: liveResult.data.busd_ves,
            sell_rate: liveResult.data.sell_rate,
            buy_rate: liveResult.data.buy_rate,
            sell_min: liveResult.data.sell_min,
            sell_avg: liveResult.data.sell_avg,
            sell_max: liveResult.data.sell_max,
            buy_min: liveResult.data.buy_min,
            buy_avg: liveResult.data.buy_avg,
            buy_max: liveResult.data.buy_max,
            prices_used: liveResult.data.prices_used,
            lastUpdated: liveResult.data.lastUpdated,
            source: liveResult.data.source,
          },
          cached: false,
          fromLiveScrape: true,
          fallback: false,
        });
      }

      // Live scrape failed — return stale data with warning
      logger.warn(
        'Binance API: Live scrape failed, returning stale database data'
      );
      return NextResponse.json({
        success: true,
        data: {
          usd_ves: latest.usd_ves,
          usdt_ves: latest.usdt_ves,
          busd_ves: latest.usdt_ves,
          sell_rate: latest.sell_rate,
          buy_rate: latest.buy_rate,
          sell_min: latest.sell_rate,
          sell_avg: latest.sell_rate,
          sell_max: latest.sell_rate,
          buy_min: latest.buy_rate,
          buy_avg: latest.buy_rate,
          buy_max: latest.buy_rate,
          prices_used: 0,
          lastUpdated: latest.lastUpdated,
          source: latest.source,
        },
        cached: true,
        cacheAge: cacheAgeSeconds,
        stale: true,
        staleReason: `Cached data is stale (${cacheAgeSeconds}s old), live scrape failed`,
        fallback: isFallback,
      });
    }

    // No database snapshot exists - attempt live scrape
    logger.warn(
      'Binance API: No data found in database, attempting live scrape'
    );
    const liveResult = await scrapeBinanceRates();

    if (liveResult.success && !isFallbackSource(liveResult.data.source)) {
      try {
        await db.storeExchangeRate({
          usd_ves: liveResult.data.usd_ves,
          usdt_ves: liveResult.data.usdt_ves,
          sell_rate: liveResult.data.sell_rate,
          buy_rate: liveResult.data.buy_rate,
          lastUpdated: liveResult.data.lastUpdated,
          source: liveResult.data.source,
        });
      } catch (persistError) {
        logger.error(
          'Binance API: Failed to persist fresh scrape data:',
          persistError
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          usd_ves: liveResult.data.usd_ves,
          usdt_ves: liveResult.data.usdt_ves,
          busd_ves: liveResult.data.busd_ves,
          sell_rate: liveResult.data.sell_rate,
          buy_rate: liveResult.data.buy_rate,
          sell_min: liveResult.data.sell_min,
          sell_avg: liveResult.data.sell_avg,
          sell_max: liveResult.data.sell_max,
          buy_min: liveResult.data.buy_min,
          buy_avg: liveResult.data.buy_avg,
          buy_max: liveResult.data.buy_max,
          prices_used: liveResult.data.prices_used,
          lastUpdated: liveResult.data.lastUpdated,
          source: liveResult.data.source,
        },
        cached: false,
        fromLiveScrape: true,
        fallback: false,
      });
    }

    const fallbackData = buildBinanceFallbackData('live-scrape-failed');
    return NextResponse.json(
      {
        success: false,
        error: liveResult.error || 'No Binance exchange rate data available',
        data: {
          usd_ves: fallbackData.usd_ves,
          usdt_ves: fallbackData.usdt_ves,
          busd_ves: fallbackData.busd_ves,
          sell_rate: fallbackData.sell_rate,
          buy_rate: fallbackData.buy_rate,
          sell_min: fallbackData.sell_rate,
          sell_avg: fallbackData.sell_rate,
          sell_max: fallbackData.sell_rate,
          buy_min: fallbackData.buy_rate,
          buy_avg: fallbackData.buy_rate,
          buy_max: fallbackData.buy_rate,
          prices_used: 0,
          lastUpdated: fallbackData.lastUpdated,
          source: fallbackData.source,
        },
        fallback: true,
        fallbackReason: 'No database data and live Binance scrape failed',
      },
      { status: 503 }
    );
  } catch (error) {
    logger.error('Binance API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
