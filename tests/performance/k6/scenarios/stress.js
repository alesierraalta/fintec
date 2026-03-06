/**
 * FinTec Performance — Stress Test
 *
 * Purpose: Find the system's breaking point by pushing beyond normal load.
 * Duration: ~10 minutes | VUs: 50→200→0 (ramping) | Pipeline: Staging (perf-staging.yml)
 *
 * Validates graceful degradation: response times increase but errors stay low.
 * The system is NOT expected to meet normal SLOs under stress — thresholds are relaxed.
 */

import { sleep } from 'k6';
import { STRESS_THRESHOLDS } from '../lib/thresholds.js';
import { authenticateUserPool, getVUToken, authHeaders } from '../lib/auth.js';
import { transactionCRUD } from '../flows/transaction-crud.js';
import { dashboardLoad } from '../flows/dashboard-load.js';
import { rateFetch } from '../flows/rate-fetch.js';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 }, // Normal load baseline
        { duration: '3m', target: 100 }, // 2x normal
        { duration: '3m', target: 200 }, // 4x normal — stress point
        { duration: '1m', target: 200 }, // Hold at peak stress
        { duration: '1m', target: 0 }, // Ramp down (observe recovery)
      ],
    },
  },
  thresholds: STRESS_THRESHOLDS,
};

export function setup() {
  const tokens = authenticateUserPool(50);
  return { tokens };
}

export default function (data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);

  // Under stress, focus on high-traffic endpoints
  const rand = Math.random();
  if (rand < 0.6) {
    transactionCRUD(headers);
  } else if (rand < 0.85) {
    dashboardLoad(headers);
  } else {
    rateFetch(headers);
  }

  // Reduced think time under stress (simulating impatient users)
  sleep(Math.random() * 1 + 0.2);
}
