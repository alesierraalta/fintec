import { Category, CategoryKind } from '@/types';
import { BaseRepository } from './base-repository';

export interface CreateCategoryDTO {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  parentId?: string;
  active?: boolean;
  isDefault?: boolean; // true for default categories, false or undefined for user-specific
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {
  id: string;
}

export interface CategoriesRepository extends BaseRepository<Category, CreateCategoryDTO, UpdateCategoryDTO> {
  // Category-specific queries
  findByKind(kind: CategoryKind): Promise<Category[]>;
  findByParentId(parentId: string): Promise<Category[]>;
  findRootCategories(): Promise<Category[]>;
  findActive(): Promise<Category[]>;
  
  // Hierarchical operations
  findWithSubcategories(id: string): Promise<Category & { subcategories: Category[] }>;
  findCategoryTree(kind?: CategoryKind): Promise<(Category & { subcategories: Category[] })[]>;
  
  // Validation
  canDelete(id: string): Promise<boolean>; // Check if category has transactions
  getUsageCount(id: string): Promise<number>; // Number of transactions using this category
  
  // Bulk operations
  reorderCategories(categoryIds: string[]): Promise<void>;
  
  // Default categories
  createDefaultCategories(): Promise<Category[]>;
}
