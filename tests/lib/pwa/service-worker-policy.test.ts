import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * `public/sw.js` is a classic (non-module) worker script, loaded via
 * `navigator.serviceWorker.register('/sw.js')`, never bundled or imported
 * anywhere. There is no build step that turns it into a Jest-importable
 * ES/CommonJS module, and adding one would mean adopting a bundler step
 * this change deliberately avoided (see design.md, "own layer, zero new
 * dependencies").
 *
 * Instead of duplicating the routing logic into a separate module that
 * could silently drift from the real worker, this test loads the EXACT
 * production file into a minimal sandboxed `vm` context (a stubbed `self`
 * that only exposes `addEventListener`) and pulls out the pure routing
 * function the file assigns to `self.__pwaRoutingPolicy` purely for this
 * purpose. This exercises the real production source, not a re-implemented
 * copy of it.
 */
const SW_SOURCE = readFileSync(
  path.join(process.cwd(), 'public/sw.js'),
  'utf-8'
);

const ORIGIN = 'https://fintec.example';

function loadServiceWorkerSandbox() {
  const calls: string[] = [];
  const listeners: Record<string, (event: unknown) => void> = {};

  const sandbox: any = {
    self: {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners[type] = handler;
      },
      skipWaiting: () => {
        calls.push('skipWaiting');
      },
      clients: {
        claim: async () => {
          calls.push('clients.claim');
        },
      },
      location: { origin: ORIGIN },
    },
    caches: {
      keys: async () => {
        calls.push('caches.keys');
        return [];
      },
      open: async () => ({
        match: async () => undefined,
        put: async () => {},
      }),
    },
    URL,
  };

  vm.createContext(sandbox);
  vm.runInContext(SW_SOURCE, sandbox, { filename: 'sw.js' });

  return { sandbox, calls, listeners };
}

describe('service worker install ordering', () => {
  it('calls skipWaiting synchronously as the first statement of install, before any async work', () => {
    const { calls, listeners } = loadServiceWorkerSandbox();

    listeners.install({});

    // A previous version awaited `cache.addAll()` (which always rejected)
    // before calling skipWaiting() inside a `.then()`, so it never ran.
    // skipWaiting() must be the very first thing that happens, with no
    // async work ahead of it.
    expect(calls).toEqual(['skipWaiting']);
  });
});

describe('service worker fetch routing policy', () => {
  const { sandbox } = loadServiceWorkerSandbox();
  const isCacheableStaticAssetRequest: (
    method: string,
    mode: string | undefined,
    url: string,
    origin: string
  ) => boolean = sandbox.self.__pwaRoutingPolicy;

  it('never handles non-GET requests', () => {
    expect(
      isCacheableStaticAssetRequest(
        'POST',
        undefined,
        `${ORIGIN}/_next/static/chunk.js`,
        ORIGIN
      )
    ).toBe(false);
  });

  it('never handles cross-origin requests', () => {
    expect(
      isCacheableStaticAssetRequest(
        'GET',
        undefined,
        'https://evil.example/_next/static/chunk.js',
        ORIGIN
      )
    ).toBe(false);
  });

  it('never handles /api/ requests, even if a GET', () => {
    expect(
      isCacheableStaticAssetRequest(
        'GET',
        undefined,
        `${ORIGIN}/api/transactions`,
        ORIGIN
      )
    ).toBe(false);
  });

  it('never handles navigation requests, even for a same-origin, /_next/static/-shaped path', () => {
    expect(
      isCacheableStaticAssetRequest(
        'GET',
        'navigate',
        `${ORIGIN}/_next/static/chunk.js`,
        ORIGIN
      )
    ).toBe(false);
  });

  it('handles GET requests under /_next/static/', () => {
    expect(
      isCacheableStaticAssetRequest(
        'GET',
        'no-cors',
        `${ORIGIN}/_next/static/css/app.css`,
        ORIGIN
      )
    ).toBe(true);
  });

  it('does not handle same-origin GET requests outside /_next/static/', () => {
    expect(
      isCacheableStaticAssetRequest(
        'GET',
        'no-cors',
        `${ORIGIN}/favicon.ico`,
        ORIGIN
      )
    ).toBe(false);
  });
});

describe('service worker cache eviction policy (M1: bounded cache)', () => {
  function fakeCache(requestUrls: string[]) {
    const store = new Map(requestUrls.map((url) => [url, url]));
    return {
      keys: async () => Array.from(store.keys()).map((url) => ({ url })),
      delete: async (request: { url: string }) => {
        store.delete(request.url);
      },
      _store: store,
    };
  }

  it('exposes a numeric MAX_CACHE_ENTRIES cap', () => {
    const { sandbox } = loadServiceWorkerSandbox();
    expect(typeof sandbox.self.__pwaCachePolicy.MAX_CACHE_ENTRIES).toBe(
      'number'
    );
    expect(sandbox.self.__pwaCachePolicy.MAX_CACHE_ENTRIES).toBeGreaterThan(0);
  });

  it('does nothing when the cache is under the cap', async () => {
    const { sandbox } = loadServiceWorkerSandbox();
    const { MAX_CACHE_ENTRIES, evictOldestEntriesOverCap } =
      sandbox.self.__pwaCachePolicy;
    const urls = Array.from(
      { length: MAX_CACHE_ENTRIES - 1 },
      (_, i) => `${ORIGIN}/_next/static/chunk-${i}.js`
    );
    const cache = fakeCache(urls);

    await evictOldestEntriesOverCap(cache);

    expect(cache._store.size).toBe(urls.length);
  });

  it('evicts the oldest entries first, down to exactly the cap', async () => {
    const { sandbox } = loadServiceWorkerSandbox();
    const { MAX_CACHE_ENTRIES, evictOldestEntriesOverCap } =
      sandbox.self.__pwaCachePolicy;
    const urls = Array.from(
      { length: MAX_CACHE_ENTRIES + 10 },
      (_, i) => `${ORIGIN}/_next/static/chunk-${i}.js`
    );
    const cache = fakeCache(urls);

    await evictOldestEntriesOverCap(cache);

    expect(cache._store.size).toBe(MAX_CACHE_ENTRIES);
    // The oldest (lowest-index) entries are the ones evicted; the most
    // recently written entries survive.
    expect(cache._store.has(urls[0])).toBe(false);
    expect(cache._store.has(urls[9])).toBe(false);
    expect(cache._store.has(urls[urls.length - 1])).toBe(true);
  });
});
