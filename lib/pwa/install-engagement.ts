/**
 * iOS engagement gate: storage key, threshold, visit tracking, and the
 * eligibility predicate. Single owner, mirroring `install-dismissal.ts` —
 * this policy previously lived split across `hooks/use-pwa-install.ts`.
 *
 * iOS never fires `beforeinstallprompt`, so there is no browser signal to
 * gate on. Instead the instructions sheet only becomes eligible starting
 * on the visitor's SECOND page load: showing install instructions on the
 * very first paint, before the visitor has decided the app is useful, is
 * poor UX and inflates dismiss rates. A visit counter in `localStorage` is
 * enough to express that without pulling in an analytics library for one
 * gate.
 */

import { readPersistedNumber, writePersistedNumber } from './persisted-number';

const VISIT_COUNT_STORAGE_KEY = 'fintec.pwa-install.visit-count';

/** Visits (page loads) required before the iOS instructions sheet is eligible. */
export const IOS_ENGAGEMENT_VISIT_THRESHOLD = 2;

/**
 * Module-scope guard against double-counting a visit within one real
 * document load. A `useRef` cannot do this: two separate `usePwaInstall()`
 * instances mounted at once (the banner AND the settings entry point) each
 * get their own ref, so each would record its own visit and the same page
 * load would count as two. A module-level flag is shared by every hook
 * instance and resets naturally on a real new document load (a fresh JS
 * module evaluation), which is exactly the "once per page load" semantic
 * this gate needs.
 */
let hasRecordedVisitThisLoad = false;

/** Reads the persisted visit count. Corrupt/missing values yield `0`. */
export function readVisitCount(): number {
  const value = readPersistedNumber(VISIT_COUNT_STORAGE_KEY);
  return value !== null && value > 0 ? value : 0;
}

/**
 * Increments and persists the visit counter at most once per document
 * load, returning the resulting count (whether or not this call actually
 * incremented it).
 */
export function recordVisitOncePerLoad(): number {
  const current = readVisitCount();

  if (hasRecordedVisitThisLoad) {
    return current;
  }
  hasRecordedVisitThisLoad = true;

  const next = current + 1;
  writePersistedNumber(VISIT_COUNT_STORAGE_KEY, next);
  return next;
}

/** Pure. True once the visit count has reached the engagement threshold. */
export function isIosPromptEligible(visitCount: number): boolean {
  return visitCount >= IOS_ENGAGEMENT_VISIT_THRESHOLD;
}

/**
 * Test-only reset for the module-scope "once per load" guard. Not used by
 * any production code path.
 */
export function __resetInstallEngagementForTests(): void {
  hasRecordedVisitThisLoad = false;
}
