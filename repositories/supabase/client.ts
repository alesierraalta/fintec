// Supabase client configuration and initialization
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lssnujnctuchowgrspvk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzc251am5jdHVjaG93Z3JzcHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjIyOTQsImV4cCI6MjA3MDkzODI5NH0.C0_RjPLk5TvNaXp50Ir-hJpZniQs4E_wrlbmED-xMLM';

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Service role client for server-side operations that need to bypass RLS
// This should only be used in API routes and server-side code
export function createSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    // Fallback to anon key if service role key is not available
    // This will respect RLS but may fail for admin operations
    return supabase;
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}

// Mock client removed - using real Supabase client above

// Environment variables check (for when Supabase is implemented)
export function validateSupabaseConfig(): boolean {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return false;
  }

  return true;
}

// Database types moved to types.ts file

// Migration instructions
export const MIGRATION_CHECKLIST = `
# Supabase Migration Checklist

## 1. Environment Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Add environment variables to .env.local:
  - NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for server-side operations)

## 2. Install Dependencies
- [ ] npm install @supabase/supabase-js

## 3. Database Setup
- [ ] Run the SQL schema from repositories/supabase/types.ts in Supabase SQL editor
- [ ] Set up Row Level Security (RLS) policies
- [ ] Test database connection

## 4. Replace Repository Implementation
- [ ] Update repositories/index.ts to use SupabaseAppRepository instead of LocalAppRepository
- [ ] Implement all TODO methods in Supabase repository classes
- [ ] Test each repository method

## 5. Authentication Setup
- [ ] Update auth/supabase-auth.ts implementation
- [ ] Replace LocalAuth with SupabaseAuth in app/layout.tsx
- [ ] Set up authentication pages (/auth/login, /auth/register)
- [ ] Test authentication flow

## 6. Data Migration (if needed)
- [ ] Export data from IndexedDB using LocalAppRepository.exportAllData()
- [ ] Transform data format if necessary
- [ ] Import data to Supabase using SupabaseAppRepository.importAllData()

## 7. Testing
- [ ] Test all CRUD operations
- [ ] Test authentication
- [ ] Test RLS policies
- [ ] Performance testing with larger datasets

## 8. Cleanup
- [ ] Remove local repository implementations (optional)
- [ ] Update documentation
- [ ] Remove Dexie dependency if no longer needed
`;
