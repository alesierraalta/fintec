import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { buildBCVFallbackData } from '@/lib/services/rates-fallback';
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

    // Fallback if no data in database
    logger.warn('BCV API: No data found in database, using static fallback');
    return NextResponse.json({
      success: true,
      data: buildBCVFallbackData('static-default'),
      fallback: true,
      fallbackReason: 'No data in database',
    });
  } catch (error) {
    logger.error('BCV API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: buildBCVFallbackData('static-default'),
      fallback: true,
      fallbackReason: 'Database error',
    });
  }
}

export async function POST() {
  return GET();
}
