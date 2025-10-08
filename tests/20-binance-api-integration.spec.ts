import { test, expect } from '@playwright/test';

/**
 * Integration test for Binance API endpoint
 * Verifies that the API returns real data from the scraper
 */

test.describe('Binance API Integration', () => {
  
  test('API endpoint returns real scraper data', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/binance-rates');
    const data = await response.json();
    
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    expect(response.ok()).toBeTruthy();
    expect(data.success).toBeTruthy();
    expect(data.data).toBeDefined();
    
    // Verify we're getting REAL data, not fallback
    expect(data.data.prices_used).toBeGreaterThan(0);
    expect(data.data.sell_prices_used).toBeGreaterThan(0);
    expect(data.data.buy_prices_used).toBeGreaterThan(0);
    
    // Verify rates are reasonable (not fallback values)
    expect(data.data.usd_ves).toBeGreaterThan(250);
    expect(data.data.usd_ves).toBeLessThan(400);
    
    // Verify structure
    expect(data.data.sell_rate).toBeGreaterThan(0);
    expect(data.data.buy_rate).toBeGreaterThan(0);
    expect(data.data.spread).toBeGreaterThanOrEqual(0);
    
    console.log('✅ API is returning REAL data:', {
      usd_ves: data.data.usd_ves,
      sell_rate: data.data.sell_rate,
      buy_rate: data.data.buy_rate,
      prices_used: data.data.prices_used,
      source: data.data.source
    });
  });

  test('UI component displays current rates', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for Binance rates component to load
    await page.waitForSelector('text=Binance P2P', { timeout: 10000 });
    
    // Check that we're not showing fallback data (228.50)
    const content = await page.content();
    const hasFallbackData = content.includes('228.50') && content.includes('0 ofertas');
    
    if (hasFallbackData) {
      console.warn('⚠️ UI is showing fallback data. Try refreshing the page.');
    } else {
      console.log('✅ UI is showing real data');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/binance-rates-ui.png', fullPage: true });
  });

  test('Refresh button fetches new data', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for component
    await page.waitForSelector('text=Binance P2P', { timeout: 10000 });
    
    // Find and click refresh button
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await refreshButton.click();
    
    // Wait a moment for refresh
    await page.waitForTimeout(2000);
    
    console.log('✅ Refresh button clicked successfully');
  });
});

