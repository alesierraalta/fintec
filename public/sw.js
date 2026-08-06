// FinTec Service Worker
//
// This worker exists ONLY to satisfy Chrome's installability requirement:
// an active service worker with a `fetch` handler is a hard precondition
// for the browser to fire `beforeinstallprompt`
// (see `hooks/use-pwa-install.ts`, `lib/pwa/install-event-store.ts`).
//
// The offline caching strategy (a precache manifest, an offline fallback
// route, per-user cache partitioning, cache invalidation on logout) is
// DELIBERATELY OUT OF SCOPE here and is tracked as separate follow-up
// work — see openspec/changes/pwa-install-prompt/design.md, section
// "Descoped: Offline Caching Strategy".
//
// NEVER cache authenticated responses in this file (`/api/*`, or any
// navigation response). Those are per-user, server-rendered, and sent
// with `Cache-Control: private, no-store`; caching them in a shared,
// origin-scoped Cache Storage bucket that nothing clears on logout would
// serve one user's financial data to the next user of a shared device.

// Bump this to invalidate every previously installed cache — `activate`
// deletes any cache whose name does not match this exact string.
const CACHE_NAME = 'fintec-shell-v1';

// Hard cap on the number of entries this worker keeps in CACHE_NAME.
// Cached entries are `/_next/static/` assets: content-hashed and
// immutable, so a TTL adds no value — a URL either matches the current
// build (still useful) or a previous one (now dead weight). Next.js emits
// a unique path per build (measured: 112 files / ~4.5MB for one build of
// this app), and nothing removes a previous build's entries on its own,
// so an unbounded cache grows by a full build's worth of assets on every
// deploy a visitor happens to load. 200 entries comfortably covers several
// recent builds of this app's static output while keeping a hard ceiling
// on how much of the shared, best-effort origin storage bucket this
// worker can claim (see requestPersistentStorage in
// lib/pwa/service-worker.ts for why that bucket must stay small — the
// financial ledger's IndexedDB database lives in the same bucket).
const MAX_CACHE_ENTRIES = 200;

self.addEventListener('install', () => {
  // MUST be the first statement of this handler, unconditionally, ahead
  // of any async work. A previous version of this file awaited
  // `cache.addAll()` before calling `skipWaiting()` inside a `.then()`;
  // because that `addAll()` always rejected (it referenced a
  // non-existent `/offline` route and 404ing directory prefixes),
  // `skipWaiting()` never ran, and a corrected worker would park in
  // `waiting` behind the broken one indefinitely for every already-open
  // client. Never repeat that mistake.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })()
  );
});

/**
 * Pure routing decision: should this request be served cache-first from
 * `CACHE_NAME`? Kept as a standalone function of primitives (no `self`,
 * `caches`, or `fetch` references) so it can be unit tested in a sandboxed
 * `vm` context without a real ServiceWorkerGlobalScope — see
 * tests/lib/pwa/service-worker-policy.test.ts.
 */
function isCacheableStaticAssetRequest(method, mode, requestUrl, originOrigin) {
  // Only GET is cacheable; every other method (POST/PUT/PATCH/DELETE)
  // must reach the network untouched.
  if (method !== 'GET') {
    return false;
  }

  const parsed = new URL(requestUrl, originOrigin);

  // Cross-origin requests are never this worker's concern.
  if (parsed.origin !== originOrigin) {
    return false;
  }

  // NEVER cache authenticated API responses.
  if (parsed.pathname.startsWith('/api/')) {
    return false;
  }

  // Navigation responses are server-rendered, per-user pages gated by
  // server-side auth checks; they must always hit the network so that
  // auth gate actually runs.
  if (mode === 'navigate') {
    return false;
  }

  // Only immutable, content-hashed static assets are safe to serve
  // cache-first.
  return parsed.pathname.startsWith('/_next/static/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (
    !isCacheableStaticAssetRequest(
      request.method,
      request.mode,
      request.url,
      self.location.origin
    )
  ) {
    // No `respondWith` call at all: the browser handles the request
    // exactly as if this worker did not exist for every guarded case
    // above (non-GET, cross-origin, /api/, navigation).
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const networkResponse = await fetch(request);
      // Never cache a non-ok response, and never return it as if it were
      // the cached asset — fall through to the real network response.
      if (networkResponse.ok) {
        // `cache.put()` rejects when the response is the result of a
        // redirect; awaited and caught here so that rejection never
        // becomes a benign-but-unhandled promise rejection inside the
        // worker. A failed write is not fatal — the asset is simply not
        // cached this time and is fetched from the network again next
        // time.
        try {
          await cache.put(request, networkResponse.clone());
          await evictOldestEntriesOverCap(cache);
        } catch {
          // See above: never let a cache write failure surface as an
          // unhandled rejection or block returning the real response.
        }
      }
      return networkResponse;
    })()
  );
});

/**
 * Evicts the oldest entries in `cache` until it holds at most
 * `MAX_CACHE_ENTRIES`. `Cache#keys()` returns entries in insertion order,
 * so the front of the array is the oldest write — no separate
 * last-accessed bookkeeping is needed for a cache that is entirely
 * content-hashed, immutable assets.
 */
async function evictOldestEntriesOverCap(cache) {
  const requests = await cache.keys();
  const overflow = requests.length - MAX_CACHE_ENTRIES;
  if (overflow <= 0) {
    return;
  }

  await Promise.all(
    requests.slice(0, overflow).map((request) => cache.delete(request))
  );
}

// Exposed ONLY so tests/lib/pwa/service-worker-policy.test.ts can load
// this exact file into a sandboxed `vm` context and exercise the real
// production routing and cache-eviction decisions — never referenced by
// the worker itself beyond the internal calls above.
self.__pwaRoutingPolicy = isCacheableStaticAssetRequest;
self.__pwaCachePolicy = { MAX_CACHE_ENTRIES, evictOldestEntriesOverCap };
