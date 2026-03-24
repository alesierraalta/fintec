/**
 * FinTec Performance Testing - Full User Journey
 *
 * Covers core user behavior across the app:
 * dashboard, accounts, transactions, transfers, recurring,
 * profile/subscription, and public endpoints.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { accountManagement } from './account-management.js';
import { dashboardLoad } from './dashboard-load.js';
import { profileAndSubscription } from './profile-and-subscription.js';
import { rateFetch } from './rate-fetch.js';
import { recurringLifecycle } from './recurring-lifecycle.js';
import { transactionCRUD } from './transaction-crud.js';
import { transferLifecycle } from './transfer-lifecycle.js';
import { randomIntBetween, uuidv4 } from '../lib/jslib.js';

function publicLandingFlow() {
  const waitlistEmail = `perf-${uuidv4().slice(0, 8)}@fintec.test`;

  const waitlistRes = http.post(
    apiUrl(CONFIG.api.waitlist),
    JSON.stringify({ email: waitlistEmail, referrer: 'k6-user-journey' }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'waitlist', operation: 'join' },
    }
  );

  check(waitlistRes, {
    'waitlist:status 201|409|429': (r) =>
      r.status === 201 || r.status === 409 || r.status === 429,
  });
}

export function fullUserJourney(headers) {
  // Core app paths
  dashboardLoad(headers);
  transactionCRUD(headers);

  // Medium-frequency paths
  if (Math.random() < 0.6) {
    accountManagement(headers);
  }

  if (Math.random() < 0.35) {
    transferLifecycle(headers);
  }

  if (Math.random() < 0.25) {
    recurringLifecycle(headers);
  }

  // Settings / subscription / external data
  profileAndSubscription(headers);
  rateFetch(headers);

  const trendsRes = http.get(apiUrl(CONFIG.api.trends), {
    headers,
    tags: { endpoint: 'trends', operation: 'journey' },
  });
  check(trendsRes, {
    'journey:trends no 5xx': (r) => r.status < 500,
  });

  const healthRes = http.get(apiUrl(CONFIG.api.scrapersHealth), {
    tags: { endpoint: 'health', operation: 'journey' },
  });
  check(healthRes, {
    'journey:health no 5xx': (r) => r.status < 500,
  });

  // Public flow at low frequency to include top-of-funnel path
  if (Math.random() < 0.1) {
    publicLandingFlow();
  }

  sleep(randomIntBetween(1, 3));
}
