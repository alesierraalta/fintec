// Supabase client configuration and initialization
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// Legacy mock client for development (remove when fully migrated)
export const mockSupabase = {
  // Auth methods
  auth: {
    signUp: async (credentials: { email: string; password: string }) => {
      console.log('TODO: Implement Supabase signUp', credentials);
      throw new Error('Supabase not implemented yet');
    },
    
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      console.log('TODO: Implement Supabase signInWithPassword', credentials);
      throw new Error('Supabase not implemented yet');
    },
    
    signOut: async () => {
      console.log('TODO: Implement Supabase signOut');
      throw new Error('Supabase not implemented yet');
    },
    
    getUser: async () => {
      console.log('TODO: Implement Supabase getUser');
      throw new Error('Supabase not implemented yet');
    },
    
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      console.log('TODO: Implement Supabase onAuthStateChange', callback);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  // Database methods
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          console.log(`TODO: Implement Supabase SELECT from ${table} WHERE ${column} = ${value}`);
          throw new Error('Supabase not implemented yet');
        },
        limit: (count: number) => ({
          range: (from: number, to: number) => ({
            order: (column: string, options?: { ascending?: boolean }) => ({
              then: async (callback: (result: any) => void) => {
                console.log(`TODO: Implement Supabase query on ${table}`);
                throw new Error('Supabase not implemented yet');
              }
            })
          })
        })
      }),
      order: (column: string, options?: { ascending?: boolean }) => ({
        then: async (callback: (result: any) => void) => {
          console.log(`TODO: Implement Supabase query on ${table}`);
          throw new Error('Supabase not implemented yet');
        }
      }),
      then: async (callback: (result: any) => void) => {
        console.log(`TODO: Implement Supabase SELECT from ${table}`);
        throw new Error('Supabase not implemented yet');
      }
    }),
    
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          console.log(`TODO: Implement Supabase INSERT into ${table}`, data);
          throw new Error('Supabase not implemented yet');
        }
      })
    }),
    
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: () => ({
          single: async () => {
            console.log(`TODO: Implement Supabase UPDATE ${table} SET ... WHERE ${column} = ${value}`, data);
            throw new Error('Supabase not implemented yet');
          }
        })
      })
    }),
    
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (callback: (result: any) => void) => {
          console.log(`TODO: Implement Supabase DELETE from ${table} WHERE ${column} = ${value}`);
          throw new Error('Supabase not implemented yet');
        }
      })
    }),
  }),

  // RPC methods for custom functions
  rpc: (functionName: string, params?: any) => ({
    then: async (callback: (result: any) => void) => {
      console.log(`TODO: Implement Supabase RPC ${functionName}`, params);
      throw new Error('Supabase not implemented yet');
    }
  }),
};

// Environment variables check (for when Supabase is implemented)
export function validateSupabaseConfig(): boolean {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn('Missing Supabase environment variables:', missing);
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
