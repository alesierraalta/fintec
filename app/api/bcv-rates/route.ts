import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import {
  buildBCVFallbackData,
  isFallbackSource,
} from '@/lib/services/rates-fallback';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET /api/bcv-rates
 * Returns the latest BCV exchange rates from the database.
 * This endpoint is now READ-ONLY. Scraping is handled by the background service.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestExchangeRate();

    if (latest) {
      return NextResponse.json({
        success: true,
        data: {
          usd: latest.usd_ves,
          // Note: EUR is stored in bcv_rate_history but not in the unified snapshot.
          // For most purposes, usd_ves is what's requested.
          timestamp: latest.lastUpdated,
          source: latest.source,
        },
        cached: true,
        cacheAge: Math.round(
          (Date.now() - new Date(latest.lastUpdated).getTime()) / 1000
        ),
        fallback: false,
      });
    }

    logger.warn('BCV API: No data found in database, attempting live scrape');
    const liveResult = await scrapeBCVRates();

    if (liveResult.success && !isFallbackSource(liveResult.data.source)) {
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

    logger.warn('BCV API: Live scrape failed, refusing successful static fallback');
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
  return GET();
}
