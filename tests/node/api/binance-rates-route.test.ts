import { NextResponse } from 'next/server';

const mockGetLatestExchangeRate = jest.fn();
const mockStoreExchangeRate = jest.fn();
const mockScrapeBinanceRates = jest.fn();
const mockScheduleRefresh = jest.fn();
const mockCreateServiceClient = jest.fn();
const mockRatesRepoArgs = jest.fn();

jest.mock('@/lib/services/exchange-rate-db', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getLatestExchangeRate: mockGetLatestExchangeRate,
      storeExchangeRate: mockStoreExchangeRate,
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
      return {};
    }),
}));

import { GET } from '@/app/api/binance-rates/route';

describe('Binance Rates Route Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestExchangeRate.mockReset();
    mockStoreExchangeRate.mockReset();
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

  it('returns 200 with fallback data when only reconstructed history exists', async () => {
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 632.95,
      usdt_ves: 632.95,
      sell_rate: 632.95,
      buy_rate: 631.5,
      lastUpdated: recentTimestamp(),
      source: 'Reconstructed (History Fallback)',
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const responseData = await response.json();

    expect(responseData.success).toBe(true);
    expect(responseData.fallback).toBe(true);
    expect(responseData.fromBackground).toBe(false);
    expect(responseData.data.usd_ves).toBe(632.95);
    expect(responseData.data.source).toBe('Reconstructed (History Fallback)');
    expect(mockScheduleRefresh).not.toHaveBeenCalled();
  });

  it('returns cached database rates when available and fresh', async () => {
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: recentTimestamp(),
      source: 'Binance P2P',
    });

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
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: staleTimestamp(),
      source: 'Binance P2P',
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.stale).toBe(true);
    expect(body.staleReason).toContain('background refresh scheduled');
    expect(body.data.usd_ves).toBe(775.0);
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
    expect(mockStoreExchangeRate).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).toHaveBeenCalledWith(
      'binance',
      expect.any(Function)
    );
  });

  it('persists a successful background refresh through the service client', async () => {
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: staleTimestamp(),
      source: 'Binance P2P',
    });
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
    mockStoreExchangeRate.mockResolvedValue(true);
    const serviceClient = { from: jest.fn() };
    mockCreateServiceClient.mockReturnValue(serviceClient);

    await GET();
    const task = mockScheduleRefresh.mock.calls[0][1] as () => Promise<void>;
    await task();

    expect(mockScrapeBinanceRates).toHaveBeenCalledTimes(1);
    expect(mockCreateServiceClient).toHaveBeenCalledTimes(1);
    expect(mockRatesRepoArgs).toHaveBeenCalledWith(serviceClient);
    expect(mockStoreExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({
        usd_ves: 780.0,
        source: 'Binance P2P',
      })
    );
  });

  it('keeps the stale response when the background refresh fails', async () => {
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: staleTimestamp(),
      source: 'Binance P2P',
    });
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
    expect(mockStoreExchangeRate).not.toHaveBeenCalled();
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });

  it('returns 503 fallback immediately when database is empty and schedules a refresh', async () => {
    mockGetLatestExchangeRate.mockResolvedValue(null);

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.fallback).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.usd_ves).toBe(770.0);
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
    expect(mockScheduleRefresh).toHaveBeenCalledWith(
      'binance',
      expect.any(Function)
    );
  });
});
