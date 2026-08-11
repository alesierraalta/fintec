import { NextResponse } from 'next/server';

const mockGetLatestBinanceRate = jest.fn();
const mockGetLatestExchangeRate = jest.fn();
const mockUpsertBinanceRate = jest.fn();
const mockScrapeBinanceRates = jest.fn();
const mockScheduleRefresh = jest.fn();
const mockCreateServiceClient = jest.fn();
const mockRatesRepoArgs = jest.fn();

jest.mock('@/lib/services/exchange-rate-db', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getLatestBinanceRate: mockGetLatestBinanceRate,
      getLatestExchangeRate: mockGetLatestExchangeRate,
    };
  });
});

jest.mock('@/lib/scrapers/binance-scraper', () => ({
  scrapeBinanceRates: mockScrapeBinanceRates,
}));

jest.mock('@/lib/rates/rate-refresh', () => ({
  scheduleBackgroundRateRefresh: (...args: unknown[]) =>
    mockScheduleRefresh(...args),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
}));

jest.mock('@/repositories/supabase/rates-history-repository-impl', () => ({
  SupabaseRatesHistoryRepository: jest
    .fn()
    .mockImplementation((...args: unknown[]) => {
      mockRatesRepoArgs(...args);
      return {
        upsertBinanceRate: (...repoArgs: unknown[]) =>
          mockUpsertBinanceRate(...repoArgs),
      };
    }),
}));

import { GET } from '@/app/api/binance-rates/route';

describe('Binance Rates Route Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestBinanceRate.mockReset();
    mockGetLatestExchangeRate.mockReset();
    mockUpsertBinanceRate.mockReset();
    mockScrapeBinanceRates.mockReset();
    mockScheduleRefresh.mockReset();
    mockCreateServiceClient.mockReset();
    mockRatesRepoArgs.mockReset();
    mockCreateServiceClient.mockReturnValue({ from: jest.fn() });
  });

  const recentTimestamp = () =>
    new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const staleTimestamp = () =>
    new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const binanceRow = (overrides: Record<string, unknown> = {}) => ({
    usd_ves: 775.0,
    usdt_ves: 775.0,
    sell_rate: 775.0,
    buy_rate: 775.0,
    lastUpdated: recentTimestamp(),
    source: 'Binance P2P',
    ...overrides,
  });

  it('serves the Binance-specific read model when fresh and never reads the unified snapshot', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(binanceRow());
    // A BCV-sourced row is the newest unified snapshot; it must be ignored.
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 151.52,
      usdt_ves: 151.52,
      sell_rate: 151.52,
      buy_rate: 151.52,
      lastUpdated: recentTimestamp(),
      source: 'BCV',
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.fallback).toBe(false);
    expect(responseData.fromBackground).toBe(true);
    expect(responseData.data.usd_ves).toBe(775.0);
    expect(responseData.data.source).toBe('Binance P2P');
    expect(mockGetLatestExchangeRate).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).not.toHaveBeenCalled();
  });

  it('returns cached database rates when available and fresh', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(binanceRow());

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.data.usd_ves).toBe(775.0);
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).not.toHaveBeenCalled();
  });

  it('serves stale data immediately and schedules a background refresh without blocking on scrape', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(
      binanceRow({ lastUpdated: staleTimestamp() })
    );

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.stale).toBe(true);
    expect(body.staleReason).toContain('background refresh scheduled');
    expect(body.data.usd_ves).toBe(775.0);
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).toHaveBeenCalledWith(
      'binance',
      expect.any(Function)
    );
  });

  it('persists a successful background refresh to the Binance-specific history through the service client', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(
      binanceRow({ lastUpdated: staleTimestamp() })
    );
    mockScrapeBinanceRates.mockResolvedValue({
      success: true,
      data: {
        usd_ves: 780.0,
        usdt_ves: 780.0,
        busd_ves: 780.0,
        sell_rate: 781.0,
        buy_rate: 779.0,
        lastUpdated: new Date().toISOString(),
        source: 'Binance P2P',
      },
    });
    mockUpsertBinanceRate.mockResolvedValue(undefined);
    const serviceClient = { from: jest.fn() };
    mockCreateServiceClient.mockReturnValue(serviceClient);

    await GET();
    const task = mockScheduleRefresh.mock.calls[0][1] as () => Promise<void>;
    await task();

    expect(mockScrapeBinanceRates).toHaveBeenCalledTimes(1);
    expect(mockCreateServiceClient).toHaveBeenCalledTimes(1);
    expect(mockRatesRepoArgs).toHaveBeenCalledWith(serviceClient);
    expect(mockUpsertBinanceRate).toHaveBeenCalledWith(
      expect.objectContaining({
        usd: 780.0,
        source: 'Binance P2P',
      })
    );
  });

  it('keeps the stale response when the background refresh fails', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(
      binanceRow({ lastUpdated: staleTimestamp() })
    );
    mockScrapeBinanceRates.mockResolvedValue({
      success: false,
      error: 'API down',
      data: null,
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stale).toBe(true);
    expect(body.data.usd_ves).toBe(775.0);

    const task = mockScheduleRefresh.mock.calls[0][1] as () => Promise<void>;
    await task();
    expect(mockUpsertBinanceRate).not.toHaveBeenCalled();
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });

  it('returns 503 true fallback when no Binance history exists even if a BCV unified snapshot is newest', async () => {
    mockGetLatestBinanceRate.mockResolvedValue(null);
    // The unified table holds a fresh BCV row — it must never be served here.
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 151.52,
      usdt_ves: 151.52,
      sell_rate: 151.52,
      buy_rate: 151.52,
      lastUpdated: recentTimestamp(),
      source: 'BCV',
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.fallback).toBe(true);
    expect(body.fallbackReason).toBe(
      'No Binance-specific data; background refresh scheduled'
    );
    expect(body.data.usd_ves).toBe(770.0);
    expect(body.data.source).toContain('fallback');
    expect(mockGetLatestExchangeRate).not.toHaveBeenCalled();
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).toHaveBeenCalledWith(
      'binance',
      expect.any(Function)
    );
  });
});
