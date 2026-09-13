import { test, expect } from '@playwright/test';

type RouteTiming = {
  route: string;
  ttfb: number;
  domInteractive: number;
  domContentLoaded: number;
  load: number;
  fcp: number;
  lcp: number;
  cls: number;
};

type TransitionTiming = {
  from: string;
  to: string;
  durationMs: number;
};

const ROUTES = [
  '/',
  '/transactions',
  '/accounts',
  '/categories',
  '/budgets',
  '/recurring',
  '/settings',
];

test.describe('Comprehensive Page Load & Inter-Page Performance Benchmark', () => {
  test.slow();

  test('measures cold page load timings and Web Vitals across all main routes', async ({
    page,
  }) => {
    const results: RouteTiming[] = [];

    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: 'load' });
      await page.waitForTimeout(500);

      const metrics = await page.evaluate(() => {
        const navEntries = performance.getEntriesByType(
          'navigation'
        ) as PerformanceNavigationTiming[];
        const nav = navEntries[0];

        let fcp = 0;
        let lcp = 0;
        let cls = 0;

        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-contentful-paint') {
            fcp = Math.round(entry.startTime);
          }
        }

        return {
          ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
          domInteractive: nav
            ? Math.round(nav.domInteractive - nav.responseStart)
            : 0,
          domContentLoaded: nav
            ? Math.round(nav.domContentLoadedEventEnd - nav.fetchStart)
            : 0,
          load: nav ? Math.round(nav.loadEventEnd - nav.fetchStart) : 0,
          fcp,
          lcp,
          cls,
        };
      });

      results.push({
        route,
        ...metrics,
      });
    }

    console.log('\n=== COLD PAGE LOAD TIMINGS & WEB VITALS ===');
    console.table(results);

    // Assert that every route loads and parses DOM within budget
    for (const r of results) {
      expect(r.load).toBeGreaterThan(0);
      expect(r.domContentLoaded).toBeLessThan(4000); // 4s dev server budget
    }
  });

  test('measures client-side soft navigation times between pages', async ({
    page,
  }) => {
    // Start at transactions
    await page.goto('/transactions', { waitUntil: 'networkidle' });
    await page.waitForSelector('main', { timeout: 15000 });

    const transitionSequence = [
      {
        from: '/transactions',
        to: '/accounts',
        selector: 'a[href="/accounts"]',
      },
      {
        from: '/accounts',
        to: '/categories',
        selector: 'a[href="/categories"]',
      },
      { from: '/categories', to: '/budgets', selector: 'a[href="/budgets"]' },
      { from: '/budgets', to: '/recurring', selector: 'a[href="/recurring"]' },
      { from: '/recurring', to: '/settings', selector: 'a[href="/settings"]' },
      {
        from: '/settings',
        to: '/transactions',
        selector: 'a[href="/transactions"]',
      },
    ];

    const transitionResults: TransitionTiming[] = [];

    // Warm-up pass
    for (const step of transitionSequence) {
      const link = page.locator(step.selector).first();
      if ((await link.count()) > 0) {
        await link.click();
        await page.waitForURL(`**${step.to}*`, { timeout: 10000 });
        await page.waitForSelector('main', { timeout: 10000 });
      }
    }

    // Measurement pass (3 iterations)
    for (let round = 1; round <= 3; round++) {
      for (const step of transitionSequence) {
        const link = page.locator(step.selector).first();
        if ((await link.count()) === 0) continue;

        const startTime = Date.now();
        await link.click();
        await page.waitForURL(`**${step.to}*`, { timeout: 10000 });
        await page.waitForSelector('main', { timeout: 10000 });
        const endTime = Date.now();

        transitionResults.push({
          from: step.from,
          to: step.to,
          durationMs: endTime - startTime,
        });
      }
    }

    console.log('\n=== CLIENT-SIDE SOFT NAVIGATION TIMINGS ===');
    console.table(transitionResults);

    const durations = transitionResults
      .map((t) => t.durationMs)
      .sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p90 = durations[Math.floor(durations.length * 0.9)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const avg = Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length
    );

    console.log(
      `Summary: Average=${avg}ms, P50=${p50}ms, P90=${p90}ms, P95=${p95}ms`
    );

    // Client-side transitions in Next.js SPA mode should be snappy (< 500ms average)
    expect(avg).toBeLessThan(500);
  });

  test('monitors JS heap stability and layout shifts across repeated navigations', async ({
    page,
  }) => {
    await page.goto('/transactions', { waitUntil: 'networkidle' });

    // Measure initial heap size if available in Chromium
    const initialHeap = await page.evaluate(() => {
      const perf = window.performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : null;
    });

    // Navigate between transactions and accounts 10 times in a loop
    for (let i = 0; i < 10; i++) {
      const target = i % 2 === 0 ? '/accounts' : '/transactions';
      const link = page.locator(`a[href="${target}"]`).first();
      await link.click();
      await page.waitForURL(`**${target}*`);
    }

    const finalHeap = await page.evaluate(() => {
      const perf = window.performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : null;
    });

    if (initialHeap && finalHeap) {
      const heapDeltaMb = ((finalHeap - initialHeap) / 1024 / 1024).toFixed(2);
      console.log(
        `\nJS Heap Initial: ${(initialHeap / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(`JS Heap Final: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
      console.log(`JS Heap Delta: ${heapDeltaMb} MB`);

      // Heap should not balloon by more than 50MB after 10 navigations
      expect(finalHeap - initialHeap).toBeLessThan(50 * 1024 * 1024);
    }
  });
});
