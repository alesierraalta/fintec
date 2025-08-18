'use client';

import { createContext, useContext, ReactNode } from 'react';
import { LocalAppRepository } from '@/repositories/local';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { AppRepository } from '@/repositories/contracts';

const RepositoryContext = createContext<AppRepository | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
}

export function RepositoryProvider({ children }: RepositoryProviderProps) {
  // Use Supabase by default, fallback to local if environment variables are missing
  let repository: AppRepository;
  
  try {
    // Check if Supabase environment variables are available
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      repository = new SupabaseAppRepository();
    } else {
      console.warn('Supabase environment variables not found, using local repository');
      repository = new LocalAppRepository();
    }
  } catch (error) {
    console.warn('Failed to initialize Supabase repository, using local fallback:', error);
    repository = new LocalAppRepository();
  }

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository(): AppRepository {
  const repository = useContext(RepositoryContext);
  if (!repository) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return repository;
}
