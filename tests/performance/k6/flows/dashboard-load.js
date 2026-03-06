/**
 * FinTec Performance Testing — Dashboard Load Flow
 *
 * Simulates the API calls made when a user loads the dashboard.
 * The dashboard fetches multiple endpoints in parallel:
 * 1. Accounts (balances overview)
 * 2. Transactions (recent list)
 * 3. Trends (spending charts)
 * 4. Categories (for breakdown)
 *
 * This flow validates the aggregation latency critical path.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk } from '../lib/checks.js';

/**
 * Execute a dashboard load flow (parallel API calls).
 *
 * @param {object} headers Authenticated request headers
 */
export function dashboardLoad(headers) {
  // Simulate the parallel requests the dashboard makes on load.
  // k6's http.batch() sends them concurrently.
  const responses = http.batch([
    [
      'GET',
      apiUrl(CONFIG.api.accounts),
      null,
      { headers, tags: { endpoint: 'accounts', operation: 'dashboard' } },
    ],
    [
      'GET',
      apiUrl(CONFIG.api.transactions),
      null,
      { headers, tags: { endpoint: 'transactions', operation: 'dashboard' } },
    ],
    [
      'GET',
      apiUrl(CONFIG.api.trends),
      null,
      { headers, tags: { endpoint: 'trends', operation: 'dashboard' } },
    ],
    [
      'GET',
      apiUrl(CONFIG.api.categories),
      null,
      { headers, tags: { endpoint: 'categories', operation: 'dashboard' } },
    ],
  ]);

  // Validate each response
  checkOk(responses[0], 'dash:accounts');
  checkOk(responses[1], 'dash:transactions');
  checkOk(responses[2], 'dash:trends');
  checkOk(responses[3], 'dash:categories');

  sleep(1);
}
