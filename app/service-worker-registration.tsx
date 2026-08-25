'use client';

import { useEffect } from 'react';

/**
 * Registers the static-asset service worker (`/sw.js`).
 *
 * Production-only: caching hashed build assets in dev would serve stale code.
 * The worker itself only caches `/_next/static/**`; navigations and API calls
 * always hit the network (see public/sw.js).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
