import { createClient } from '@/lib/supabase/server';
import { isFrontendAuthBypassEnabled } from '@/lib/auth/is-frontend-auth-bypass-enabled';

/**
 * Determines the auth state for the root page (/).
 * Returns 'authenticated' if a valid session exists or bypass is enabled,
 * otherwise returns 'landing' for the public landing experience.
 */
export async function getRootAuthState(): Promise<'authenticated' | 'landing'> {
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

  // No user and no error — check bypass
  if (isFrontendAuthBypassEnabled()) {
    return 'authenticated';
  }

  return 'landing';
}
