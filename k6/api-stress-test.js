import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% of requests must complete below 200ms
    'http_req_failed': ['rate<0.01'],   // <1% errors
  },
};

const BASE_URL = 'http://localhost:3000'; // Adjust if running against deployed env

export default function () {
  // Test Binance Rates API (should be cached)
  const res = http.get(`${BASE_URL}/api/binance-rates`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'success is true': (r) => r.json('success') === true,
    'cached is true': (r) => r.json('cached') === true || r.json('fallback') === true, // Should eventually be cached
  });

  sleep(1);
}
