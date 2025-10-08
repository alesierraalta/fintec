import { test, expect } from '@playwright/test';

test.describe('Reports Debugging Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('http://localhost:3000/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should show loading state initially', async ({ page }) => {
    // Check if loading indicators are present
    const loadingElements = await page.locator('[data-testid="loading"]').count();
    console.log('Loading elements found:', loadingElements);
  });

  test('should verify useOptimizedData hook is working', async ({ page }) => {
    // Check browser console for any errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for console errors
    console.log('Console errors:', consoleErrors);
    expect(consoleErrors.length).toBe(0);
  });

  test('should check if data is being loaded', async ({ page }) => {
    // Check if transactions data is present in the DOM
    const transactionElements = await page.locator('[data-testid*="transaction"]').count();
    console.log('Transaction elements found:', transactionElements);

    // Check if accounts data is present
    const accountElements = await page.locator('[data-testid*="account"]').count();
    console.log('Account elements found:', accountElements);

    // Check if categories data is present
    const categoryElements = await page.locator('[data-testid*="category"]').count();
    console.log('Category elements found:', categoryElements);
  });

  test('should verify metrics calculations', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check for metric values (not just $0)
    const metricElements = await page.locator('[data-testid*="metric"]').all();
    console.log('Metric elements found:', metricElements.length);

    for (const element of metricElements) {
      const text = await element.textContent();
      console.log('Metric text:', text);
    }
  });

  test('should check authentication status', async ({ page }) => {
    // Check if user is authenticated by looking for auth-related elements
    const authElements = await page.locator('[data-testid*="auth"]').count();
    console.log('Auth elements found:', authElements);

    // Check localStorage for auth tokens
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token');
    });
    console.log('Auth token in localStorage:', authToken ? 'Present' : 'Not found');
  });

  test('should verify network requests', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('api')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Reload page to capture requests
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('Network requests:', requests);
    expect(requests.length).toBeGreaterThan(0);
  });
});
