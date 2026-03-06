/**
 * FinTec Performance Testing — Rate Fetch Flow
 *
 * Simulates exchange rate fetching:
 * 1. Binance rates (crypto)
 * 2. BCV rates (official Venezuelan rates)
 *
 * These endpoints have external dependencies (Binance API, BCV scraper)
 * so thresholds are more relaxed (p95 < 300ms).
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk, checkNotRateLimited } from '../lib/checks.js';

/**
 * Execute a rate fetch flow.
 *
 * @param {object} headers Authenticated request headers (some rate endpoints may not need auth)
 */
export function rateFetch(headers) {
  // 1. Fetch Binance rates (should be cached after first call)
  const binanceRes = http.get(apiUrl(CONFIG.api.binanceRates), {
    headers,
    tags: { endpoint: 'rates', operation: 'binance' },
  });
  checkOk(binanceRes, 'rates:binance');
  checkNotRateLimited(binanceRes, 'rates:binance');

  sleep(0.5);

  // 2. Fetch BCV rates
  const bcvRes = http.get(apiUrl(CONFIG.api.bcvRates), {
    headers,
    tags: { endpoint: 'rates', operation: 'bcv' },
  });
  checkOk(bcvRes, 'rates:bcv');
  checkNotRateLimited(bcvRes, 'rates:bcv');

  sleep(0.5);
}
