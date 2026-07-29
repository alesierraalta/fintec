import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { logger } from '@/lib/utils/logger';
import { formatCaracasDayKey } from '@/lib/utils/date-key';

export const runtime = 'nodejs';
export const maxDuration = 60;

const handleRequest = async (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Guard: fail fast with 503 if service client cannot be created
  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (err: any) {
    logger.error('[cron/rates] Failed to create service client:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Service client unavailable',
        detail: err?.message,
      },
      { status: 503 }
    );
  }

  const today = formatCaracasDayKey(new Date());
  const now = new Date().toISOString();
  const ratesRepo = new SupabaseRatesHistoryRepository(serviceClient);

  const results = {
    date: today,
    bcv: { success: false, error: undefined as string | undefined },
    binance: { success: false, error: undefined as string | undefined },
  };

  // Scrape and persist BCV rates
  try {
    const bcvResult = await scrapeBCVRates();
    if (bcvResult.success && bcvResult.data) {
      await ratesRepo.upsertBCVRate({
        date: today,
        usd: bcvResult.data.usd,
        eur: bcvResult.data.eur,
        source: 'BCV',
        timestamp: now,
      });
      results.bcv.success = true;
      logger.info(
        `[cron/rates] BCV rate saved for ${today}: USD ${bcvResult.data.usd}, EUR ${bcvResult.data.eur}`
      );
    } else {
      results.bcv.error = bcvResult.error ?? 'Unknown BCV scraper error';
      logger.warn(
        `[cron/rates] BCV scrape failed for ${today}: ${results.bcv.error}`
      );
    }
  } catch (err: any) {
    results.bcv.error = err?.message ?? String(err);
    logger.error(`[cron/rates] BCV scrape threw for ${today}:`, err);
  }

  // Scrape and persist Binance P2P rates
  try {
    const binanceResult = await scrapeBinanceRates();
    if (binanceResult.success && binanceResult.data) {
      // sell_avg is the canonical P2P USDT/VES rate from the BinanceData interface
      const usdRate = binanceResult.data.sell_avg ?? 0;
      if (usdRate > 0) {
        await ratesRepo.upsertBinanceRate({
          date: today,
          usd: usdRate,
          source: 'Binance',
          timestamp: now,
        });
        results.binance.success = true;
        logger.info(
          `[cron/rates] Binance rate saved for ${today}: USDT ${usdRate}`
        );
      } else {
        results.binance.error = 'Binance rate was 0 or missing';
        logger.warn(`[cron/rates] Binance rate missing for ${today}`);
      }
    } else {
      results.binance.error =
        (binanceResult as any).error ?? 'Unknown Binance scraper error';
      logger.warn(
        `[cron/rates] Binance scrape failed for ${today}: ${results.binance.error}`
      );
    }
  } catch (err: any) {
    results.binance.error = err?.message ?? String(err);
    logger.error(`[cron/rates] Binance scrape threw for ${today}:`, err);
  }

  const overallSuccess = results.bcv.success || results.binance.success;

  if (!overallSuccess) {
    logger.error(
      `[CRITICAL_FAILURE] Both BCV and Binance scrapers failed for ${today}. Dead-man's switch alert needed. Results:`,
      results
    );
  }

  return NextResponse.json(
    { success: overallSuccess, results },
    { status: overallSuccess ? 200 : 502 }
  );
};

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
