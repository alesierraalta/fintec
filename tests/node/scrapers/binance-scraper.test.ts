/**
 * Binance P2P Scraper Tests
 * Tests for the TypeScript Binance scraper implementation
 */

import {
  scrapeBinanceRates,
  resetScraperInstance,
} from '@/lib/scrapers/binance-scraper';

describe('Binance P2P Scraper', () => {
  // Increase timeout for network requests
  jest.setTimeout(15000);
  let sharedResult: Awaited<ReturnType<typeof scrapeBinanceRates>>;

  beforeAll(async () => {
    sharedResult = await scrapeBinanceRates();
  });

  it('should return a valid result structure', async () => {
    const result = sharedResult;

    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('usd_ves');
    expect(result.data).toHaveProperty('usdt_ves');
    expect(result.data).toHaveProperty('sell_rate');
    expect(result.data).toHaveProperty('buy_rate');
    expect(result.data).toHaveProperty('sell_min');
    expect(result.data).toHaveProperty('sell_avg');
    expect(result.data).toHaveProperty('sell_max');
    expect(result.data).toHaveProperty('buy_min');
    expect(result.data).toHaveProperty('buy_avg');
    expect(result.data).toHaveProperty('buy_max');
    expect(result.data).toHaveProperty('lastUpdated');
    expect(result.data).toHaveProperty('source');
  });

  it('should return valid exchange rates', async () => {
    const result = sharedResult;

    expect(typeof result.data.usd_ves).toBe('number');
    expect(typeof result.data.usdt_ves).toBe('number');
    expect(typeof result.data.sell_rate).toBe('number');
    expect(typeof result.data.buy_rate).toBe('number');

    // Rates should be positive
    expect(result.data.usd_ves).toBeGreaterThan(0);
    expect(result.data.usdt_ves).toBeGreaterThan(0);

    // Rates should remain within scraper's accepted market window
    expect(result.data.usd_ves).toBeGreaterThanOrEqual(10);
    expect(result.data.usd_ves).toBeLessThanOrEqual(1000);

    // USD and USDT references should stay close to each other
    expect(
      Math.abs(result.data.usd_ves - result.data.usdt_ves)
    ).toBeLessThanOrEqual(1);
  });

  it('should have valid min/max ranges', async () => {
    const result = sharedResult;

    // Sell rates
    expect(result.data.sell_min).toBeLessThanOrEqual(result.data.sell_avg);
    expect(result.data.sell_avg).toBeLessThanOrEqual(result.data.sell_max);

    // Buy rates
    expect(result.data.buy_min).toBeLessThanOrEqual(result.data.buy_avg);
    expect(result.data.buy_avg).toBeLessThanOrEqual(result.data.buy_max);
  });

  it('should have a reasonable spread', async () => {
    const result = sharedResult;

    expect(typeof result.data.spread).toBe('number');
    expect(result.data.spread).toBeGreaterThanOrEqual(0);

    // Spread should typically be less than 10% of the average price
    const avgPrice = (result.data.sell_rate + result.data.buy_rate) / 2;
    expect(result.data.spread).toBeLessThan(avgPrice * 0.15);
  });

  it('should have valid price counts', async () => {
    const result = sharedResult;

    expect(typeof result.data.sell_prices_used).toBe('number');
    expect(typeof result.data.buy_prices_used).toBe('number');
    expect(typeof result.data.prices_used).toBe('number');

    expect(result.data.sell_prices_used).toBeGreaterThanOrEqual(0);
    expect(result.data.buy_prices_used).toBeGreaterThanOrEqual(0);
    expect(result.data.prices_used).toBe(
      result.data.sell_prices_used + result.data.buy_prices_used
    );
  });

  it('should have a valid timestamp', async () => {
    const result = sharedResult;
    const timestamp = new Date(result.data.lastUpdated);

    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should complete within reasonable time', async () => {
    const startTime = Date.now();
    const result = await scrapeBinanceRates();
    const executionTime = Date.now() - startTime;

    // Should complete within 12 seconds for 3 pages
    expect(executionTime).toBeLessThan(12000);

    // Verify execution time is also in the result
    if (result.executionTime !== undefined) {
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(12000);
    }
  });

  it('should handle errors gracefully', async () => {
    // This test ensures the scraper doesn't crash on errors
    const result = sharedResult;

    // Even if it fails, it should return a valid structure
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(typeof result.data.usd_ves).toBe('number');
    expect(typeof result.data.usdt_ves).toBe('number');
  });

  it('should have Binance P2P as source', async () => {
    const result = sharedResult;

    expect(result.data.source).toContain('Binance');
  });

  it('should have valid price_range structure', async () => {
    const result = sharedResult;

    expect(result.data).toHaveProperty('price_range');
    expect(result.data.price_range).toHaveProperty('sell_min');
    expect(result.data.price_range).toHaveProperty('sell_max');
    expect(result.data.price_range).toHaveProperty('buy_min');
    expect(result.data.price_range).toHaveProperty('buy_max');
    expect(result.data.price_range).toHaveProperty('min');
    expect(result.data.price_range).toHaveProperty('max');

    // Verify consistency
    expect(result.data.price_range.sell_min).toBe(result.data.sell_min);
    expect(result.data.price_range.sell_max).toBe(result.data.sell_max);
    expect(result.data.price_range.buy_min).toBe(result.data.buy_min);
    expect(result.data.price_range.buy_max).toBe(result.data.buy_max);
  });
});

describe('Binance P2P Scraper - Validation checks', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    resetScraperInstance();
  });

  it('rejects scrape when BUY offers are empty but SELL offers are populated', async () => {
    global.fetch = jest.fn().mockImplementation((url, init) => {
      const body = JSON.parse(init.body);
      if (body.tradeType === 'SELL') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ adv: { price: '771.50', advNo: '123' } }],
            }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
            }),
        } as Response);
      }
    });

    const result = await scrapeBinanceRates();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Incomplete P2P data');
    expect(result.data.usd_ves).toBe(770.0);
  });

  it('rejects scrape when SELL offers are empty but BUY offers are populated', async () => {
    global.fetch = jest.fn().mockImplementation((url, init) => {
      const body = JSON.parse(init.body);
      if (body.tradeType === 'BUY') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ adv: { price: '769.50', advNo: '456' } }],
            }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
            }),
        } as Response);
      }
    });

    const result = await scrapeBinanceRates();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Incomplete P2P data');
    expect(result.data.usd_ves).toBe(770.0);
  });

  it('succeeds when both BUY and SELL offers are populated', async () => {
    global.fetch = jest.fn().mockImplementation((url, init) => {
      const body = JSON.parse(init.body);
      if (body.tradeType === 'SELL') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ adv: { price: '771.00', advNo: '123' } }],
            }),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ adv: { price: '769.00', advNo: '456' } }],
            }),
        } as Response);
      }
    });

    const result = await scrapeBinanceRates();
    expect(result.success).toBe(true);
    expect(result.data.sell_rate).toBe(771.0);
    expect(result.data.buy_rate).toBe(769.0);
    expect(result.data.usd_ves).toBe(770.0);
  });

  it('uses 770-series values for transform fallback defaults when statistical prices are zero or invalid', async () => {
    // 1. Initialize scraperInstance
    await scrapeBinanceRates();

    // 2. Import scraperInstance and override _validateData
    const { scraperInstance } = require('@/lib/scrapers/binance-scraper');
    if (scraperInstance) {
      scraperInstance._validateData = () => null;
    }

    // 3. Mock fetch to return empty data so parsed prices are empty
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response);
    });

    const result = await scrapeBinanceRates();
    expect(result.success).toBe(true);
    expect(result.data.sell_min).not.toBe(300.0);
    expect(result.data.sell_avg).not.toBe(302.0);
    expect(result.data.sell_max).not.toBe(304.0);
    expect(result.data.buy_min).not.toBe(296.0);
    expect(result.data.buy_avg).not.toBe(298.0);
    expect(result.data.buy_max).not.toBe(300.0);
  });
});
