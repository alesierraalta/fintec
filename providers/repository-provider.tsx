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
  // Temporarily use Local repository while Supabase implementation is being completed
  let repository: AppRepository;
  
  try {
    // Use Local repository for now - Supabase implementation needs completion
    repository = new LocalAppRepository();
    console.log('Using Local repository (Supabase implementation in progress)');
  } catch (error) {
    console.warn('Failed to initialize Local repository:', error);
    // Fallback - this should not happen but keeping for safety
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
