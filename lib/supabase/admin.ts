import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/repositories/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
