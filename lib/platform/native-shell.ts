/**
 * Single source of truth for "is this running inside the Capacitor native
 * shell (Android/iOS app wrapper)". Lives outside `lib/pwa/` so both
 * `lib/pwa/environment.ts` and `lib/auth/capacitor-oauth.ts` can depend on
 * it without creating a `lib/auth -> lib/pwa` dependency (auth is not a PWA
 * concern) or a `lib/pwa -> lib/auth` one (PWA has no business importing
 * auth internals either). Every other production call site that needs this
 * check MUST import it from here, not probe `Capacitor.isNativePlatform()`
 * directly.
 */

import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor native shell (Android/iOS app wrapper). */
export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}
