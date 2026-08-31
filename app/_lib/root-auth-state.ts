import { createClient } from '@/lib/supabase/server';
import { isFrontendAuthBypassEnabled } from '@/lib/auth/is-frontend-auth-bypass-enabled';

/**
 * Determines the auth state for the root page (/).
 * Returns 'authenticated' if a valid session exists or bypass is enabled,
 * otherwise returns 'landing' for the public landing experience.
 */
export async function getRootAuthState(): Promise<'authenticated' | 'landing'> {
  // The helper hard-blocks this flag in production. In non-production test
  // lanes, short-circuit before Supabase reports the expected missing session.
  if (isFrontendAuthBypassEnabled()) {
    return 'authenticated';
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    return 'authenticated';
  }

  if (error) {
    return 'landing';
  }

  return 'landing';
}
