/**
 * FinTec Performance — Smoke Test
 *
 * Purpose: Quick health check to validate API contract and basic latency.
 * Duration: ~30 seconds | VUs: 5 | Pipeline: PR (perf-pr.yml)
 *
 * This test validates that every critical endpoint responds correctly
 * under minimal load. It runs on every PR to catch regressions early.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { SMOKE_THRESHOLDS } from '../lib/thresholds.js';
import { CONFIG, apiUrl } from '../lib/config.js';
import { quickAuth } from '../lib/auth.js';
import { checkOk, checkNoServerError } from '../lib/checks.js';

const skipAuthSetup = __ENV.K6_SKIP_AUTH_SETUP === '1';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: SMOKE_THRESHOLDS,
};

export function setup() {
  if (skipAuthSetup) {
    console.warn(
      '[smoke] Skipping auth bootstrap because Supabase is unavailable in this environment.'
    );
    return {
      headers: { 'Content-Type': 'application/json' },
      authenticated: false,
    };
  }

  const auth = quickAuth();
  if (!auth) {
    console.error(
      '[smoke] Auth failed — running unauthenticated endpoints only.'
    );
    return {
      headers: { 'Content-Type': 'application/json' },
      authenticated: false,
    };
  }
  return { headers: auth.headers, authenticated: true };
}

export default function (data) {
  // 1. Unauthenticated endpoints
  const binanceRes = http.get(apiUrl(CONFIG.api.binanceRates), {
    tags: { endpoint: 'rates' },
  });
  checkOk(binanceRes, 'smoke:binance-rates');

  const bcvRes = http.get(apiUrl(CONFIG.api.bcvRates), {
    tags: { endpoint: 'rates' },
  });
  checkNoServerError(bcvRes, 'smoke:bcv-rates');

  const healthRes = http.get(apiUrl(CONFIG.api.scrapersHealth), {
    tags: { endpoint: 'health' },
  });
  checkNoServerError(healthRes, 'smoke:scrapers-health');

  // 2. Authenticated endpoints (if auth succeeded)
  if (data.authenticated) {
    const txnRes = http.get(apiUrl(CONFIG.api.transactions), {
      headers: data.headers,
      tags: { endpoint: 'transactions' },
    });
    checkOk(txnRes, 'smoke:transactions');

    const acctRes = http.get(apiUrl(CONFIG.api.accounts), {
      headers: data.headers,
      tags: { endpoint: 'accounts' },
    });
    checkOk(acctRes, 'smoke:accounts');

    const catRes = http.get(apiUrl(CONFIG.api.categories), {
      headers: data.headers,
      tags: { endpoint: 'categories' },
    });
    checkNoServerError(catRes, 'smoke:categories');

    const trendsRes = http.get(apiUrl(CONFIG.api.trends), {
      headers: data.headers,
      tags: { endpoint: 'trends' },
    });
    checkNoServerError(trendsRes, 'smoke:trends');
  }

  sleep(1);
}
