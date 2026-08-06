import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} from './env';

/**
 * Service-role client. ONLY for seeding/teardown (admin user management,
 * bypassing RLS to write fixture rows). NEVER use this client to assert
 * retrieval RLS behavior — see `createUserSessionClient` below.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Creates a Supabase client authenticated as a REAL GoTrue-signed-in user
 * via password sign-in (never service-role).
 *
 * RLS FALSE-GREEN GUARD: `query_transactions` and `hybrid_search_transactions`
 * are `security invoker` and filter on `auth.uid()`. A service-role client
 * bypasses RLS entirely and has no session, so `auth.uid()` resolves to
 * NULL and every retrieval RPC call returns empty — for every user, not
 * just the "wrong" one. A cross-user isolation assertion built on a
 * service-role client would pass without proving anything. Only a real
 * signed-in user client exercises the RLS policy under test.
 */
export async function createUserSessionClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `createUserSessionClient: sign-in failed for ${email}: ${error.message}`
    );
  }
  return client;
}
