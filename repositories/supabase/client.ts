// Supabase client configuration and initialization
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Storage adapter for localStorage
 * Used when "remember me" is checked - session persists indefinitely
 */
const localStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

/**
 * Storage adapter for sessionStorage
 * Used when "remember me" is unchecked - session clears on browser close
 */
const sessionStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },
};

/**
 * Factory function to create a Supabase client with dynamic storage configuration
 * @param options - Configuration options
 * @param options.rememberMe - If true, uses localStorage (persistent). If false, uses sessionStorage (temporary)
 * @returns Configured Supabase client
 */
export function createSupabaseClient(options?: { rememberMe?: boolean }): SupabaseClient<Database> {
  // Determine which storage adapter to use
  const storage = options?.rememberMe ? localStorageAdapter : sessionStorageAdapter;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Use createBrowserClient to support cookie-based auth for SSR/Server Components
// This is the default client for backward compatibility
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);


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
    } as any
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
