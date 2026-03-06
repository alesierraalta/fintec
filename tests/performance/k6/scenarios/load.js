/**
 * FinTec Performance — Load Test
 *
 * Purpose: Simulate average-day traffic to validate SLOs under sustained load.
 * Duration: ~10 minutes | VUs: 20→50→0 (ramping) | Pipeline: Staging (perf-staging.yml)
 *
 * Traffic distribution mirrors real usage:
 *   50% transaction operations
 *   25% dashboard loads (parallel API batch)
 *   15% account management
 *   10% rate fetching
 */

import { sleep } from 'k6';
import { API_THRESHOLDS, ENDPOINT_THRESHOLDS } from '../lib/thresholds.js';
import { authenticateUserPool, getVUToken, authHeaders } from '../lib/auth.js';
import { transactionCRUD } from '../flows/transaction-crud.js';
import { dashboardLoad } from '../flows/dashboard-load.js';
import { accountManagement } from '../flows/account-management.js';
import { rateFetch } from '../flows/rate-fetch.js';

export const options = {
  scenarios: {
    average_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 20 }, // Ramp up
        { duration: '5m', target: 50 }, // Sustained load
        { duration: '2m', target: 50 }, // Hold steady
        { duration: '1m', target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    ...API_THRESHOLDS,
    ...ENDPOINT_THRESHOLDS,
  },
};

export function setup() {
  const tokens = authenticateUserPool(20);
  return { tokens };
}

export default function (data) {
  const token = getVUToken(data.tokens);
  const headers = authHeaders(token);

  // Weighted traffic distribution
  const rand = Math.random();
  if (rand < 0.5) {
    transactionCRUD(headers);
  } else if (rand < 0.75) {
    dashboardLoad(headers);
  } else if (rand < 0.9) {
    accountManagement(headers);
  } else {
    rateFetch(headers);
  }

  // Think time: simulate user pause between actions
  sleep(Math.random() * 2 + 0.5); // 0.5s – 2.5s
}
