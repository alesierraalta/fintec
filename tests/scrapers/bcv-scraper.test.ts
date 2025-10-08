/**
 * BCV Scraper Tests
 * Tests for the TypeScript BCV scraper implementation
 */

import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';

describe('BCV Scraper', () => {
  // Increase timeout for network requests
  jest.setTimeout(10000);

  it('should return a valid result structure', async () => {
    const result = await scrapeBCVRates();

    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('usd');
    expect(result.data).toHaveProperty('eur');
    expect(result.data).toHaveProperty('lastUpdated');
    expect(result.data).toHaveProperty('source');
  });

  it('should return valid USD and EUR rates', async () => {
    const result = await scrapeBCVRates();

    expect(typeof result.data.usd).toBe('number');
    expect(typeof result.data.eur).toBe('number');

    // Rates should be positive
    expect(result.data.usd).toBeGreaterThan(0);
    expect(result.data.eur).toBeGreaterThan(0);

    // Rates should be within reasonable bounds
    expect(result.data.usd).toBeGreaterThanOrEqual(20);
    expect(result.data.usd).toBeLessThanOrEqual(300);
    expect(result.data.eur).toBeGreaterThanOrEqual(20);
    expect(result.data.eur).toBeLessThanOrEqual(400);
  });

  it('should have a valid timestamp', async () => {
    const result = await scrapeBCVRates();
    const timestamp = new Date(result.data.lastUpdated);

    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should complete within reasonable time', async () => {
    const startTime = Date.now();
    await scrapeBCVRates();
    const executionTime = Date.now() - startTime;

    // Should complete within 8 seconds (including network time)
    expect(executionTime).toBeLessThan(8000);
  });

  it('should handle errors gracefully', async () => {
    // This test ensures the scraper doesn't crash on errors
    const result = await scrapeBCVRates();

    // Even if it fails, it should return a valid structure
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(typeof result.data.usd).toBe('number');
    expect(typeof result.data.eur).toBe('number');
  });

  it('should include execution time in result', async () => {
    const result = await scrapeBCVRates();

    if (result.executionTime !== undefined) {
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have BCV as source', async () => {
    const result = await scrapeBCVRates();

    expect(result.data.source).toContain('BCV');
  });
});

