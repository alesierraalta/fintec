import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return user;
}
