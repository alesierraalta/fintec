/**
 * FinTec Performance — Transaction Flow (k6 Browser)
 *
 * Purpose: Measure the real user experience of creating a transaction,
 * including form interaction times, navigation, and rendering.
 *
 * Pipeline: Nightly (perf-nightly.yml)
 * Requires: K6_BROWSER_ENABLED=true and Chromium installed
 */

import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { BROWSER_THRESHOLDS } from '../lib/thresholds.js';
import { CONFIG } from '../lib/config.js';

export const options = {
  scenarios: {
    transaction_flow: {
      executor: 'constant-vus',
      vus: 1,
      duration: '3m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: BROWSER_THRESHOLDS,
};

export default async function () {
  const page = await browser.newPage();

  try {
    // 1. Navigate to transactions page
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.transactions}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'txn-flow: transactions page loaded': (p) =>
        p.url().includes('/transactions'),
    });

    // 2. Measure time to interactive
    const navTiming = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('navigation')[0])
    );

    if (navTiming) {
      const timing = JSON.parse(navTiming);
      console.log(
        `[browser] TTFB: ${timing.responseStart}ms, DOM Interactive: ${timing.domInteractive}ms, Load Complete: ${timing.loadEventEnd}ms`
      );
    }

    // 3. Measure paint timing
    const paintEntries = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('paint'))
    );

    if (paintEntries) {
      const paints = JSON.parse(paintEntries);
      for (const paint of paints) {
        console.log(`[browser] ${paint.name}: ${paint.startTime}ms`);
      }
    }

    await page.screenshot({
      path: `tests/performance/reports/txn-flow-${__ITER}.png`,
    });

    sleep(3);
  } finally {
    await page.close();
  }
}
