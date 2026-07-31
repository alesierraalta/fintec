import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { logger } from '@/lib/utils/logger';
import { formatCaracasDayKey } from '@/lib/utils/date-key';

export const runtime = 'nodejs';
export const maxDuration = 60;

type SourceStatus = 'saved' | 'failed' | 'timed_out';
type AggregateStatus = 'complete' | 'partial' | 'failed';
type SourceResult = { status: SourceStatus; error?: string };

const CRON_SCRAPE_OPTIONS = { maxRetries: 2 };
export const SOURCE_TIMEOUTS = { bcv: 15_000, binance: 30_000 };

async function runWithDeadline(
  name: string,
  timeoutMs: number,
  work: (isTimedOut: () => boolean) => Promise<void>
): Promise<SourceResult> {
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const operation = work(() => timedOut)
    .then(() =>
      timedOut ? { status: 'timed_out' as const } : { status: 'saved' as const }
    )
    .catch((error: unknown) => ({
      status: 'failed' as const,
      error: error instanceof Error ? error.message : String(error),
    }));
  const deadline = new Promise<SourceResult>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve({ status: 'timed_out', error: `${name} source timed out` });
    }, timeoutMs);
  });

  const result = await Promise.race([operation, deadline]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

const handleRequest = async (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let serviceClient: ReturnType<typeof createServiceClient>;
  try {
    serviceClient = createServiceClient();
  } catch (error: unknown) {
    logger.error('[cron/rates] Failed to create service client:', error);
    return NextResponse.json(
      { success: false, error: 'Service client unavailable' },
      { status: 503 }
    );
  }

  const date = formatCaracasDayKey(new Date());
  const timestamp = new Date().toISOString();
  const ratesRepo = new SupabaseRatesHistoryRepository(serviceClient);

  const [bcv, binance] = await Promise.all([
    runWithDeadline('BCV', SOURCE_TIMEOUTS.bcv, async (isTimedOut) => {
      const result = await scrapeBCVRates(CRON_SCRAPE_OPTIONS);
      if (isTimedOut()) return;
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unknown BCV scraper error');
      }
      await ratesRepo.upsertBCVRate({
        date,
        usd: result.data.usd,
        eur: result.data.eur,
        source: 'BCV',
        timestamp,
      });
    }),
    runWithDeadline('Binance', SOURCE_TIMEOUTS.binance, async (isTimedOut) => {
      const result = await scrapeBinanceRates(CRON_SCRAPE_OPTIONS);
      if (isTimedOut()) return;
      const usd = result.data?.sell_avg ?? 0;
      if (!result.success || usd <= 0) {
        throw new Error(result.error ?? 'Binance rate was 0 or missing');
      }
      await ratesRepo.upsertBinanceRate({
        date,
        usd,
        source: 'Binance',
        timestamp,
      });
    }),
  ]);

  const savedCount = [bcv, binance].filter(
    (result) => result.status === 'saved'
  ).length;
  const status: AggregateStatus =
    savedCount === 2 ? 'complete' : savedCount === 1 ? 'partial' : 'failed';
  const results = { date, bcv, binance };

  if (status === 'failed') {
    logger.error(
      '[CRITICAL_FAILURE] Both BCV and Binance sources failed',
      results
    );
  } else if (status === 'partial') {
    logger.warn('[cron/rates] Partial daily rates result', results);
  }

  return NextResponse.json(
    { success: status !== 'failed', status, results },
    { status: status === 'failed' ? 502 : 200 }
  );
};

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
