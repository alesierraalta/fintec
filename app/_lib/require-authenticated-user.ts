import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { isFrontendAuthBypassEnabled } from '@/lib/auth/is-frontend-auth-bypass-enabled';
import { createClient } from '@/lib/supabase/server';

const FRONTEND_AUTH_BYPASS_USER = {
  id: 'frontend-auth-bypass-user',
} as User;

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (isFrontendAuthBypassEnabled()) {
      return FRONTEND_AUTH_BYPASS_USER;
    }

    redirect('/auth/login');
  }

  return user;
}
