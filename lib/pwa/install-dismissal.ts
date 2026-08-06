/**
 * Dismissal policy for the install prompt: storage key, persistence, and
 * the cooldown predicate. Kept as one module so the policy has a single
 * owner instead of being split between the hook and the platform module.
 */

import { readPersistedNumber, writePersistedNumber } from './persisted-number';

const DISMISSAL_STORAGE_KEY = 'fintec.pwa-install.dismissed-at';

/** Cooldown window applied after a user dismissal: 30 days. */
export const DISMISSAL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Pure. Returns true while the dismissal is still within the cooldown window. */
export function isDismissalActive(
  dismissedAt: number | null,
  now: number
): boolean {
  if (dismissedAt === null) {
    return false;
  }

  return now - dismissedAt < DISMISSAL_COOLDOWN_MS;
}

/** Reads the persisted dismissal timestamp. Corrupt/missing values yield `null`. */
export function readDismissal(): number | null {
  return readPersistedNumber(DISMISSAL_STORAGE_KEY);
}

/** Persists the dismissal timestamp. Silently no-ops when storage is unavailable. */
export function recordDismissal(now: number): void {
  writePersistedNumber(DISMISSAL_STORAGE_KEY, now);
}
