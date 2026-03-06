/**
 * FinTec Performance Testing — Account Management Flow
 *
 * Simulates account listing and creation:
 * 1. List all accounts (GET)
 * 2. Create a new account (POST)
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG, apiUrl } from '../lib/config.js';
import { checkOk, checkNoServerError } from '../lib/checks.js';
import { generateAccount } from '../lib/data-generators.js';

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

  // 2. Create an account (occasional — not every iteration)
  if (Math.random() < 0.2) {
    const payload = generateAccount();
    const createRes = http.post(
      apiUrl(CONFIG.api.accounts),
      JSON.stringify(payload),
      {
        headers,
        tags: { endpoint: 'accounts', operation: 'create' },
      }
    );
    checkNoServerError(createRes, 'acct:create');
  }

  sleep(0.3);
}
