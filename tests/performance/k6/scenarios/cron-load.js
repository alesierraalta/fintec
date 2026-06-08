import http from 'k6/http';
import { sleep, check } from 'k6';
import { CONFIG } from '../lib/config.js';

export const options = {
  scenarios: {
    cron_batch_load: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should complete within 3 seconds
    http_req_failed: ['rate<0.01'], // less than 1% errors
  },
};

export default function () {
  const cronSecret = __ENV.CRON_SECRET || 'super-secret-cron-key';
  const url = `${CONFIG.baseUrl}/api/cron/recurring-transactions`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  };

  const response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'success is true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
