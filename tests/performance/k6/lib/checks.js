/**
 * FinTec Performance Testing — Shared Check Assertions
 *
 * Reusable check functions for common response validations.
 * Use with k6's `check()` function for consistent assertion patterns.
 */

import { check } from 'k6';

/**
 * Assert that the response is a successful JSON response (2xx).
 */
export function checkSuccess(res, label) {
  return check(res, {
    [`${label}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${label}: has body`]: (r) => r.body && r.body.length > 0,
  });
}

/**
 * Assert that the response is exactly 200 with valid JSON.
 */
export function checkOk(res, label) {
  return check(res, {
    [`${label}: status 200`]: (r) => r.status === 200,
    [`${label}: valid JSON`]: (r) => {
      try {
        r.json();
        return true;
      } catch {
        return false;
      }
    },
  });
}

/**
 * Assert that the response is 201 Created.
 */
export function checkCreated(res, label) {
  return check(res, {
    [`${label}: status 201`]: (r) => r.status === 201,
  });
}

/**
 * Assert a successful response returning an array with items.
 */
export function checkArray(res, label) {
  return check(res, {
    [`${label}: status 200`]: (r) => r.status === 200,
    [`${label}: is array`]: (r) => Array.isArray(r.json()),
    [`${label}: has items`]: (r) => r.json().length > 0,
  });
}

/**
 * Assert that the response matches expected latency bounds.
 * Useful for per-request latency checks beyond threshold aggregates.
 */
export function checkLatency(res, label, maxMs) {
  return check(res, {
    [`${label}: duration < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}

/**
 * Assert that the response is not a rate-limit (429).
 */
export function checkNotRateLimited(res, label) {
  return check(res, {
    [`${label}: not rate limited`]: (r) => r.status !== 429,
  });
}

/**
 * Assert that the response is not a server error (5xx).
 */
export function checkNoServerError(res, label) {
  return check(res, {
    [`${label}: no 5xx`]: (r) => r.status < 500,
  });
}
