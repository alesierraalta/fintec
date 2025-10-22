import { PaginatedResult, PaginationParams } from '@/types';

export interface BaseRepository<T, CreateDTO, UpdateDTO> {
  // Basic CRUD operations
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
  
  // Bulk operations
  createMany(data: CreateDTO[]): Promise<T[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Pagination
  findPaginated(params: PaginationParams): Promise<PaginatedResult<T>>;
  
  // Utility
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
}

export interface Repository {
  // Health check
  isHealthy(): Promise<boolean>;
  
  // Migration/setup
  initialize(): Promise<void>;
  
  // Cleanup
  clear(): Promise<void>;
}
