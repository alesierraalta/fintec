import { RateUsabilityPolicy } from '@/lib/rates/rate-usability-policy';

const baseInput = {
  freshness: 'fresh' as const,
  source: 'database' as const,
  fallback: false,
};

describe('RateUsabilityPolicy', () => {
  it('allows fresh non-fallback rates for display and conversion', () => {
    expect(RateUsabilityPolicy.evaluate(baseInput)).toEqual({
      usableForReadDisplay: true,
      usableForConversion: true,
      authoritativeForConversion: true,
      requiresWarning: false,
    });
  });

  it('allows stale rates with warnings', () => {
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, freshness: 'stale-warning' })
    ).toMatchObject({
      usableForReadDisplay: true,
      usableForConversion: true,
      authoritativeForConversion: true,
      requiresWarning: true,
    });
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, freshness: 'incident' })
    ).toMatchObject({
      usableForReadDisplay: true,
      usableForConversion: true,
      authoritativeForConversion: true,
      requiresWarning: true,
    });
  });

  it('blocks hard-failure rates from authoritative conversion', () => {
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, freshness: 'hard-failure' })
    ).toEqual({
      usableForReadDisplay: true,
      usableForConversion: false,
      authoritativeForConversion: false,
      requiresWarning: true,
      reason: 'hard-stale',
    });
  });

  it('blocks fallback and unavailable sources from authoritative conversion', () => {
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, source: 'fallback' })
    ).toMatchObject({
      usableForReadDisplay: true,
      usableForConversion: false,
      authoritativeForConversion: false,
      requiresWarning: true,
      reason: 'static',
    });
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, source: 'unavailable' })
    ).toMatchObject({
      usableForReadDisplay: false,
      usableForConversion: false,
      authoritativeForConversion: false,
      requiresWarning: true,
      reason: 'missing-rate',
    });
    expect(
      RateUsabilityPolicy.evaluate({ ...baseInput, fallback: true })
    ).toMatchObject({
      usableForReadDisplay: true,
      usableForConversion: false,
      authoritativeForConversion: false,
      requiresWarning: true,
      reason: 'static',
    });
  });
});
