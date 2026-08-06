/**
 * Service worker registration policy. Pure enough to unit test without
 * React: `components/pwa/register-service-worker.tsx` is a thin
 * `useEffect` wrapper around this function only.
 */

import { isNativeShell } from './environment';

/**
 * Registers `/sw.js` on the current page.
 *
 * Production-only: a service worker in development caches assets and
 * produces confusing stale-bundle behaviour during local work. Also
 * no-ops inside the Capacitor native shell, since the native app ships
 * its own lifecycle and must never register a web service worker.
 */
export async function registerServiceWorker(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (isNativeShell()) {
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Registration failures must never throw into the React tree or
    // block rendering; the app remains fully usable without a worker.
  }

  await requestPersistentStorage();
}

/**
 * Best-effort request that the browser NOT evict this origin's storage
 * bucket under normal pressure. `repositories/local/db.ts` keeps the
 * Dexie `FinanceDB` (transactions, accounts, budgets, goals) in that same
 * origin-scoped bucket as this worker's Cache Storage entries; without
 * `persist()`, Chrome may evict the WHOLE bucket as a unit under storage
 * pressure, taking the financial ledger down with the cache. The browser
 * may silently decline (it is a request, not a guarantee), and older
 * browsers do not expose the API at all — both are treated as a no-op,
 * never a thrown error.
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      return;
    }

    await navigator.storage.persist();
  } catch {
    // Never throw: this is a best-effort hint, not a requirement.
  }
}
