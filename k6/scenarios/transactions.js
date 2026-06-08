/**
 * Task 3.9: k6 Performance Test — Transactions Endpoint
 *
 * Load test for GET /api/transactions.
 * Threshold: p95 < 300ms
 *
 * Usage:
 *   k6 run k6/scenarios/transactions.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 virtual users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = AUTH_TOKEN
  ? { Authorization: `Bearer ${AUTH_TOKEN}` }
  : {};

export default function () {
  // Test GET /api/transactions (list)
  const listRes = http.get(`${BASE_URL}/api/transactions?limit=50`, { headers });

  check(listRes, {
    'transactions list status is 200': (r) => r.status === 200,
    'transactions list has data': (r) => {
      try {
        const body = r.json();
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
    'transactions list p95 < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Test GET /api/transactions with filters
  const filterRes = http.get(
    `${BASE_URL}/api/transactions?type=EXPENSE&limit=20`,
    { headers }
  );

  check(filterRes, {
    'filtered transactions status is 200': (r) => r.status === 200,
    'filtered transactions p95 < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const failRate = data.metrics.http_req_failed?.values?.rate || 0;

  return {
    stdout: `\n--- Transactions Performance Summary ---\n` +
            `p95 latency: ${p95.toFixed(2)}ms (threshold: 300ms)\n` +
            `Error rate: ${(failRate * 100).toFixed(2)}% (threshold: <1%)\n` +
            `Result: ${p95 < 300 ? 'PASS ✓' : 'FAIL ✗'}\n`,
  };
}
