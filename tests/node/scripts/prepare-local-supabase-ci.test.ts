import { buildLocalSupabaseEnvironment } from '../../../scripts/testing/prepare-local-supabase-ci';
import { getCanonicalTestUserConfig } from '../../support/auth/canonical-user';

describe('buildLocalSupabaseEnvironment', () => {
  const canonicalUser = getCanonicalTestUserConfig();

  const localInput = {
    supabaseUrl: 'http://127.0.0.1:54421',
    supabaseAnonKey: 'local-anon-key',
    supabaseServiceRoleKey: 'local-service-role-key',
    canonicalUser,
  };

  it('maps loopback Supabase and canonical user values for app and k6', () => {
    expect(buildLocalSupabaseEnvironment(localInput)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: localInput.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localInput.supabaseAnonKey,
      SUPABASE_URL: localInput.supabaseUrl,
      SUPABASE_ANON_KEY: localInput.supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: localInput.supabaseServiceRoleKey,
      FINTEC_TEST_USER_EMAIL: canonicalUser.email,
      FINTEC_TEST_USER_PASSWORD: canonicalUser.password,
      TEST_USER_EMAIL: canonicalUser.email,
      TEST_USER_PASSWORD: canonicalUser.password,
    });
  });

  it.each([
    ['remote URL', 'https://example.supabase.co'],
    ['non-loopback URL', 'http://192.0.2.10:54421'],
    ['newline URL', 'http://127.0.0.1:54421\nINJECTED=value'],
    ['newline key', 'local-anon-key\nINJECTED=value'],
  ])('rejects %s', (_label, value) => {
    expect(() =>
      buildLocalSupabaseEnvironment({
        ...localInput,
        ...(value.includes('key')
          ? { supabaseAnonKey: value }
          : { supabaseUrl: value }),
      })
    ).toThrow();
  });
});
