import {
  CANONICAL_AUTH_REQUIRED_LANE,
  CANONICAL_TEST_USER_DEFAULTS,
  CANONICAL_TEST_USER_ENV_KEYS,
  getCanonicalTestUserConfig,
} from '@/tests/support/auth/canonical-user';

describe('getCanonicalTestUserConfig', () => {
  it('returns the shared defaults, labels, and lane metadata', () => {
    const config = getCanonicalTestUserConfig({ env: {} });

    expect(config.email).toBe(CANONICAL_TEST_USER_DEFAULTS.email);
    expect(config.password).toBe(CANONICAL_TEST_USER_DEFAULTS.password);
    expect(config.displayName).toBe(CANONICAL_TEST_USER_DEFAULTS.displayName);
    expect(config.baseCurrency).toBe(CANONICAL_TEST_USER_DEFAULTS.baseCurrency);
    expect(config.authRequiredLane).toBe(CANONICAL_AUTH_REQUIRED_LANE);
    expect(config.displayLabels).toEqual([
      CANONICAL_TEST_USER_DEFAULTS.displayName,
      'Dashboard',
    ]);
  });

  it('prefers canonical env names over legacy aliases', () => {
    const config = getCanonicalTestUserConfig({
      env: {
        [CANONICAL_TEST_USER_ENV_KEYS.email.primary]: 'primary@fintec.test',
        [CANONICAL_TEST_USER_ENV_KEYS.email.legacy[0]]: 'legacy@fintec.test',
        [CANONICAL_TEST_USER_ENV_KEYS.password.primary]: 'super-secret',
        [CANONICAL_TEST_USER_ENV_KEYS.displayName.primary]: 'Primary User',
        [CANONICAL_TEST_USER_ENV_KEYS.baseCurrency.primary]: 'VES',
      },
    });

    expect(config.email).toBe('primary@fintec.test');
    expect(config.password).toBe('super-secret');
    expect(config.displayName).toBe('Primary User');
    expect(config.baseCurrency).toBe('VES');
    expect(config.displayLabels).toEqual(['Primary User', 'Dashboard']);
  });

  it('rejects production environments by default', () => {
    expect(() =>
      getCanonicalTestUserConfig({
        env: {
          NODE_ENV: 'production',
        },
      })
    ).toThrow(
      'Canonical testing user helpers are disabled when NODE_ENV=production.'
    );
  });

  it('fails when defaults are disabled and credentials are incomplete', () => {
    expect(() =>
      getCanonicalTestUserConfig({
        env: {
          [CANONICAL_TEST_USER_ENV_KEYS.email.primary]: 'primary@fintec.test',
        },
        allowDefaultCredentials: false,
      })
    ).toThrow(
      `Missing canonical testing user value for ${CANONICAL_TEST_USER_ENV_KEYS.password.primary}.`
    );
  });
});
