import type { Category, CategoryKind } from '@/types';
import type { CategoriesRepository } from '@/repositories/contracts/categories-repository';
import type {
  ICategoryService,
  CategoryFilters,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryTreeNode,
} from './category-service.interface';
import { ValidationError } from '@/lib/errors/validation-error';
import { NotFoundError } from '@/lib/errors/not-found-error';

/**
 * CategoryService implements ICategoryService.
 *
 * Extracts business logic from API routes into a testable service layer.
 */
export class CategoryService implements ICategoryService {
  constructor(private readonly categoriesRepo: CategoriesRepository) {}

  async findAll(filters?: CategoryFilters): Promise<Category[]> {
    if (filters?.kind) {
      return this.categoriesRepo.findByKind(filters.kind);
    }

    if (filters?.parentId) {
      return this.categoriesRepo.findByParentId(filters.parentId);
    }

    if (filters?.active === true) {
      return this.categoriesRepo.findActive();
    }

    return this.categoriesRepo.findAll();
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoriesRepo.findById(id);
  }

  async create(dto: CreateCategoryDTO): Promise<Category> {
    // Validate required fields
    if (!dto.name) {
      throw new ValidationError('name is required');
    }

    if (!dto.kind) {
      throw new ValidationError('kind is required');
    }

    // Validate privacy rules
    if (dto.isDefault && dto.parentId) {
      throw new ValidationError('Default categories cannot have a parentId');
    }

    return this.categoriesRepo.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDTO): Promise<Category> {
    // Verify category exists
    const existing = await this.categoriesRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    // Spread id into DTO for repository (repository expects id in DTO)
    return this.categoriesRepo.update(id, { ...dto, id });
  }

  async remove(id: string): Promise<void> {
    // Verify category exists
    const existing = await this.categoriesRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Category ${id} not found`);
    }

    // Check if category can be deleted
    const canDelete = await this.categoriesRepo.canDelete(id);
    if (!canDelete) {
      throw new ValidationError(
        'Cannot delete category: it has associated transactions or subcategories'
      );
    }

    return this.categoriesRepo.delete(id);
  }

  async getCategoryTree(kind?: CategoryKind): Promise<CategoryTreeNode[]> {
    return this.categoriesRepo.findCategoryTree(kind);
  }
}
