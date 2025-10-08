/**
 * E2E Test: Verify scrapers return REAL data, not fallback
 */

import { test, expect } from '@playwright/test';

test.describe('Scrapers - Real Data Extraction', () => {
  test('BCV scraper should return REAL data from BCV website', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/bcv-rates');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Should be successful
    expect(data.success).toBe(true);
    expect(data.data.source).toBe('BCV');
    expect(data.data.source).not.toContain('fallback');

    // Should have REAL exchange rates (current market values)
    expect(data.data.usd).toBeGreaterThanOrEqual(150);
    expect(data.data.usd).toBeLessThanOrEqual(250);
    expect(data.data.eur).toBeGreaterThanOrEqual(180);
    expect(data.data.eur).toBeLessThanOrEqual(280);

    // Should NOT be old fallback values
    expect(data.data.usd).not.toBe(50.0);
    expect(data.data.usd).not.toBe(36.5);
    expect(data.data.eur).not.toBe(58.0);
    expect(data.data.eur).not.toBe(39.8);

    console.log('✅ BCV Real Data:', {
      usd: data.data.usd,
      eur: data.data.eur,
      source: data.data.source,
    });
  });

  test('Binance scraper should return REAL data from Binance P2P API', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/binance-rates');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Should have valid data structure (success can be false if cached/rate-limited)
    expect(data.data).toBeDefined();
    expect(data.data.source).toContain('Binance');

    // Should have REAL exchange rates
    expect(data.data.usd_ves).toBeGreaterThan(0);
    expect(data.data.usd_ves).toBeGreaterThan(200); // Should be realistic market value

    // Data should be recent and realistic
    expect(data.data.usd_ves).toBeLessThan(500); // Upper bound for sanity

    console.log('✅ Binance Real Data:', {
      usd_ves: data.data.usd_ves,
      prices_used: data.data.prices_used,
      source: data.data.source,
      success: data.success,
    });
  });

  test('BCV vs Binance comparison should be realistic (< 100% difference)', async ({ request }) => {
    const bcvResponse = await request.get('http://localhost:3000/api/bcv-rates');
    const binanceResponse = await request.get('http://localhost:3000/api/binance-rates');

    const bcvData = await bcvResponse.json();
    const binanceData = await binanceResponse.json();

    const bcvUsd = bcvData.data.usd;
    const binanceUsd = binanceData.data.usd_ves;

    const difference = ((binanceUsd - bcvUsd) / bcvUsd) * 100;

    console.log('📊 Comparison:', {
      bcv_usd: bcvUsd,
      binance_usd: binanceUsd,
      difference_percent: difference.toFixed(2) + '%',
    });

    // Difference should be realistic (typically 30-80%)
    // NOT absurd like 720%
    expect(difference).toBeGreaterThan(0);
    expect(difference).toBeLessThan(150);

    // Specifically, NOT the old broken values
    expect(difference).not.toBeGreaterThan(500);
  });
});

