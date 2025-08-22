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
  // Use Supabase by default - credentials are configured in client.ts
  let repository: AppRepository;
  
  try {
    // Always use Supabase repository as it has fallback credentials
    repository = new SupabaseAppRepository();
    console.log('Using Supabase repository with configured database');
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
