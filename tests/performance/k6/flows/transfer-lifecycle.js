/**
 * FinTec Performance Testing - Transfer Lifecycle Flow
 *
 * Simulates internal transfer operations between user accounts:
 * 1. Ensure two source accounts
 * 2. Create transfer
 * 3. List transfers
 * 4. Optionally delete transfer (cleanup)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk } from '../lib/checks.js';
import { generateTransfer } from '../lib/data-generators.js';
import { ensureTwoAccounts, extractData } from '../lib/resource-helpers.js';

export function transferLifecycle(headers) {
  const accountIds = ensureTwoAccounts(headers);
  if (accountIds.length < 2) {
    sleep(0.2);
    return;
  }

  const [fromAccountId, toAccountId] = accountIds;

  const createRes = http.post(
    apiUrl(CONFIG.api.transfers),
    JSON.stringify(generateTransfer(fromAccountId, toAccountId)),
    {
      headers,
      tags: { endpoint: 'transfers', operation: 'create' },
    }
  );

  check(createRes, {
    'transfer:create status 201|400': (r) =>
      r.status === 201 || r.status === 400,
  });

  const createdTransfer = extractData(createRes);
  const transferId =
    createdTransfer && typeof createdTransfer.id === 'string'
      ? createdTransfer.id
      : null;

  sleep(0.2);

  const listRes = http.get(apiUrl(`${CONFIG.api.transfers}?limit=20`), {
    headers,
    tags: { endpoint: 'transfers', operation: 'list' },
  });
  checkOk(listRes, 'transfer:list');

  if (transferId && Math.random() < 0.2) {
    const deleteRes = http.del(
      apiUrl(`${CONFIG.api.transfers}?id=${encodeURIComponent(transferId)}`),
      null,
      {
        headers,
        tags: { endpoint: 'transfers', operation: 'delete' },
      }
    );

    check(deleteRes, {
      'transfer:delete status 200|404': (r) =>
        r.status === 200 || r.status === 404,
    });
  }

  sleep(0.2);
}
