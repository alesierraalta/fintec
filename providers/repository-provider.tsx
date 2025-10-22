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
  // Switch to Supabase repository - categories have been set up in database
  let repository: AppRepository;
  
  try {
    // Use Supabase repository now - categories and RLS policies are configured
    repository = new SupabaseAppRepository();
  } catch (error) {
    // Fallback to Local repository if Supabase fails
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
