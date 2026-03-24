/**
 * FinTec Performance Testing — Transaction CRUD Flow
 *
 * Simulates a realistic transaction lifecycle:
 * 1. List transactions (GET)
 * 2. Create a new transaction (POST)
 * 3. Update transaction metadata (PUT)
 * 4. Refresh list and optional cleanup (GET/DELETE)
 *
 * This flow represents ~60% of real user API traffic.
 */

import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkNoServerError, checkOk } from '../lib/checks.js';
import { generateTransaction } from '../lib/data-generators.js';
import {
  ensureAccount,
  ensureCategory,
  extractData,
} from '../lib/resource-helpers.js';
import { uuidv4 } from '../lib/jslib.js';

/**
 * Execute a full transaction CRUD flow.
 *
 * @param {object} headers Authenticated request headers
 */
export function transactionCRUD(headers) {
  // 1. List existing transactions
  const listRes = http.get(apiUrl(`${CONFIG.api.transactions}?limit=20`), {
    headers,
    tags: { endpoint: 'transactions', operation: 'list' },
  });
  checkOk(listRes, 'txn:list');

  sleep(0.5);

  // Resolve required IDs for transaction creation
  const accountId = ensureAccount(headers);
  const categoryId = ensureCategory(headers, 'EXPENSE');

  if (!accountId || !categoryId) {
    sleep(0.2);
    return;
  }

  // 2. Create a new transaction
  const payload = generateTransaction({
    accountId,
    categoryId,
    type: 'EXPENSE',
  });

  const createRes = http.post(
    apiUrl(CONFIG.api.transactions),
    JSON.stringify(payload),
    {
      headers,
      tags: { endpoint: 'transactions', operation: 'create' },
    }
  );

  check(createRes, {
    'txn:create status 201|403': (r) => r.status === 201 || r.status === 403,
  });

  const createdTransaction = extractData(createRes);
  const transactionId =
    createdTransaction && typeof createdTransaction.id === 'string'
      ? createdTransaction.id
      : null;

  sleep(0.3);

  // 3. Update the created transaction (optional)
  if (transactionId && Math.random() < 0.35) {
    const updateRes = http.put(
      apiUrl(CONFIG.api.transactions),
      JSON.stringify({
        id: transactionId,
        description: `Perf update ${uuidv4().slice(0, 8)}`,
      }),
      {
        headers,
        tags: { endpoint: 'transactions', operation: 'update' },
      }
    );
    checkNoServerError(updateRes, 'txn:update');
    sleep(0.2);
  }

  // 4. Read transactions again (after mutation)
  const refreshRes = http.get(apiUrl(CONFIG.api.transactions), {
    headers,
    tags: { endpoint: 'transactions', operation: 'refresh' },
  });
  checkOk(refreshRes, 'txn:refresh');

  // 5. Cleanup (optional)
  if (transactionId && Math.random() < 0.15) {
    const deleteRes = http.del(
      apiUrl(
        `${CONFIG.api.transactions}?id=${encodeURIComponent(transactionId)}`
      ),
      null,
      {
        headers,
        tags: { endpoint: 'transactions', operation: 'delete' },
      }
    );

    check(deleteRes, {
      'txn:delete status 200': (r) => r.status === 200,
    });
  }

  sleep(0.2);
}
