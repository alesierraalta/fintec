/**
 * FinTec Performance — Dashboard Web Vitals (k6 Browser)
 *
 * Purpose: Measure Core Web Vitals (FCP, LCP, CLS) on the dashboard page
 * using a real browser (Chromium). Runs without concurrent API load to
 * establish a clean frontend baseline.
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
    browser_vitals: {
      executor: 'constant-vus',
      vus: 1,
      duration: '2m',
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
    // ── Dashboard ──
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.dashboard}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'dashboard: page loaded': (p) => p.url().includes('/dashboard'),
    });

    // Wait for dynamic content to render (charts, balances)
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'tests/performance/reports/dashboard-vitals.png',
    });

    sleep(2);

    // ── Transactions Page ──
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.transactions}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'transactions: page loaded': (p) => p.url().includes('/transactions'),
    });

    await page.waitForTimeout(1500);

    await page.screenshot({
      path: 'tests/performance/reports/transactions-vitals.png',
    });

    sleep(2);

    // ── Accounts Page ──
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.accounts}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'accounts: page loaded': (p) => p.url().includes('/accounts'),
    });

    await page.waitForTimeout(1000);

    sleep(2);
  } finally {
    await page.close();
  }
}
