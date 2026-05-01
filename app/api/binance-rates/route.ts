import { NextResponse } from 'next/server';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

/**
 * GET /api/binance-rates
 * Returns the latest Binance P2P exchange rates from the database.
 * This endpoint is now READ-ONLY. Scraping is handled by the background service.
 * This eliminates on-demand scraping latencies and rate-limiting issues for clients.
 */
export async function GET() {
  try {
    const db = new ExchangeRateDatabase();
    const latest = await db.getLatestExchangeRate();

    if (latest) {
      const isFallback = latest.source.includes('Reconstructed');

      const now = Date.now();
      const lastUpdated = new Date(latest.lastUpdated).getTime();
      const cacheAge = Math.round((now - lastUpdated) / 1000);

      return NextResponse.json({
        success: true,
        data: {
          usd_ves: latest.usd_ves,
          usdt_ves: latest.usdt_ves,
          busd_ves: latest.usdt_ves, // Fallback to usdt_ves
          sell_rate: latest.sell_rate,
          buy_rate: latest.buy_rate,
          // Legacy fields for compatibility with frontend services
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
        cacheAge: cacheAge,
        fromBackground: !isFallback,
        fallback: isFallback,
      });
    }

    // If no data in database, return an error with a message
    return NextResponse.json(
      {
        success: false,
        error: 'No exchange rate data available in database',
        fallback: false,
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
