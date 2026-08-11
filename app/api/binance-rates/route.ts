import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { logger } from '@/lib/utils/logger';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { scheduleBackgroundRateRefresh } from '@/lib/rates/rate-refresh';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { createServiceClient } from '@/lib/supabase/admin';
import { formatCaracasDayKey } from '@/lib/utils/date-key';
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
 * service client. The Binance-specific read model (binance_rate_history) is the
 * only row type the GET path reads; its upsert is scoped to service_role after
 * the RLS hardening (#47/#48), so the GET path must never reintroduce anon
 * writes.
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

  try {
    await ratesRepo.upsertBinanceRate({
      date: formatCaracasDayKey(new Date()),
      usd: liveResult.data.usdt_ves,
      source: liveResult.data.source,
      timestamp: liveResult.data.lastUpdated,
    });
  } catch (historyError) {
    logger.warn(
      'Binance API: background refresh could not persist Binance-specific history:',
      historyError
    );
    return;
  }
}

/**
 * GET /api/binance-rates
 * Returns the latest Binance P2P exchange rates.
 *
 * Reads ONLY the Binance-specific read model (binance_rate_history). It never
 * reads the unified exchange_rates snapshot: that table holds whichever source
 * refreshed last (including BCV background refreshes), so serving it here would
 * let a BCV rate masquerade as the Binance P2P rate.
 *
 * Serves the stored value immediately (stale-while-revalidate): a stale
 * (>2h) or missing record triggers a coalesced background refresh instead
 * of blocking the request on a synchronous external scrape.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestBinanceRate();

    if (latest && !isFallbackSource(latest.source)) {
      const now = Date.now();
      const lastUpdatedTime = new Date(latest.lastUpdated).getTime();
      const cacheAgeSeconds = Math.round((now - lastUpdatedTime) / 1000);
      const isStale = cacheAgeSeconds > STALE_THRESHOLD_SECONDS;

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
          fromBackground: true,
          fallback: false,
        });
      }

      // Record is stale - serve it immediately; refresh in the background.
      logger.warn(
        `Binance API: Binance data is ${cacheAgeSeconds}s old (>${STALE_THRESHOLD_SECONDS}s threshold), scheduling background refresh`
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
        fallback: false,
      });
    }

    // No valid Binance-specific record exists - true fallback (never a
    // BCV/unified snapshot); refresh in the background.
    logger.warn(
      'Binance API: No valid Binance record found, scheduling background refresh'
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
        fallbackReason:
          'No Binance-specific data; background refresh scheduled',
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
