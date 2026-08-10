import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { logger } from '@/lib/utils/logger';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { scheduleBackgroundRateRefresh } from '@/lib/rates/rate-refresh';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { createServiceClient } from '@/lib/supabase/admin';
import {
  buildBinanceFallbackData,
  isFallbackSource,
} from '@/lib/services/rates-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_THRESHOLD_SECONDS = 2 * 60 * 60;

const REFRESH_KEY = 'binance';

/**
 * Background refresh: scrape + persist fresh data through the server-only
 * service client. exchange_rates INSERT is scoped to service_role after the
 * RLS hardening (#47/#48); the GET path must never reintroduce anon writes.
 */
async function refreshBinanceRatesInBackground(): Promise<void> {
  const liveResult = await scrapeBinanceRates();

  if (!liveResult.success || isFallbackSource(liveResult.data.source)) {
    logger.warn(
      'Binance API: background refresh skipped (scrape failed or fallback source)'
    );
    return;
  }

  const serviceClient = createServiceClient();
  const ratesRepo = new SupabaseRatesHistoryRepository(serviceClient);
  const db = new ExchangeRateDatabase(ratesRepo);
  const persisted = await db.storeExchangeRate({
    usd_ves: liveResult.data.usd_ves,
    usdt_ves: liveResult.data.usdt_ves,
    sell_rate: liveResult.data.sell_rate,
    buy_rate: liveResult.data.buy_rate,
    lastUpdated: liveResult.data.lastUpdated,
    source: liveResult.data.source,
  });

  if (!persisted) {
    logger.warn(
      'Binance API: background refresh could not persist fresh scrape data'
    );
  }
}

/**
 * GET /api/binance-rates
 * Returns the latest Binance P2P exchange rates from the database.
 * Serves the stored value immediately (stale-while-revalidate): a stale
 * (>2h) or missing snapshot triggers a coalesced background refresh instead
 * of blocking the request on a synchronous external scrape.
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

      // Cache is stale - serve it immediately; refresh in the background.
      logger.warn(
        `Binance API: Database data is ${cacheAgeSeconds}s old (>${STALE_THRESHOLD_SECONDS}s threshold), scheduling background refresh`
      );
      scheduleBackgroundRateRefresh(
        REFRESH_KEY,
        refreshBinanceRatesInBackground
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
        staleReason: `Cached data is stale (${cacheAgeSeconds}s old), background refresh scheduled`,
        fallback: isFallback,
      });
    }

    // No database snapshot exists - serve fallback immediately; refresh in background.
    logger.warn(
      'Binance API: No data found in database, scheduling background refresh'
    );
    scheduleBackgroundRateRefresh(REFRESH_KEY, refreshBinanceRatesInBackground);

    const fallbackData = buildBinanceFallbackData('refresh-scheduled');
    return NextResponse.json(
      {
        success: false,
        error: 'No Binance exchange rate data available',
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
        fallbackReason: 'No database data; background refresh scheduled',
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
