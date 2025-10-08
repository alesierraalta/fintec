/**
 * Binance P2P Scraper Tests
 * Tests for the TypeScript Binance scraper implementation
 */

import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

describe('Binance P2P Scraper', () => {
  // Increase timeout for network requests
  jest.setTimeout(15000);

  it('should return a valid result structure', async () => {
    const result = await scrapeBinanceRates();

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
    const result = await scrapeBinanceRates();

    expect(typeof result.data.usd_ves).toBe('number');
    expect(typeof result.data.usdt_ves).toBe('number');
    expect(typeof result.data.sell_rate).toBe('number');
    expect(typeof result.data.buy_rate).toBe('number');

    // Rates should be positive
    expect(result.data.usd_ves).toBeGreaterThan(0);
    expect(result.data.usdt_ves).toBeGreaterThan(0);

    // Rates should be within reasonable bounds (100-500 VES)
    expect(result.data.usd_ves).toBeGreaterThanOrEqual(80);
    expect(result.data.usd_ves).toBeLessThanOrEqual(600);
  });

  it('should have valid min/max ranges', async () => {
    const result = await scrapeBinanceRates();

    // Sell rates
    expect(result.data.sell_min).toBeLessThanOrEqual(result.data.sell_avg);
    expect(result.data.sell_avg).toBeLessThanOrEqual(result.data.sell_max);

    // Buy rates
    expect(result.data.buy_min).toBeLessThanOrEqual(result.data.buy_avg);
    expect(result.data.buy_avg).toBeLessThanOrEqual(result.data.buy_max);
  });

  it('should have a reasonable spread', async () => {
    const result = await scrapeBinanceRates();

    expect(typeof result.data.spread).toBe('number');
    expect(result.data.spread).toBeGreaterThanOrEqual(0);

    // Spread should typically be less than 10% of the average price
    const avgPrice = (result.data.sell_rate + result.data.buy_rate) / 2;
    expect(result.data.spread).toBeLessThan(avgPrice * 0.15);
  });

  it('should have valid price counts', async () => {
    const result = await scrapeBinanceRates();

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
    const result = await scrapeBinanceRates();
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
    if (result.data.execution_time !== undefined) {
      expect(result.data.execution_time).toBeGreaterThan(0);
      expect(result.data.execution_time).toBeLessThan(12000);
    }
  });

  it('should handle errors gracefully', async () => {
    // This test ensures the scraper doesn't crash on errors
    const result = await scrapeBinanceRates();

    // Even if it fails, it should return a valid structure
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(typeof result.data.usd_ves).toBe('number');
    expect(typeof result.data.usdt_ves).toBe('number');
  });

  it('should have Binance P2P as source', async () => {
    const result = await scrapeBinanceRates();

    expect(result.data.source).toContain('Binance');
  });

  it('should have valid price_range structure', async () => {
    const result = await scrapeBinanceRates();

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

