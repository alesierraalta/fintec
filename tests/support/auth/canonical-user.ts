export const CANONICAL_AUTH_REQUIRED_LANE = 'auth-required';

export const CANONICAL_TEST_USER_ENV_KEYS = {
  email: {
    primary: 'FINTEC_TEST_USER_EMAIL',
    legacy: ['E2E_CANONICAL_USER_EMAIL', 'TEST_USER_EMAIL'],
  },
  password: {
    primary: 'FINTEC_TEST_USER_PASSWORD',
    legacy: ['E2E_CANONICAL_USER_PASSWORD', 'TEST_USER_PASSWORD'],
  },
  displayName: {
    primary: 'FINTEC_TEST_USER_NAME',
    legacy: ['E2E_CANONICAL_USER_NAME', 'TEST_USER_NAME'],
  },
  baseCurrency: {
    primary: 'FINTEC_TEST_USER_BASE_CURRENCY',
    legacy: ['E2E_CANONICAL_USER_BASE_CURRENCY', 'TEST_USER_BASE_CURRENCY'],
  },
} as const;

export const CANONICAL_TEST_USER_DEFAULTS = {
  email: 'test@fintec.com',
  password: 'Test123!',
  displayName: 'Test User',
  baseCurrency: 'USD',
} as const;

export interface CanonicalTestUserConfig {
  email: string;
  password: string;
  displayName: string;
  baseCurrency: string;
  authRequiredLane: typeof CANONICAL_AUTH_REQUIRED_LANE;
  displayLabels: string[];
}

interface GetCanonicalTestUserConfigOptions {
  env?: Record<string, string | undefined>;
  allowDefaultCredentials?: boolean;
  allowProduction?: boolean;
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readFirstDefinedEnvValue(
  env: Record<string, string | undefined>,
  primary: string,
  legacy: readonly string[]
): string | undefined {
  const orderedKeys = [primary, ...legacy];

  for (const key of orderedKeys) {
    const value = normalizeEnvValue(env[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function resolveCanonicalValue(
  env: Record<string, string | undefined>,
  keys: { primary: string; legacy: readonly string[] },
  fallback: string,
  allowDefaultCredentials: boolean
): string {
  const explicitValue = readFirstDefinedEnvValue(
    env,
    keys.primary,
    keys.legacy
  );

  if (explicitValue) {
    return explicitValue;
  }

  if (allowDefaultCredentials) {
    return fallback;
  }

  throw new Error(`Missing canonical testing user value for ${keys.primary}.`);
}

export function getCanonicalTestUserConfig(
  options: GetCanonicalTestUserConfigOptions = {}
): CanonicalTestUserConfig {
  const env = options.env ?? process.env;
  const allowDefaultCredentials = options.allowDefaultCredentials ?? true;
  const allowProduction = options.allowProduction ?? false;
  const nodeEnv = normalizeEnvValue(env.NODE_ENV)?.toLowerCase();

  if (!allowProduction && nodeEnv === 'production') {
    throw new Error(
      'Canonical testing user helpers are disabled when NODE_ENV=production.'
    );
  }

  const email = resolveCanonicalValue(
    env,
    CANONICAL_TEST_USER_ENV_KEYS.email,
    CANONICAL_TEST_USER_DEFAULTS.email,
    allowDefaultCredentials
  );
  const password = resolveCanonicalValue(
    env,
    CANONICAL_TEST_USER_ENV_KEYS.password,
    CANONICAL_TEST_USER_DEFAULTS.password,
    allowDefaultCredentials
  );
  const displayName = resolveCanonicalValue(
    env,
    CANONICAL_TEST_USER_ENV_KEYS.displayName,
    CANONICAL_TEST_USER_DEFAULTS.displayName,
    true
  );
  const baseCurrency = resolveCanonicalValue(
    env,
    CANONICAL_TEST_USER_ENV_KEYS.baseCurrency,
    CANONICAL_TEST_USER_DEFAULTS.baseCurrency,
    true
  );

  return {
    email,
    password,
    displayName,
    baseCurrency,
    authRequiredLane: CANONICAL_AUTH_REQUIRED_LANE,
    displayLabels: [displayName, 'Dashboard'],
  };
}
