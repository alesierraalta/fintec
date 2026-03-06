/**
 * FinTec Performance — Hybrid Load Test (k6 Browser + API)
 *
 * Purpose: Simulate realistic conditions where browser users navigate
 * the app WHILE the API is under concurrent protocol-level load.
 *
 * This is the most realistic performance test — it answers:
 * "How does the frontend perform when 20 users are hitting the API simultaneously?"
 *
 * Pipeline: Nightly (perf-nightly.yml)
 * Requires: K6_BROWSER_ENABLED=true and Chromium installed
 */

import { browser } from 'k6/browser';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_THRESHOLDS, BROWSER_THRESHOLDS } from '../lib/thresholds.js';
import {
  authenticateUserPool,
  getVUToken,
  authHeaders,
  quickAuth,
} from '../lib/auth.js';
import { CONFIG, apiUrl } from '../lib/config.js';
import { generateTransaction } from '../lib/data-generators.js';

export const options = {
  scenarios: {
    // ── Protocol-level load (API traffic) ──
    api_load: {
      exec: 'apiTraffic',
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      startTime: '30s', // Start API load 30s after browser begins
    },

    // ── Browser-level metrics (frontend) ──
    browser_metrics: {
      exec: 'checkFrontend',
      executor: 'constant-vus',
      vus: 2,
      duration: '5m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },

  thresholds: {
    ...API_THRESHOLDS,
    ...BROWSER_THRESHOLDS,
  },
};

export function setup() {
  const tokens = authenticateUserPool(15);
  return { tokens };
}

// ─────────────────────────────────────────────
// API Traffic Function (runs on api_load scenario)
// ─────────────────────────────────────────────
export function apiTraffic(data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);

  // Mix of read and write operations
  const rand = Math.random();

  if (rand < 0.5) {
    // Read: list transactions
    const res = http.get(apiUrl(CONFIG.api.transactions), {
      headers,
      tags: { endpoint: 'transactions' },
    });
    check(res, { 'api: txn list 200': (r) => r.status === 200 });
  } else if (rand < 0.8) {
    // Read: dashboard batch
    http.batch([
      [
        'GET',
        apiUrl(CONFIG.api.accounts),
        null,
        { headers, tags: { endpoint: 'accounts' } },
      ],
      [
        'GET',
        apiUrl(CONFIG.api.trends),
        null,
        { headers, tags: { endpoint: 'trends' } },
      ],
    ]);
  } else {
    // Write: create transaction
    const payload = generateTransaction();
    const res = http.post(
      apiUrl(CONFIG.api.transactions),
      JSON.stringify(payload),
      {
        headers,
        tags: { endpoint: 'transactions' },
      }
    );
    check(res, { 'api: txn create ok': (r) => r.status < 500 });
  }

  sleep(0.5);
}

// ─────────────────────────────────────────────
// Frontend Check Function (runs on browser_metrics scenario)
// ─────────────────────────────────────────────
export async function checkFrontend() {
  const page = await browser.newPage();

  try {
    // Navigate to dashboard
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.dashboard}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'browser: dashboard loaded': (p) => p.url().includes('/dashboard'),
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Navigate to transactions
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.transactions}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'browser: transactions loaded': (p) => p.url().includes('/transactions'),
    });

    await page.waitForTimeout(1500);

    // Navigate to accounts
    await page.goto(`${CONFIG.baseUrl}${CONFIG.pages.accounts}`, {
      waitUntil: 'networkidle',
    });

    await check(page, {
      'browser: accounts loaded': (p) => p.url().includes('/accounts'),
    });

    await page.screenshot({
      path: `tests/performance/reports/hybrid-${__ITER}.png`,
    });
  } finally {
    await page.close();
  }
}
