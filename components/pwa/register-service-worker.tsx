'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/service-worker';

/**
 * Thin mount point for `registerServiceWorker` (see `lib/pwa/service-worker.ts`
 * for the actual policy — production-only, no-ops inside the Capacitor
 * native shell). Renders no visible UI.
 */
export function RegisterServiceWorker(): null {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
