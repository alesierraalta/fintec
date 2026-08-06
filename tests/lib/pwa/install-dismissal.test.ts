import {
  isDismissalActive,
  readDismissal,
  recordDismissal,
  DISMISSAL_COOLDOWN_MS,
} from '@/lib/pwa/install-dismissal';

const DISMISSAL_KEY = 'fintec.pwa-install.dismissed-at';

describe('isDismissalActive', () => {
  const now = 1_700_000_000_000;

  it('returns false when there is no dismissal', () => {
    expect(isDismissalActive(null, now)).toBe(false);
  });

  it('returns true just inside the 30-day cooldown', () => {
    const dismissedAt = now - (DISMISSAL_COOLDOWN_MS - 1);
    expect(isDismissalActive(dismissedAt, now)).toBe(true);
  });

  it('returns false exactly at the 30-day boundary', () => {
    const dismissedAt = now - DISMISSAL_COOLDOWN_MS;
    expect(isDismissalActive(dismissedAt, now)).toBe(false);
  });

  it('returns false once the cooldown has elapsed', () => {
    const dismissedAt = now - (DISMISSAL_COOLDOWN_MS + 1);
    expect(isDismissalActive(dismissedAt, now)).toBe(false);
  });
});

describe('readDismissal / recordDismissal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing was ever recorded', () => {
    expect(readDismissal()).toBeNull();
  });

  it('round-trips a recorded timestamp', () => {
    recordDismissal(1_700_000_000_000);
    expect(readDismissal()).toBe(1_700_000_000_000);
  });

  it('treats a corrupt persisted value as null and does not throw', () => {
    window.localStorage.setItem(DISMISSAL_KEY, 'not-a-timestamp');

    expect(() => {
      expect(readDismissal()).toBeNull();
    }).not.toThrow();
  });
});
