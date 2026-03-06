/**
 * FinTec Performance — Soak Test (Endurance)
 *
 * Purpose: Run sustained moderate load for 60 minutes to detect:
 *   - Memory leaks (gradually increasing response times)
 *   - Connection pool exhaustion over time
 *   - Cache invalidation issues
 *   - Garbage collection pauses
 *
 * Duration: ~60 minutes | VUs: 50 (constant) | Pipeline: Nightly (perf-nightly.yml)
 *
 * Analysis: Compare p95 in first 10 minutes vs last 10 minutes.
 * If the delta exceeds 50%, there's likely a leak or resource exhaustion issue.
 */

import { sleep } from 'k6';
import { SOAK_THRESHOLDS } from '../lib/thresholds.js';
import { authenticateUserPool, getVUToken, authHeaders } from '../lib/auth.js';
import { transactionCRUD } from '../flows/transaction-crud.js';
import { dashboardLoad } from '../flows/dashboard-load.js';
import { accountManagement } from '../flows/account-management.js';
import { rateFetch } from '../flows/rate-fetch.js';

export const options = {
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 50 }, // Ramp up to target
        { duration: '50m', target: 50 }, // Sustain for 50 minutes
        { duration: '5m', target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: SOAK_THRESHOLDS,
};

export function setup() {
  const tokens = authenticateUserPool(30);
  return { tokens };
}

export default function (data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);

  // Full traffic distribution (realistic mix)
  const rand = Math.random();
  if (rand < 0.45) {
    transactionCRUD(headers);
  } else if (rand < 0.7) {
    dashboardLoad(headers);
  } else if (rand < 0.85) {
    accountManagement(headers);
  } else {
    rateFetch(headers);
  }

  // Normal think time
  sleep(Math.random() * 3 + 1); // 1s – 4s
}
