import { NextRequest, NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import {
  buildBCVFallbackData,
  isFallbackSource,
} from '@/lib/services/rates-fallback';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { logger } from '@/lib/utils/logger';
import { ScrapeAndPersistRates } from '@/lib/rates/scrape-pipeline';
import { InMemoryLock } from '@/lib/rates/simple-lock';
import { scheduleBackgroundRateRefresh } from '@/lib/rates/rate-refresh';
import { SupabaseScrapeAttemptsRepository } from '@/repositories/supabase/scrape-attempts-repository-impl';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { ExchangeRateDatabaseBCVWriter } from '@/lib/rates/bcv-rate-db-writer';
import { createServiceClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How old (in seconds) can cached data be before we consider it stale.
 * 2 hours = 7200s — BCV updates once daily, but data >2h is risky.
 */
const STALE_THRESHOLD_SECONDS = 2 * 60 * 60;

const REFRESH_KEY = 'bcv';

/**
 * Background refresh: scrape + persist fresh data through the server-only
 * service client. exchange_rates INSERT is scoped to service_role after the
 * RLS hardening (#47/#48); the GET path must never reintroduce anon writes.
 */
async function refreshBCVRatesInBackground(): Promise<void> {
  const liveResult = await scrapeBCVRates();

  if (!liveResult.success || isFallbackSource(liveResult.data.source)) {
    logger.warn(
      'BCV API: background refresh skipped (scrape failed or fallback source)'
    );
    return;
  }

  const serviceClient = createServiceClient();
  const ratesRepo = new SupabaseRatesHistoryRepository(serviceClient);
  const writer = new ExchangeRateDatabaseBCVWriter(ratesRepo);
  const persisted = await writer.write({
    usd: liveResult.data.usd,
    eur: liveResult.data.eur,
    source: liveResult.data.source,
    lastUpdated: liveResult.data.lastUpdated,
  });

  if (!persisted) {
    logger.warn(
      'BCV API: background refresh could not persist fresh scrape data'
    );
  }
}

/**
 * GET /api/bcv-rates
 * Returns the latest BCV exchange rates.
 *
 * Reads ONLY the BCV-specific read model (bcv_rate_history). It never reads the
 * unified exchange_rates snapshot: that table holds the newest snapshot of any
 * source (including Binance P2P background refreshes), so serving it here would
 * let a Binance rate masquerade as the official BCV rate.
 *
 * Serves the stored value immediately (stale-while-revalidate): a stale
 * (>2h) or missing record triggers a coalesced background refresh instead
 * of blocking the request on a synchronous external scrape.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestBCVRate();

    if (latest && !isFallbackSource(latest.source)) {
      const cacheAgeSeconds = Math.round(
        (Date.now() - new Date(latest.lastUpdated).getTime()) / 1000
      );
      const isStale = cacheAgeSeconds > STALE_THRESHOLD_SECONDS;

      const payload = {
        success: true,
        data: {
          usd: latest.usd,
          eur: latest.eur,
          lastUpdated: latest.lastUpdated,
          source: latest.source,
        },
        cached: true,
        cacheAge: cacheAgeSeconds,
        fallback: false,
      };

      if (!isStale) {
        // Data is fresh — return it directly
        return NextResponse.json(payload);
      }

      // Data is stale — serve it immediately; refresh in the background.
      logger.warn(
        `BCV API: BCV data is ${cacheAgeSeconds}s old (>${STALE_THRESHOLD_SECONDS}s threshold), scheduling background refresh`
      );
      scheduleBackgroundRateRefresh(REFRESH_KEY, refreshBCVRatesInBackground);

      return NextResponse.json({
        ...payload,
        stale: true,
        staleReason: `Data is ${cacheAgeSeconds}s old, background refresh scheduled`,
      });
    }

    // No valid BCV record exists — true fallback (never a Binance/unified
    // snapshot); refresh in the background.
    logger.warn(
      'BCV API: No valid BCV record found, scheduling background refresh'
    );
    scheduleBackgroundRateRefresh(REFRESH_KEY, refreshBCVRatesInBackground);

    return NextResponse.json(
      {
        success: false,
        error: 'No BCV exchange rate data available',
        data: buildBCVFallbackData('refresh-scheduled'),
        fallback: true,
        fallbackReason: 'No BCV-specific data; background refresh scheduled',
      },
      { status: 503 }
    );
  } catch (error) {
    logger.error('BCV API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: buildBCVFallbackData('database-error'),
        fallback: true,
        fallbackReason: 'Database error',
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authorization: a verified authenticated session OR the same CRON_SECRET
    // bearer convention used by app/api/cron/rates/route.ts. Never authorize
    // from an unverified session alone (auth.uid() must resolve for the user
    // path, which only a verified token provides).
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronCaller = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCaller) {
      try {
        await getAuthenticatedUser(request);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // The scrape pipeline persists to rate-history and scrape-attempt tables
    // whose INSERT policies are scoped to service_role after the RLS hardening
    // migration. Use the server-only service client so legitimate server-side
    // writes survive RLS; never expose service credentials client-side.
    let serviceClient: ReturnType<typeof createServiceClient>;
    try {
      serviceClient = createServiceClient();
    } catch (err: any) {
      logger.error('BCV API POST: Failed to create service client:', err);
      return NextResponse.json(
        {
          success: false,
          error: 'Service client unavailable',
          detail: err?.message,
        },
        { status: 503 }
      );
    }

    const lock = new InMemoryLock();
    const attemptsRepo = new SupabaseScrapeAttemptsRepository(serviceClient);
    const ratesRepo = new SupabaseRatesHistoryRepository(serviceClient);
    const writer = new ExchangeRateDatabaseBCVWriter(ratesRepo);
    const pipeline = new ScrapeAndPersistRates(lock, attemptsRepo, writer);

    const result = await pipeline.execute('on-demand');

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          usd: result.result?.usd,
          eur: result.result?.eur,
          source: result.result?.source,
          timestamp: result.result?.lastUpdated,
          lastUpdated: result.result?.lastUpdated,
        },
        attemptId: result.attemptId,
        fallback: false,
      });
    }

    logger.warn('BCV API POST: Pipeline failed', {
      status: result.status,
      failureStage: result.failureStage,
      failureReason: result.failureReason,
    });

    return NextResponse.json(
      {
        success: false,
        error: result.failureReason || 'Pipeline execution failed',
        data: buildBCVFallbackData('pipeline-failed'),
        fallback: true,
        attemptId: result.attemptId,
        fallbackReason: result.failureReason || 'Scrape pipeline failed',
      },
      { status: 503 }
    );
  } catch (error) {
    logger.error('BCV API POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: buildBCVFallbackData('database-error'),
        fallback: true,
        fallbackReason: 'Pipeline instantiation error',
      },
      { status: 503 }
    );
  }
}
