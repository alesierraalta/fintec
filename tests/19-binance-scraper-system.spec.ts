import { test, expect } from '@playwright/test';
import { scrapeBinanceRates } from '../lib/scrapers/binance-scraper';

/**
 * Comprehensive Binance Scraper System Tests (TypeScript Native)
 * Tests the complete scraper system including:
 * - Direct TypeScript scraper execution
 * - Data quality and validation
 * - Performance SLA
 */

test.describe('Binance Scraper System', () => {

  test('TypeScript scraper executes and returns valid data', async () => {
    const startTime = Date.now();

    // Execute the scraper directly
    const result = await scrapeBinanceRates();

    const executionTime = Date.now() - startTime;

    // Log execution time
    console.log(`Scraper execution time: ${executionTime}ms`);

    // Validate structure
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    if (result.data) {
      // Validate Core KPIs
      expect(result.data.usd_ves).toBeGreaterThan(0);
      expect(result.data.usdt_ves).toBeGreaterThan(0);
      expect(result.data.sell_rate).toBeGreaterThan(0);
      expect(result.data.buy_rate).toBeGreaterThan(0);

      console.log('Scraper Rates:', {
        sell_min: result.data.sell_min,
        buy_max: result.data.buy_max,
        spread: result.data.spread
      });

      // Validate Stats
      expect(result.data.sell_min).toBeLessThanOrEqual(result.data.sell_max);
      expect(result.data.buy_min).toBeLessThanOrEqual(result.data.buy_max);

      // Validate price range object
      expect(result.data.price_range).toBeDefined();
      expect(result.data.price_range.min).toBeLessThanOrEqual(result.data.price_range.max);
    }
  });

  test('Scraper performance - completes within SLA', async () => {
    const startTime = Date.now();

    const result = await scrapeBinanceRates();

    const totalTime = Date.now() - startTime;

    // Optimization goal: Native TS should be faster than spawning Python
    console.log(`Performance test: ${totalTime}ms`);

    if (result.data?.execution_time) {
      console.log(`Scraper internal time: ${result.data.execution_time}ms`);
    }

    // Should complete in reasonable time
    expect(totalTime).toBeLessThan(30000); // 30 seconds max (allowing for network variance)
  });
});
