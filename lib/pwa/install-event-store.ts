/**
 * Shared, module-level store for the `beforeinstallprompt` deferred event.
 *
 * `beforeinstallprompt` fires AT MOST ONCE per document load. Every
 * `usePwaInstall()` instance on the page (the interruptive banner AND the
 * settings entry point can both be mounted at once) MUST observe the exact
 * same event and the exact same `canInstall` state — there is only one
 * event to hand out, so there must be exactly one owner of it. A per-hook-
 * instance ref cannot satisfy that: whichever instance's effect runs first
 * would "win" the event and every other instance would see `null` forever.
 *
 * This module is the single owner. It:
 * - adopts whatever an inline `<head>` script (`PWA_INSTALL_CAPTURE_SCRIPT`
 *   below) stashed on `window` before hydration, exactly once, then clears
 *   that `window` key so the module is the only remaining owner;
 * - subscribes directly to `beforeinstallprompt` / `appinstalled` for
 *   events that arrive after adoption;
 * - exposes `subscribe` / snapshot accessors shaped for
 *   `useSyncExternalStore` (see `hooks/use-pwa-install.ts`).
 *
 * No React import here on purpose: this module is imported by both the
 * root layout (to emit the capture script string) and the hook (to read
 * and subscribe to the store), and must stay usable as a plain `<script>`
 * source with no framework dependency.
 */

export const PWA_INSTALL_EVENT_WINDOW_KEY = '__fintecDeferredInstallPrompt';
export const PWA_INSTALL_APP_INSTALLED_WINDOW_KEY = '__fintecAppInstalled';

export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type WindowWithPwaInstallStash = Window & {
  [PWA_INSTALL_EVENT_WINDOW_KEY]?: DeferredInstallPromptEvent | null;
  [PWA_INSTALL_APP_INSTALLED_WINDOW_KEY]?: boolean;
};

let deferredEvent: DeferredInstallPromptEvent | null = null;
let isAppInstalled = false;
let hasAdoptedWindowStash = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function handleLiveInstallEvent(event: Event): void {
  event.preventDefault();
  deferredEvent = event as DeferredInstallPromptEvent;
  notify();
}

function handleLiveAppInstalled(): void {
  isAppInstalled = true;
  deferredEvent = null;
  notify();
}

/**
 * Adopts the pre-hydration `window` stash into this module exactly once,
 * and starts listening for events that arrive afterwards. Idempotent and
 * cheap to call from every accessor below, so no consumer has to remember
 * to "initialise" the store first.
 */
function adoptWindowStashOnce(): void {
  if (hasAdoptedWindowStash || typeof window === 'undefined') {
    return;
  }
  hasAdoptedWindowStash = true;

  const win = window as WindowWithPwaInstallStash;

  if (win[PWA_INSTALL_EVENT_WINDOW_KEY]) {
    deferredEvent = win[PWA_INSTALL_EVENT_WINDOW_KEY] ?? null;
  }
  // The window key is now fully owned by this module — clear it so nothing
  // else can read a second, stale reference to the same event.
  win[PWA_INSTALL_EVENT_WINDOW_KEY] = null;

  if (win[PWA_INSTALL_APP_INSTALLED_WINDOW_KEY]) {
    isAppInstalled = true;
    deferredEvent = null;
  }

  window.addEventListener('beforeinstallprompt', handleLiveInstallEvent);
  window.addEventListener('appinstalled', handleLiveAppInstalled);
}

/** Reads the current deferred event without clearing it. */
export function getDeferredInstallEvent(): DeferredInstallPromptEvent | null {
  adoptWindowStashOnce();
  return deferredEvent;
}

/** Reads the current "app installed" flag without clearing it. */
export function getIsAppInstalled(): boolean {
  adoptWindowStashOnce();
  return isAppInstalled;
}

/** `useSyncExternalStore`-shaped: always returns `null` during SSR. */
export function getServerDeferredInstallEvent(): null {
  return null;
}

/** `useSyncExternalStore`-shaped: always returns `false` during SSR. */
export function getServerIsAppInstalled(): boolean {
  return false;
}

/**
 * Subscribes to changes in the deferred event or the installed flag.
 * Framework-agnostic on purpose so `useSyncExternalStore` can use it
 * directly as its `subscribe` argument.
 */
export function subscribe(listener: () => void): () => void {
  adoptWindowStashOnce();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Clears the retained deferred event and notifies every subscriber, so
 * every consumer's `canInstall` flips to `false` together. Called by the
 * hook once `promptInstall()` reaches a terminal outcome (accepted,
 * dismissed, or a rejected `prompt()` call) — the browser only allows a
 * captured event to be prompted once, so there is nothing left to retain
 * either way.
 */
export function clearDeferredInstallEvent(): void {
  if (deferredEvent === null) {
    return;
  }
  deferredEvent = null;
  notify();
}

/**
 * Source for the inline `<script>` emitted in `<head>` via a raw `<script>`
 * tag (see `app/layout.tsx`) so it runs and is parsed before hydration.
 * Kept tiny and dependency-free — it only stashes state for this module to
 * adopt later; all decision-making stays in TypeScript.
 */
export const PWA_INSTALL_CAPTURE_SCRIPT = `(function () {
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window['${PWA_INSTALL_EVENT_WINDOW_KEY}'] = event;
  });
  window.addEventListener('appinstalled', function () {
    window['${PWA_INSTALL_APP_INSTALLED_WINDOW_KEY}'] = true;
    window['${PWA_INSTALL_EVENT_WINDOW_KEY}'] = null;
  });
})();`;

/**
 * Test-only reset. Module-level state otherwise leaks across test cases
 * within the same Jest module (Jest does not reload modules between `it()`
 * blocks in one file). Not used by any production code path.
 */
export function __resetInstallEventStoreForTests(): void {
  if (typeof window !== 'undefined' && hasAdoptedWindowStash) {
    window.removeEventListener('beforeinstallprompt', handleLiveInstallEvent);
    window.removeEventListener('appinstalled', handleLiveAppInstalled);
  }
  deferredEvent = null;
  isAppInstalled = false;
  hasAdoptedWindowStash = false;
  listeners.clear();
}
