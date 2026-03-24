/**
 * FinTec Performance Testing - Recurring Transaction Lifecycle Flow
 *
 * Simulates user interaction with recurring transactions:
 * 1. List recurring transactions
 * 2. Create recurring transaction
 * 3. Update recurring transaction
 * 4. Optionally delete recurring transaction
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk } from '../lib/checks.js';
import { generateRecurringTransaction } from '../lib/data-generators.js';
import {
  ensureAccount,
  ensureCategory,
  extractData,
} from '../lib/resource-helpers.js';

export function recurringLifecycle(headers) {
  const accountId = ensureAccount(headers);
  const categoryId = ensureCategory(headers, 'EXPENSE');

  if (!accountId || !categoryId) {
    sleep(0.2);
    return;
  }

  const listRes = http.get(apiUrl(CONFIG.api.recurringTransactions), {
    headers,
    tags: { endpoint: 'recurring', operation: 'list' },
  });
  checkOk(listRes, 'recurring:list');

  sleep(0.2);

  const createRes = http.post(
    apiUrl(CONFIG.api.recurringTransactions),
    JSON.stringify(
      generateRecurringTransaction(accountId, categoryId, 'EXPENSE')
    ),
    {
      headers,
      tags: { endpoint: 'recurring', operation: 'create' },
    }
  );

  check(createRes, {
    'recurring:create status 201|400': (r) =>
      r.status === 201 || r.status === 400,
  });

  const createdRecurring = extractData(createRes);
  const recurringId =
    createdRecurring && typeof createdRecurring.id === 'string'
      ? createdRecurring.id
      : null;

  if (recurringId) {
    const updateRes = http.put(
      apiUrl(CONFIG.api.recurringTransactions),
      JSON.stringify({
        id: recurringId,
        description: 'Updated by k6 recurring flow',
      }),
      {
        headers,
        tags: { endpoint: 'recurring', operation: 'update' },
      }
    );

    check(updateRes, {
      'recurring:update status 200|404': (r) =>
        r.status === 200 || r.status === 404,
    });

    if (Math.random() < 0.35) {
      const deleteRes = http.del(
        apiUrl(
          `${CONFIG.api.recurringTransactions}?id=${encodeURIComponent(recurringId)}`
        ),
        null,
        {
          headers,
          tags: { endpoint: 'recurring', operation: 'delete' },
        }
      );

      check(deleteRes, {
        'recurring:delete status 200|404': (r) =>
          r.status === 200 || r.status === 404,
      });
    }
  }

  sleep(0.2);
}
