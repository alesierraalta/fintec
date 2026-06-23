import { NextResponse } from 'next/server';

const mockGetLatestExchangeRate = jest.fn();
const mockStoreExchangeRate = jest.fn();
const mockScrapeBinanceRates = jest.fn();

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

import { GET } from '@/app/api/binance-rates/route';

describe('Binance Rates Route Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestExchangeRate.mockReset();
    mockStoreExchangeRate.mockReset();
    mockScrapeBinanceRates.mockReset();
  });

  it('returns 200 with fallback data when only reconstructed history exists', async () => {
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 632.95,
      usdt_ves: 632.95,
      sell_rate: 632.95,
      buy_rate: 631.5,
      lastUpdated: new Date().toISOString(),
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
  });

  it('returns cached database rates when available and fresh', async () => {
    const recentTimestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: recentTimestamp,
      source: 'Binance P2P',
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.data.usd_ves).toBe(775.0);
    expect(mockScrapeBinanceRates).not.toHaveBeenCalled();
  });

  it('attempts live scrape and returns fresh data when cache is stale', async () => {
    const staleTimestamp = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: staleTimestamp,
      source: 'Binance P2P',
    });

    const liveScrapeTime = new Date().toISOString();
    mockScrapeBinanceRates.mockResolvedValue({
      success: true,
      data: {
        usd_ves: 780.0,
        usdt_ves: 780.0,
        busd_ves: 780.0,
        sell_rate: 781.0,
        buy_rate: 779.0,
        lastUpdated: liveScrapeTime,
        source: 'Binance P2P',
      },
    });
    mockStoreExchangeRate.mockResolvedValue(true);

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(false);
    expect(body.fromLiveScrape).toBe(true);
    expect(body.data.usd_ves).toBe(780.0);
    expect(mockScrapeBinanceRates).toHaveBeenCalled();
    expect(mockStoreExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({
        usd_ves: 780.0,
        source: 'Binance P2P',
      })
    );
  });

  it('scrapes live Binance rates when database has no snapshots', async () => {
    mockGetLatestExchangeRate.mockResolvedValue(null);

    const liveScrapeTime = new Date().toISOString();
    mockScrapeBinanceRates.mockResolvedValue({
      success: true,
      data: {
        usd_ves: 780.0,
        usdt_ves: 780.0,
        busd_ves: 780.0,
        sell_rate: 781.0,
        buy_rate: 779.0,
        lastUpdated: liveScrapeTime,
        source: 'Binance P2P',
      },
    });
    mockStoreExchangeRate.mockResolvedValue(true);

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.cached).toBe(false);
    expect(body.fromLiveScrape).toBe(true);
    expect(body.data.usd_ves).toBe(780.0);
    expect(mockScrapeBinanceRates).toHaveBeenCalled();
    expect(mockStoreExchangeRate).toHaveBeenCalled();
  });

  it('returns stale data with warning when cache is stale but scrape fails', async () => {
    const staleTimestamp = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();
    mockGetLatestExchangeRate.mockResolvedValue({
      usd_ves: 775.0,
      usdt_ves: 775.0,
      sell_rate: 776.0,
      buy_rate: 774.0,
      lastUpdated: staleTimestamp,
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
    expect(body.cached).toBe(true);
    expect(body.stale).toBe(true);
    expect(body.staleReason).toContain('stale');
    expect(body.data.usd_ves).toBe(775.0);
    expect(mockStoreExchangeRate).not.toHaveBeenCalled();
  });

  it('returns 503 error with fallback data when database is empty and scrape fails', async () => {
    mockGetLatestExchangeRate.mockResolvedValue(null);
    mockScrapeBinanceRates.mockResolvedValue({
      success: false,
      error: 'API down',
      data: null,
    });

    const response = (await GET()) as NextResponse;
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.fallback).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.usd_ves).toBe(770.0);
  });
});
