/**
 * Task 2.5-2.6: Category Service Interface + Implementation
 *
 * Tests for ICategoryService interface and CategoryService implementation.
 */

import type { ICategoryService, CreateCategoryDTO, UpdateCategoryDTO } from '@/lib/services/category-service.interface';
import type { Category, CategoryKind } from '@/types';

// ─── Task 2.5: Interface Contract Tests ────────────────────────────────────────

describe('ICategoryService interface', () => {
  it('should export ICategoryService type from the interface file', async () => {
    const mod = await import('@/lib/services/category-service.interface');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});

// ─── Task 2.6: CategoryService Implementation Tests ────────────────────────────

describe('CategoryService', () => {
  let CategoryService: typeof import('@/lib/services/category-service').CategoryService;

  beforeAll(async () => {
    const mod = await import('@/lib/services/category-service');
    CategoryService = mod.CategoryService;
  });

  const mockCategoriesRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByKind: jest.fn(),
    findByParentId: jest.fn(),
    findRootCategories: jest.fn(),
    findActive: jest.fn(),
    findWithSubcategories: jest.fn(),
    findCategoryTree: jest.fn(),
    canDelete: jest.fn(),
    getUsageCount: jest.fn(),
    reorderCategories: jest.fn(),
    createDefaultCategories: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  let service: ICategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService(mockCategoriesRepo as never);
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          name: 'Food',
          kind: 'EXPENSE' as CategoryKind,
          color: '#ff0000',
          icon: 'UtensilsCrossed',
          active: true,
          userId: null,
          isDefault: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockCategoriesRepo.findAll.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesRepo.findAll).toHaveBeenCalled();
    });

    it('should filter by kind when provided', async () => {
      mockCategoriesRepo.findByKind.mockResolvedValue([]);

      await service.findAll({ kind: 'EXPENSE' as CategoryKind });

      expect(mockCategoriesRepo.findByKind).toHaveBeenCalledWith('EXPENSE');
    });

    it('should filter by active status when provided', async () => {
      mockCategoriesRepo.findActive.mockResolvedValue([]);

      await service.findAll({ active: true });

      expect(mockCategoriesRepo.findActive).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a category by ID', async () => {
      const mockCategory: Category = {
        id: 'cat-1',
        name: 'Food',
        kind: 'EXPENSE' as CategoryKind,
        color: '#ff0000',
        icon: 'UtensilsCrossed',
        active: true,
        userId: null,
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCategoriesRepo.findById.mockResolvedValue(mockCategory);

      const result = await service.findById('cat-1');

      expect(result).toEqual(mockCategory);
    });
  });

  describe('create', () => {
    it('should create a category with valid data', async () => {
      const dto: CreateCategoryDTO = {
        name: 'Transport',
        kind: 'EXPENSE' as CategoryKind,
        color: '#00ff00',
        icon: 'Car',
        active: true,
        isDefault: false,
      };

      const mockCreated: Category = {
        id: 'cat-new',
        ...dto,
        userId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCategoriesRepo.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(result).toEqual(mockCreated);
      expect(mockCategoriesRepo.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const dto: CreateCategoryDTO = {
        name: '',
        kind: 'EXPENSE' as CategoryKind,
        color: '#00ff00',
        icon: 'Car',
        active: true,
        isDefault: false,
      };

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const existing: Category = {
        id: 'cat-1',
        name: 'Old Name',
        kind: 'EXPENSE' as CategoryKind,
        color: '#ff0000',
        icon: 'UtensilsCrossed',
        active: true,
        userId: null,
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCategoriesRepo.findById.mockResolvedValue(existing);
      mockCategoriesRepo.update.mockResolvedValue({ ...existing, name: 'New Name' });

      const result = await service.update('cat-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });

  describe('remove', () => {
    it('should delete a category when it can be deleted', async () => {
      const existing: Category = {
        id: 'cat-1',
        name: 'Food',
        kind: 'EXPENSE' as CategoryKind,
        color: '#ff0000',
        icon: 'UtensilsCrossed',
        active: true,
        userId: null,
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCategoriesRepo.findById.mockResolvedValue(existing);
      mockCategoriesRepo.canDelete.mockResolvedValue(true);
      mockCategoriesRepo.delete.mockResolvedValue(undefined);

      await service.remove('cat-1');

      expect(mockCategoriesRepo.delete).toHaveBeenCalledWith('cat-1');
    });

    it('should throw ValidationError when category cannot be deleted', async () => {
      const existing: Category = {
        id: 'cat-1',
        name: 'Food',
        kind: 'EXPENSE' as CategoryKind,
        color: '#ff0000',
        icon: 'UtensilsCrossed',
        active: true,
        userId: null,
        isDefault: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCategoriesRepo.findById.mockResolvedValue(existing);
      mockCategoriesRepo.canDelete.mockResolvedValue(false);

      await expect(service.remove('cat-1')).rejects.toThrow();
    });
  });

  describe('getCategoryTree', () => {
    it('should return category tree', async () => {
      const mockTree = [
        {
          id: 'cat-1',
          name: 'Food',
          kind: 'EXPENSE' as CategoryKind,
          color: '#ff0000',
          icon: 'UtensilsCrossed',
          active: true,
          userId: null,
          isDefault: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          subcategories: [],
        },
      ];

      mockCategoriesRepo.findCategoryTree.mockResolvedValue(mockTree);

      const result = await service.getCategoryTree();

      expect(result).toEqual(mockTree);
    });
  });
});
