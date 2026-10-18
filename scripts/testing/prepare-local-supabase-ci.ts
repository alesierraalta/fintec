import { appendFile } from 'node:fs/promises';

import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '../../tests/db/support/env';
import {
  getCanonicalTestUserConfig,
  type CanonicalTestUserConfig,
} from '../../tests/support/auth/canonical-user';

export interface LocalSupabaseEnvironmentInput {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  canonicalUser: Pick<CanonicalTestUserConfig, 'email' | 'password'>;
}

export type LocalSupabaseEnvironment = Record<string, string>;

function requireSafeValue(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be non-empty.`);
  }

  if (/[\r\n]/.test(value)) {
    throw new Error(`${name} must not contain newline characters.`);
  }

  return value.trim();
}

function requireLoopbackHttpUrl(value: string | undefined): string {
  const url = requireSafeValue('Supabase URL', value);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Supabase URL must be a valid HTTP loopback URL.');
  }

  if (
    parsedUrl.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(parsedUrl.hostname.toLowerCase()) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      'Supabase URL must use HTTP and resolve to 127.0.0.1 or localhost.'
    );
  }

  return url;
}

export function buildLocalSupabaseEnvironment({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  canonicalUser,
}: LocalSupabaseEnvironmentInput): LocalSupabaseEnvironment {
  const localUrl = requireLoopbackHttpUrl(supabaseUrl);
  const localAnonKey = requireSafeValue('Supabase anon key', supabaseAnonKey);
  const localServiceRoleKey = requireSafeValue(
    'Supabase service-role key',
    supabaseServiceRoleKey
  );
  const email = requireSafeValue(
    'Canonical test-user email',
    canonicalUser.email
  );
  const password = requireSafeValue(
    'Canonical test-user password',
    canonicalUser.password
  );

  return {
    NEXT_PUBLIC_SUPABASE_URL: localUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: localAnonKey,
    SUPABASE_URL: localUrl,
    SUPABASE_ANON_KEY: localAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: localServiceRoleKey,
    FINTEC_TEST_USER_EMAIL: email,
    FINTEC_TEST_USER_PASSWORD: password,
    TEST_USER_EMAIL: email,
    TEST_USER_PASSWORD: password,
  };
}

async function writeGithubEnvironment(
  githubEnvPath: string,
  environment: LocalSupabaseEnvironment
): Promise<void> {
  const lines = Object.entries(environment)
    .map(([name, value]) => `${name}=${value}`)
    .join('\n');

  await appendFile(githubEnvPath, `${lines}\n`, 'utf8');
}

export async function prepareLocalSupabaseCiEnvironment(options?: {
  provisionCanonicalAuthUser?: boolean;
  githubEnvPath?: string;
}): Promise<void> {
  const githubEnvPath = requireSafeValue(
    'GITHUB_ENV',
    options?.githubEnvPath ?? process.env.GITHUB_ENV
  );
  const environment = buildLocalSupabaseEnvironment({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    canonicalUser: getCanonicalTestUserConfig(),
  });

  Object.assign(process.env, environment);
  await writeGithubEnvironment(githubEnvPath, environment);

  if (options?.provisionCanonicalAuthUser) {
    const { ensureCanonicalAuthUser } =
      await import('../../tests/support/auth/ensure-canonical-auth-user');
    const result = await ensureCanonicalAuthUser();
    console.log({
      created: result.created === true,
      repaired: result.repaired === true,
    });
  }
}

if (process.argv[1]?.endsWith('scripts/testing/prepare-local-supabase-ci.ts')) {
  const provisionCanonicalAuthUser = process.argv
    .slice(2)
    .includes('--provision-canonical-auth-user');

  prepareLocalSupabaseCiEnvironment({ provisionCanonicalAuthUser }).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Local Supabase CI preparation failed: ${message}`);
      process.exitCode = 1;
    }
  );
}
