'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { LocalAppRepository } from '@/repositories/local';
import { AppRepository } from '@/repositories/contracts';
import {
  createClientAppRepository,
  getClientDBProvider,
} from '@/repositories/factory';

const RepositoryContext = createContext<AppRepository | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
}

export function RepositoryProvider({ children }: RepositoryProviderProps) {
  const repository = useMemo<AppRepository>(() => {
    try {
      return createClientAppRepository(getClientDBProvider());
    } catch {
      return new LocalAppRepository();
    }
  }, []);

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
