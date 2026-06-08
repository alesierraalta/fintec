/**
 * Task 3.11: k6 Performance Test — Rates Endpoint
 *
 * Load test for GET /api/bcv-rates and GET /api/binance-rates.
 * Threshold: p95 < 1000ms (external API dependency)
 *
 * Usage:
 *   k6 run k6/scenarios/rates.js
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
    http_req_duration: ['p(95)<1000'], // 95% below 1000ms (external API)
    http_req_failed: ['rate<0.05'],    // <5% error rate (external APIs may fail)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = AUTH_TOKEN
  ? { Authorization: `Bearer ${AUTH_TOKEN}` }
  : {};

export default function () {
  // Test GET /api/bcv-rates
  const bcvRes = http.get(`${BASE_URL}/api/bcv-rates`, { headers });

  check(bcvRes, {
    'bcv rates status is 200': (r) => r.status === 200,
    'bcv rates p95 < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);

  // Test GET /api/binance-rates
  const binanceRes = http.get(`${BASE_URL}/api/binance-rates`, { headers });

  check(binanceRes, {
    'binance rates status is 200': (r) => r.status === 200,
    'binance rates p95 < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const failRate = data.metrics.http_req_failed?.values?.rate || 0;

  return {
    stdout: `\n--- Rates Performance Summary ---\n` +
            `p95 latency: ${p95.toFixed(2)}ms (threshold: 1000ms)\n` +
            `Error rate: ${(failRate * 100).toFixed(2)}% (threshold: <5%)\n` +
            `Result: ${p95 < 1000 ? 'PASS ✓' : 'FAIL ✗'}\n`,
  };
}
