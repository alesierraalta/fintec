/**
 * FinTec Performance Testing - API Resource Helpers
 *
 * Helpers to resolve IDs required by realistic user flows
 * (accounts, categories, etc.).
 */

import http from 'k6/http';
import { CONFIG, apiUrl } from './config.js';
import { generateAccount, generateCategory } from './data-generators.js';
import { randomItem } from './jslib.js';

function toQueryString(query) {
  const entries = Object.entries(query || {}).filter(([, value]) =>
    Boolean(value)
  );

  if (entries.length === 0) {
    return '';
  }

  return `?${entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')}`;
}

export function safeJson(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

export function extractData(res) {
  const body = safeJson(res);

  if (!body || typeof body !== 'object') {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : null;
}

export function listAccounts(headers) {
  const res = http.get(apiUrl(CONFIG.api.accounts), {
    headers,
    tags: { endpoint: 'accounts', operation: 'list' },
  });

  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export function ensureAccount(headers) {
  const accounts = listAccounts(headers).filter(
    (account) => account && typeof account.id === 'string'
  );

  if (accounts.length > 0) {
    return randomItem(accounts).id;
  }

  const createRes = http.post(
    apiUrl(CONFIG.api.accounts),
    JSON.stringify(generateAccount()),
    {
      headers,
      tags: { endpoint: 'accounts', operation: 'create' },
    }
  );

  const account = extractData(createRes);
  return account && typeof account.id === 'string' ? account.id : null;
}

export function ensureTwoAccounts(headers) {
  const ids = listAccounts(headers)
    .map((account) => account && account.id)
    .filter((id) => typeof id === 'string');

  let attempts = 0;
  while (ids.length < 2 && attempts < 3) {
    attempts += 1;
    const createRes = http.post(
      apiUrl(CONFIG.api.accounts),
      JSON.stringify(generateAccount()),
      {
        headers,
        tags: { endpoint: 'accounts', operation: 'create' },
      }
    );

    const created = extractData(createRes);
    if (created && typeof created.id === 'string') {
      ids.push(created.id);
    }
  }

  return ids.slice(0, 2);
}

export function listCategories(headers, kind) {
  const path = `${CONFIG.api.categories}${toQueryString({ kind })}`;
  const res = http.get(apiUrl(path), {
    headers,
    tags: { endpoint: 'categories', operation: 'list' },
  });

  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export function ensureCategory(headers, kind = 'EXPENSE') {
  const categories = listCategories(headers, kind).filter(
    (category) => category && typeof category.id === 'string'
  );

  if (categories.length > 0) {
    return randomItem(categories).id;
  }

  const createRes = http.post(
    apiUrl(CONFIG.api.categories),
    JSON.stringify(generateCategory(kind)),
    {
      headers,
      tags: { endpoint: 'categories', operation: 'create' },
    }
  );

  const category = extractData(createRes);
  return category && typeof category.id === 'string' ? category.id : null;
}
