// Main repository exports and factory

// Export all contracts
export * from './contracts';

// Export implementations
export * from './local';
export * from './supabase';

// Repository factory
import { AppRepository } from './contracts';
import { LocalAppRepository } from './local';
import { SupabaseAppRepository } from './supabase';

export type RepositoryType = 'local' | 'supabase';

export function createRepository(type: RepositoryType = 'local'): AppRepository {
  switch (type) {
    case 'local':
      return new LocalAppRepository();
    case 'supabase':
      // TODO: Complete Supabase implementation
      throw new Error('Supabase repository implementation is not complete yet');
    default:
      throw new Error(`Unknown repository type: ${type}`);
  }
}

// Default repository instance (using local for now)
let repositoryInstance: AppRepository | null = null;

export function getRepository(): AppRepository {
  if (!repositoryInstance) {
    // Using Local as the default repository while Supabase is being implemented
    repositoryInstance = createRepository('local');
  }
  return repositoryInstance;
}

export function setRepository(repository: AppRepository): void {
  repositoryInstance = repository;
}

// Initialize repository
export async function initializeRepository(): Promise<void> {
  const repository = getRepository();
  await repository.initialize();
}

// Health check
export async function isRepositoryHealthy(): Promise<boolean> {
  const repository = getRepository();
  return repository.isHealthy();
}
