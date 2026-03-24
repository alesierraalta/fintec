/**
 * FinTec Performance Testing - Profile and Subscription Flow
 *
 * Simulates account settings requests:
 * 1. Update profile settings
 * 2. Fetch subscription status
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';

export function profileAndSubscription(headers) {
  const profileRes = http.put(
    apiUrl(CONFIG.api.authProfile),
    JSON.stringify({
      baseCurrency: 'USD',
      name: 'Perf Test User',
    }),
    {
      headers,
      tags: { endpoint: 'auth', operation: 'profile-update' },
    }
  );

  check(profileRes, {
    'profile:update status 200': (r) => r.status === 200,
  });

  sleep(0.2);

  const subscriptionRes = http.get(apiUrl(CONFIG.api.subscriptionStatus), {
    headers,
    tags: { endpoint: 'subscription', operation: 'status' },
  });

  check(subscriptionRes, {
    'subscription:status 200': (r) => r.status === 200,
  });

  sleep(0.2);
}
