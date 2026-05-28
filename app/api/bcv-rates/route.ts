import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import {
  buildBCVFallbackData,
  isFallbackSource,
} from '@/lib/services/rates-fallback';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { logger } from '@/lib/utils/logger';
import { ScrapeAndPersistRates } from '@/lib/rates/scrape-pipeline';
import { InMemoryLock } from '@/lib/rates/simple-lock';
import { SupabaseScrapeAttemptsRepository } from '@/repositories/supabase/scrape-attempts-repository-impl';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { ExchangeRateDatabaseBCVWriter } from '@/lib/rates/bcv-rate-db-writer';

export const runtime = 'nodejs';

/**
 * How old (in seconds) can cached data be before we attempt a live scrape.
 * 2 hours = 7200s — BCV updates once daily, but stale data >2h is risky.
 */
const STALE_THRESHOLD_SECONDS = 2 * 60 * 60;

/**
 * GET /api/bcv-rates
 * Returns the latest BCV exchange rates.
 * If database data is stale (>2h), attempts a live scrape before returning.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestExchangeRate();

    if (latest) {
      const cacheAgeSeconds = Math.round(
        (Date.now() - new Date(latest.lastUpdated).getTime()) / 1000
      );
      const isStale = cacheAgeSeconds > STALE_THRESHOLD_SECONDS;

      if (!isStale) {
        // Data is fresh — return it directly
        return NextResponse.json({
          success: true,
          data: {
            usd: latest.usd_ves,
            timestamp: latest.lastUpdated,
            source: latest.source,
          },
          cached: true,
          cacheAge: cacheAgeSeconds,
          fallback: false,
        });
      }

      // Data is stale — attempt live scrape
      logger.warn(
        `BCV API: Database data is ${cacheAgeSeconds}s old (>${STALE_THRESHOLD_SECONDS}s threshold), attempting live scrape`
      );
      const liveResult = await scrapeBCVRates();

      if (liveResult.success && !isFallbackSource(liveResult.data.source)) {
        // Persist fresh data so subsequent requests don't hit stale path
        try {
          const ratesRepo = new SupabaseRatesHistoryRepository();
          const writer = new ExchangeRateDatabaseBCVWriter(ratesRepo);
          await writer.write({
            usd: liveResult.data.usd,
            eur: liveResult.data.eur,
            source: liveResult.data.source,
            lastUpdated: liveResult.data.lastUpdated,
          });
        } catch (persistError) {
          logger.error(
            'BCV API: Failed to persist fresh scrape data:',
            persistError
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            usd: liveResult.data.usd,
            eur: liveResult.data.eur,
            timestamp: liveResult.data.lastUpdated,
            source: liveResult.data.source,
          },
          cached: false,
          fromLiveScrape: true,
          fallback: false,
          executionTime: liveResult.executionTime,
        });
      }

      // Live scrape failed — return stale data with warning
      logger.warn('BCV API: Live scrape failed, returning stale database data');
      return NextResponse.json({
        success: true,
        data: {
          usd: latest.usd_ves,
          timestamp: latest.lastUpdated,
          source: latest.source,
        },
        cached: true,
        cacheAge: cacheAgeSeconds,
        stale: true,
        staleReason: `Data is ${cacheAgeSeconds}s old, live scrape failed`,
        fallback: false,
      });
    }

    // No data at all — attempt live scrape
    logger.warn('BCV API: No data found in database, attempting live scrape');
    const liveResult = await scrapeBCVRates();

    if (liveResult.success && !isFallbackSource(liveResult.data.source)) {
      // Persist fresh data so subsequent requests don't hit empty path
      try {
        const ratesRepo = new SupabaseRatesHistoryRepository();
        const writer = new ExchangeRateDatabaseBCVWriter(ratesRepo);
        await writer.write({
          usd: liveResult.data.usd,
          eur: liveResult.data.eur,
          source: liveResult.data.source,
          lastUpdated: liveResult.data.lastUpdated,
        });
      } catch (persistError) {
        logger.error(
          'BCV API: Failed to persist fresh scrape data:',
          persistError
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          usd: liveResult.data.usd,
          eur: liveResult.data.eur,
          timestamp: liveResult.data.lastUpdated,
          source: liveResult.data.source,
        },
        cached: false,
        fromLiveScrape: true,
        fallback: false,
        executionTime: liveResult.executionTime,
      });
    }

    logger.warn(
      'BCV API: Live scrape failed, refusing successful static fallback'
    );
    return NextResponse.json(
      {
        success: false,
        error: liveResult.error || 'No BCV exchange rate data available',
        data: buildBCVFallbackData('live-scrape-failed'),
        fallback: true,
        fallbackReason: 'No database data and live BCV scrape failed',
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

export async function POST() {
  try {
    const lock = new InMemoryLock();
    const attemptsRepo = new SupabaseScrapeAttemptsRepository();
    const ratesRepo = new SupabaseRatesHistoryRepository();
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
