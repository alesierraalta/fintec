/**
 * FinTec Performance — Spike Test
 *
 * Purpose: Validate system behavior under sudden extreme traffic bursts.
 * Duration: ~2 minutes | VUs: 10→500→10→0 | Pipeline: Nightly (perf-nightly.yml)
 *
 * Simulates scenarios like: viral social media mention, end-of-month salary day,
 * or a sudden surge of users (e.g., BlackFriday / tax season).
 *
 * Key observations:
 * - How quickly does the system recover after the spike?
 * - Does the error rate stay below abort threshold (5%)?
 * - Are database connections properly released?
 */

import { sleep } from 'k6';
import { SPIKE_THRESHOLDS } from '../lib/thresholds.js';
import { authenticateUserPool, getVUToken, authHeaders } from '../lib/auth.js';
import { transactionCRUD } from '../flows/transaction-crud.js';
import { dashboardLoad } from '../flows/dashboard-load.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 }, // Warm up
        { duration: '10s', target: 500 }, // SPIKE: 50x burst
        { duration: '30s', target: 500 }, // Sustain spike
        { duration: '10s', target: 10 }, // Drop back to baseline
        { duration: '30s', target: 10 }, // Recovery observation
        { duration: '10s', target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: SPIKE_THRESHOLDS,
};

export function setup() {
  // Pre-auth a large pool for spike distribution
  const tokens = authenticateUserPool(50);
  return { tokens };
}

export default function (data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);

  // During spike, users mostly read (dashboard) or transact
  if (Math.random() < 0.7) {
    dashboardLoad(headers);
  } else {
    transactionCRUD(headers);
  }

  // Minimal think time during spike (panic traffic)
  sleep(0.1);
}
