import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { NextResponse } from 'next/server';

describe('BCV and Binance rate routes', () => {
  const getLatestExchangeRate: any = jest.fn();
  const mockDbInstance = {
    getLatestExchangeRate,
    storeExchangeRate: jest.fn(),
    getExchangeRateHistory: jest.fn(),
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock('@/lib/services/exchange-rate-db', () => {
      return jest.fn().mockImplementation(() => mockDbInstance);
    });
    jest.doMock('@/lib/utils/logger', () => ({ logger }));
    // Mock buildBCVFallbackData to avoid hitting actual logic
    jest.doMock('@/lib/services/rates-fallback', () => ({
      buildBCVFallbackData: jest
        .fn()
        .mockReturnValue({ usd: 30, source: 'static' }),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves BCV data from database and POST mirrors GET', async () => {
    const now = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    getLatestExchangeRate.mockResolvedValue({
      usd_ves: 36,
      usdt_ves: 37,
      sell_rate: 36,
      buy_rate: 36,
      lastUpdated: new Date(now - 10000).toISOString(),
      source: 'BCV',
    });

    const route = await import('@/app/api/bcv-rates/route');
    const first = await route.GET();
    const body = await first.json();
    const post = await route.POST();

    expect(first.status).toBe(200);
    expect(body.data.usd).toBe(36);
    expect(body.data.source).toBe('BCV');
    expect(post.status).toBe(200);
    expect(getLatestExchangeRate).toHaveBeenCalled();
  });

  it('falls back to static BCV data when database is empty', async () => {
    getLatestExchangeRate.mockResolvedValue(null);

    const route = await import('@/app/api/bcv-rates/route');
    const response = await route.GET();
    const body = await response.json();

    expect(body.fallback).toBe(true);
    expect(body.data.source).toBe('static');
  });

  it('returns Binance success payloads from database', async () => {
    const now = 1000000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    getLatestExchangeRate.mockResolvedValue({
      usd_ves: 36,
      usdt_ves: 38,
      sell_rate: 38.5,
      buy_rate: 37.5,
      lastUpdated: new Date(now - 5000).toISOString(),
      source: 'Binance',
    });

    const route = await import('@/app/api/binance-rates/route');
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.usdt_ves).toBe(38);
    expect(body.data.source).toBe('Binance');
    expect(body.cached).toBe(true);
  });

  it('returns 503 on Binance when database is empty', async () => {
    getLatestExchangeRate.mockResolvedValue(null);

    const route = await import('@/app/api/binance-rates/route');
    const response = await route.GET();

    expect(response.status).toBe(503);
  });
});
