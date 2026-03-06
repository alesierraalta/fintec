/**
 * FinTec Performance Testing — Authentication Flow
 *
 * Simulates the auth lifecycle:
 * 1. Login (POST token)
 * 2. Fetch profile (GET /api/auth/profile)
 *
 * This flow validates auth latency under load.
 * NOTE: Be mindful of Supabase auth rate limits (60 logins/min on free tier).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, authUrl, apiUrl } from '../lib/config.js';
import { checkNoServerError } from '../lib/checks.js';

/**
 * Execute a full authentication flow.
 * Unlike other flows, this creates its own token instead of using shared headers.
 *
 * @param {string} email
 * @param {string} password
 */
export function authFlow(email, password) {
  // 1. Login via Supabase GoTrue
  const loginRes = http.post(
    authUrl(CONFIG.auth.token),
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.supabaseAnonKey,
      },
      tags: { endpoint: 'auth', operation: 'login' },
    }
  );

  const loginOk = check(loginRes, {
    'auth:login status 200': (r) => r.status === 200,
    'auth:login has token': (r) => {
      try {
        return !!r.json('access_token');
      } catch {
        return false;
      }
    },
  });

  if (!loginOk) {
    console.warn(`[auth-flow] Login failed: ${loginRes.status}`);
    return;
  }

  const token = loginRes.json('access_token');

  sleep(0.3);

  // 2. Fetch user profile with the acquired token
  const profileRes = http.get(apiUrl(CONFIG.api.authProfile), {
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    tags: { endpoint: 'auth', operation: 'profile' },
  });
  checkNoServerError(profileRes, 'auth:profile');

  sleep(0.5);
}
