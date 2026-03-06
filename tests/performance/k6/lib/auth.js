/**
 * FinTec Performance Testing — Supabase Authentication Helper
 *
 * Handles JWT acquisition and token management for k6 VUs.
 * Designed to pre-authenticate users in setup() to avoid
 * hitting Supabase auth rate limits during load tests.
 */

import http from 'k6/http';
import { CONFIG, authUrl } from './config.js';

/**
 * Authenticate a single user via Supabase GoTrue and return the access token.
 *
 * @param {string} email
 * @param {string} password
 * @returns {string|null} JWT access token or null on failure
 */
export function authenticateUser(email, password) {
  const res = http.post(
    authUrl(CONFIG.auth.token),
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.supabaseAnonKey,
      },
      tags: { endpoint: 'auth' },
    }
  );

  if (res.status !== 200) {
    console.warn(
      `[auth] Failed for ${email}: status=${res.status} body=${res.body}`
    );
    return null;
  }

  const body = res.json();
  return body.access_token || null;
}

/**
 * Pre-authenticate a pool of test users.
 * Call this in the k6 `setup()` function so tokens are shared across all VUs.
 *
 * @param {number} [count] Number of users to authenticate (defaults to CONFIG.testUserPoolSize)
 * @returns {{ tokens: string[] }}
 */
export function authenticateUserPool(count) {
  const poolSize = count || CONFIG.testUserPoolSize;
  const tokens = [];

  for (let i = 0; i < poolSize; i++) {
    // Use indexed test emails: perf-test-0@fintec.test, perf-test-1@, ...
    const email =
      poolSize === 1
        ? CONFIG.testUserEmail
        : CONFIG.testUserEmail.replace('@', `-${i}@`);

    const token = authenticateUser(email, CONFIG.testUserPassword);
    if (token) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0) {
    console.error('[auth] No tokens acquired! Tests will fail on auth.');
  } else {
    console.log(`[auth] Acquired ${tokens.length}/${poolSize} tokens.`);
  }

  return tokens;
}

/**
 * Get the token for the current VU from the token pool.
 * Distributes tokens round-robin across VUs.
 *
 * @param {string[]} tokens
 * @returns {string}
 */
export function getVUToken(tokens) {
  if (!tokens || tokens.length === 0) {
    throw new Error(
      '[auth] Token pool is empty. Check setup() authentication.'
    );
  }
  return tokens[__VU % tokens.length];
}

/**
 * Build request headers with a Bearer token and Supabase anon key.
 *
 * @param {string} token JWT access token
 * @returns {object} Headers object ready for http.get/post
 */
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    apikey: CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Authenticate a single user and return ready-to-use headers.
 * Convenience for simple tests that don't need a pool.
 *
 * @returns {{ headers: object, token: string } | null}
 */
export function quickAuth() {
  const token = authenticateUser(CONFIG.testUserEmail, CONFIG.testUserPassword);
  if (!token) return null;
  return { headers: authHeaders(token), token };
}
