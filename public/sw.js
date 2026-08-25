// FinTec service worker.
//
// Purpose: make repeat app launches nearly free by serving immutable build
// assets (`/_next/static/**`) from the Cache Storage API. These assets are
// content-hashed by Next.js, so cache-first is always correct and they contain
// no user data.
//
// Explicit non-goals:
// - We never cache navigations (HTML/RSC payloads) or `/api/*` responses:
//   they carry authenticated financial data and must always hit the network.
// - No offline fallback page yet; scope intentionally minimal.
//
// Bump CACHE_VERSION whenever this file changes so old caches are purged.

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `fintec-static-${CACHE_VERSION}`;

self.addEventListener('install', () => {
  // No precache list: hashed static assets are populated at runtime on first
  // use, which avoids install failures on paths that may not exist.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('fintec-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/_next/static/')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      // Content-hashed URLs are immutable; only cache clean responses.
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })()
  );
});
