/**
 * FinTec Performance Testing — Transaction CRUD Flow
 *
 * Simulates a realistic transaction lifecycle:
 * 1. List transactions (GET)
 * 2. Create a new transaction (POST)
 * 3. Read the created transaction (GET by ID)
 *
 * This flow represents ~60% of real user API traffic.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk, checkCreated, checkNoServerError } from '../lib/checks.js';
import { generateTransaction } from '../lib/data-generators.js';

/**
 * Execute a full transaction CRUD flow.
 *
 * @param {object} headers Authenticated request headers
 */
export function transactionCRUD(headers) {
  // 1. List existing transactions
  const listRes = http.get(apiUrl(CONFIG.api.transactions), {
    headers,
    tags: { endpoint: 'transactions', operation: 'list' },
  });
  checkOk(listRes, 'txn:list');

  sleep(0.5);

  // 2. Create a new transaction
  const payload = generateTransaction();
  const createRes = http.post(
    apiUrl(CONFIG.api.transactions),
    JSON.stringify(payload),
    {
      headers,
      tags: { endpoint: 'transactions', operation: 'create' },
    }
  );
  checkNoServerError(createRes, 'txn:create');

  sleep(0.3);

  // 3. Read transactions again (after mutation)
  const refreshRes = http.get(apiUrl(CONFIG.api.transactions), {
    headers,
    tags: { endpoint: 'transactions', operation: 'refresh' },
  });
  checkOk(refreshRes, 'txn:refresh');

  sleep(0.2);
}
