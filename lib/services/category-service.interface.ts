import type { Category, CategoryKind } from '@/types';

/**
 * Filters for querying categories.
 */
export interface CategoryFilters {
  kind?: CategoryKind;
  active?: boolean;
  parentId?: string;
}

/**
 * DTO for creating a new category.
 */
export interface CreateCategoryDTO {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  parentId?: string;
  active: boolean;
  isDefault: boolean;
}

/**
 * DTO for updating an existing category.
 */
export interface UpdateCategoryDTO {
  name?: string;
  kind?: CategoryKind;
  color?: string;
  icon?: string;
  parentId?: string;
  active?: boolean;
}

/**
 * Category tree node with subcategories.
 */
export interface CategoryTreeNode extends Category {
  subcategories: Category[];
}

/**
 * CategoryService interface.
 *
 * Defines the business logic layer for categories.
 * Handles validation, hierarchy, and deletion safety checks.
 */
export interface ICategoryService {
  /**
   * Fetch categories with optional filters.
   */
  findAll(filters?: CategoryFilters): Promise<Category[]>;

  /**
   * Fetch a single category by ID.
   */
  findById(id: string): Promise<Category | null>;

  /**
   * Create a new category with validation.
   */
  create(dto: CreateCategoryDTO): Promise<Category>;

  /**
   * Update an existing category.
   */
  update(id: string, dto: UpdateCategoryDTO): Promise<Category>;

  /**
   * Delete a category (with safety check).
   */
  remove(id: string): Promise<void>;

  /**
   * Get category tree with subcategories.
   */
  getCategoryTree(kind?: CategoryKind): Promise<CategoryTreeNode[]>;
}
