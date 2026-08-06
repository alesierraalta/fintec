/**
 * Shared `try/catch` + `Number.isFinite` numeric `localStorage` read, used
 * by both `install-dismissal.ts` (a timestamp) and `install-engagement.ts`
 * (a visit count) so the same corrupt-value / unavailable-storage handling
 * is not duplicated across the two policy modules.
 */

/**
 * Reads a numeric value stored under `key`. Returns `null` when the value
 * is missing, unparsable, or storage itself is unavailable (private mode,
 * quota exceeded, etc.) — never throws. Callers decide their own default
 * for the `null` case (a timestamp's "never" is different from a visit
 * counter's "zero").
 */
export function readPersistedNumber(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists a numeric value under `key`. Silently no-ops when storage is unavailable. */
export function writePersistedNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode, quota, etc.) — the caller's policy
    // simply won't persist across reloads; callers decide if that matters.
  }
}
