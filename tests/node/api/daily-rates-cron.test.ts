import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/rates/route';
import { createServiceClient } from '@/lib/supabase/admin';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

jest.mock('@/lib/supabase/admin', () => ({ createServiceClient: jest.fn() }));
jest.mock('@/repositories/supabase/rates-history-repository-impl', () => ({
  SupabaseRatesHistoryRepository: jest.fn(),
}));
jest.mock('@/lib/scrapers/bcv-scraper', () => ({ scrapeBCVRates: jest.fn() }));
jest.mock('@/lib/scrapers/binance-scraper', () => ({
  scrapeBinanceRates: jest.fn(),
}));

const request = (method = 'GET') =>
  new NextRequest('http://localhost/api/cron/rates', {
    method,
    headers: { Authorization: 'Bearer test-secret' },
  });

describe('daily rates cron', () => {
  const upsertBCVRate = jest.fn();
  const upsertBinanceRate = jest.fn();
  const successfulBCV = { success: true, data: { usd: 100, eur: 110 } };
  const successfulBinance = { success: true, data: { sell_avg: 105 } };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    (createServiceClient as jest.Mock).mockReturnValue({});
    (SupabaseRatesHistoryRepository as jest.Mock).mockImplementation(() => ({
      upsertBCVRate,
      upsertBinanceRate,
    }));
    (scrapeBCVRates as jest.Mock).mockResolvedValue(successfulBCV);
    (scrapeBinanceRates as jest.Mock).mockResolvedValue(successfulBinance);
  });

  it('rejects unauthorized requests before creating a client or scraping', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/cron/rates', {
        headers: { Authorization: 'Bearer wrong-secret' },
      })
    );

    expect(response.status).toBe(401);
    expect(createServiceClient).not.toHaveBeenCalled();
    [scrapeBCVRates, scrapeBinanceRates].forEach((scraper) =>
      expect(scraper).not.toHaveBeenCalled()
    );
  });

  it('persists both sources independently and reports a complete replay safely', async () => {
    const first = await GET(request());
    const second = await POST(request('POST'));

    expect(first.status).toBe(200);
    expect((await first.json()).status).toBe('complete');
    expect((await second.json()).results).toMatchObject({
      bcv: { status: 'saved' },
      binance: { status: 'saved' },
    });
    expect(scrapeBCVRates).toHaveBeenCalledWith({ maxRetries: 2 });
    expect(scrapeBinanceRates).toHaveBeenCalledWith({ maxRetries: 2 });
    expect(upsertBCVRate).toHaveBeenCalledTimes(2);
    expect(upsertBinanceRate).toHaveBeenCalledTimes(2);
  });

  it('reports partial success without discarding the saved source', async () => {
    (scrapeBinanceRates as jest.Mock).mockResolvedValue({
      success: false,
      error: 'provider exhausted',
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'partial',
      results: { bcv: { status: 'saved' }, binance: { status: 'failed' } },
    });
    expect(upsertBCVRate).toHaveBeenCalledTimes(1);
    expect(upsertBinanceRate).not.toHaveBeenCalled();
  });

  it('marks a source timed out without persisting it', async () => {
    jest.useFakeTimers();
    (scrapeBCVRates as jest.Mock).mockReturnValue(new Promise(() => undefined));
    (scrapeBinanceRates as jest.Mock).mockResolvedValue({
      success: false,
      error: 'failed',
    });

    const responsePromise = GET(request());
    await jest.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      status: 'failed',
      results: { bcv: { status: 'timed_out' } },
    });
    expect(upsertBCVRate).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
