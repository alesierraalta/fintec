/**
 * FinTec Performance Testing — Account Management Flow
 *
 * Simulates account listing and creation:
 * 1. List all accounts (GET)
 * 2. Create a new account (POST)
 */

import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import {
  checkCreated,
  checkNoServerError,
  checkOk,
  checkSuccess,
} from '../lib/checks.js';
import { generateAccount } from '../lib/data-generators.js';
import { extractData } from '../lib/resource-helpers.js';
import { randomIntBetween } from '../lib/jslib.js';

/**
 * Execute an account management flow.
 *
 * @param {object} headers Authenticated request headers
 */
export function accountManagement(headers) {
  // 1. List accounts
  const listRes = http.get(apiUrl(CONFIG.api.accounts), {
    headers,
    tags: { endpoint: 'accounts', operation: 'list' },
  });
  checkOk(listRes, 'acct:list');

  sleep(0.5);

  // 2. Create an account (occasional)
  if (Math.random() < 0.25) {
    const payload = generateAccount();
    const createRes = http.post(
      apiUrl(CONFIG.api.accounts),
      JSON.stringify(payload),
      {
        headers,
        tags: { endpoint: 'accounts', operation: 'create' },
      }
    );

    checkCreated(createRes, 'acct:create');

    const createdAccount = extractData(createRes);
    if (createdAccount && typeof createdAccount.id === 'string') {
      const detailRes = http.get(
        apiUrl(`${CONFIG.api.accounts}/${createdAccount.id}`),
        {
          headers,
          tags: { endpoint: 'accounts', operation: 'detail' },
        }
      );
      checkSuccess(detailRes, 'acct:detail');

      if (Math.random() < 0.2) {
        const patchRes = http.patch(
          apiUrl(`${CONFIG.api.accounts}/${createdAccount.id}`),
          JSON.stringify({ balance: randomIntBetween(1000, 750000) }),
          {
            headers,
            tags: { endpoint: 'accounts', operation: 'patch-balance' },
          }
        );

        check(patchRes, {
          'acct:patch status 200': (r) => r.status === 200,
        });
      }
    } else {
      checkNoServerError(createRes, 'acct:create-fallback');
    }
  }

  sleep(0.3);
}
