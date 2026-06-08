import { test, expect } from '@playwright/test';

test.describe('Navigation Latency (perf-page-transitions)', () => {
  // Use a longer timeout for perf tests if needed, but 60s should be enough
  test.slow();

  const routes = ['/', '/accounts', '/transactions', '/budgets', '/reports'];

  test('navigation between routes should be < 50ms (p95)', async ({ page }) => {
    // Navigate to transactions first (definitely protected)
    await page.goto('/transactions');
    
    // Log URL and HTML if nav not found
    try {
      await page.waitForSelector('h1', { timeout: 30000 });
      console.log('Reached /transactions');
    } catch (e) {
      console.log(`Current URL: ${page.url()}`);
      const html = await page.content();
      console.log(`HTML Snippet: ${html.substring(0, 1000)}`);
      throw e;
    }

    const latencies: number[] = [];

    // Warm up: navigate once to each to ensure components are loaded
    for (const route of routes) {
      const link = page.locator(`a[href="${route}"]`).first();
      await link.click();
      await page.locator('h1').first().waitFor({ state: 'visible' });
    }

    // Perform navigations
    for (let i = 0; i < 4; i++) {
      for (const route of routes) {
        const currentUrl = page.url();
        if (currentUrl.endsWith(route) && route !== '/') continue;
        if (route === '/' && currentUrl === `http://localhost:${process.env.PORT || 3001}/`) continue;

        // Try to find the link by href or text
        const link = page.locator(`a[href="${route}"]`).first();
        
        const startTime = Date.now();
        await link.click();
        
        // Wait for first H1 to be visible on the new page
        await page.locator('h1').first().waitFor({ state: 'visible' });
        const endTime = Date.now();
        
        const latency = endTime - startTime;
        latencies.push(latency);
      }
    }

    latencies.sort((a, b) => a - b);
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

    console.log(`Navigation Latencies: ${latencies.join(', ')}`);
    console.log(`P95 Latency: ${p95Latency}ms`);

    // This should FAIL currently because of the 300ms Framer Motion delay
    expect(p95Latency).toBeLessThan(50);
  });

  test('reduced-motion: navigation should have no transform animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/transactions');
    await page.waitForSelector('h1');

    const link = page.locator('a[href="/accounts"]').first();
    await link.click();

    // Check that the body or the main page wrapper has no transform animation
    // We check for the absence of 'matrix' which indicates an active transform
    const transform = await page.evaluate(() => {
      const el = document.querySelector('body') || document.documentElement;
      return window.getComputedStyle(el).transform;
    });

    // In many apps, the fade is so fast it might be 'none' when we check,
    // but with 300ms 'wait' mode, it should be active or at least visible.
    // However, if the OS prefers reduced motion, it MUST be none.
    expect(transform).toBe('none');
  });
});
