import { FreshnessPolicy } from '@/lib/rates/freshness-policy';

const NOW = new Date('2026-05-22T12:00:00.000Z');
const hoursAgo = (hours: number) =>
  new Date(NOW.getTime() - hours * 60 * 60 * 1000);

describe('FreshnessPolicy', () => {
  it('classifies boundary ages with an injected clock', () => {
    expect(
      FreshnessPolicy.evaluate({ timestamp: hoursAgo(24), now: NOW })
    ).toMatchObject({ freshness: 'fresh', ageMinutes: 1440, stale: false });
    expect(
      FreshnessPolicy.evaluate({
        timestamp: new Date(hoursAgo(24).getTime() - 1),
        now: NOW,
      })
    ).toMatchObject({ freshness: 'stale-warning', stale: true });
    expect(
      FreshnessPolicy.evaluate({ timestamp: hoursAgo(48), now: NOW })
    ).toMatchObject({
      freshness: 'stale-warning',
      ageMinutes: 2880,
      stale: true,
    });
    expect(
      FreshnessPolicy.evaluate({
        timestamp: new Date(hoursAgo(48).getTime() - 1),
        now: NOW,
      })
    ).toMatchObject({ freshness: 'incident', stale: true });
    expect(
      FreshnessPolicy.evaluate({ timestamp: hoursAgo(24 * 7), now: NOW })
    ).toMatchObject({ freshness: 'incident', stale: true });
    expect(
      FreshnessPolicy.evaluate({
        timestamp: new Date(hoursAgo(24 * 7).getTime() - 1),
        now: NOW,
      })
    ).toMatchObject({
      freshness: 'hard-failure',
      stale: true,
      fallbackReason: 'hard-stale',
    });
  });

  it('fails safe for missing, invalid, and future timestamps', () => {
    expect(
      FreshnessPolicy.evaluate({ timestamp: null, now: NOW })
    ).toMatchObject({
      freshness: 'hard-failure',
      ageMinutes: null,
      fallbackReason: 'missing-rate',
    });
    expect(
      FreshnessPolicy.evaluate({ timestamp: 'not-a-date', now: NOW })
    ).toMatchObject({
      freshness: 'hard-failure',
      ageMinutes: null,
      fallbackReason: 'invalid-timestamp',
    });
    expect(
      FreshnessPolicy.evaluate({
        timestamp: new Date(NOW.getTime() + 1),
        now: NOW,
      })
    ).toMatchObject({
      freshness: 'hard-failure',
      ageMinutes: null,
      fallbackReason: 'invalid-timestamp',
    });
  });
});
