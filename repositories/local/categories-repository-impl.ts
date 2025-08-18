import { Category, CategoryKind, PaginatedResult, PaginationParams } from '@/types';
import { CategoriesRepository, CreateCategoryDTO, UpdateCategoryDTO } from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';

export class LocalCategoriesRepository implements CategoriesRepository {
  async findById(id: string): Promise<Category | null> {
    return (await db.categories.get(id)) || null;
  }

  async findAll(): Promise<Category[]> {
    return db.categories.orderBy('name').toArray();
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    const category: Category = {
      id: generateId('cat'),
      name: data.name,
      kind: data.kind,
      color: data.color,
      icon: data.icon,
      parentId: data.parentId,
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.categories.add(category);
    return category;
  }

  async update(id: string, data: UpdateCategoryDTO): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updated: Category = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db.categories.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Check if category is being used by transactions
    const canDelete = await this.canDelete(id);
    if (!canDelete) {
      throw new Error('Cannot delete category that is being used by transactions');
    }

    // Also delete subcategories
    const subcategories = await this.findByParentId(id);
    for (const subcategory of subcategories) {
      await this.delete(subcategory.id);
    }

    await db.categories.delete(id);
  }

  async createMany(data: CreateCategoryDTO[]): Promise<Category[]> {
    const categories: Category[] = data.map(item => ({
      id: generateId('cat'),
      name: item.name,
      kind: item.kind,
      color: item.color,
      icon: item.icon,
      parentId: item.parentId,
      active: item.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.categories.bulkAdd(categories);
    return categories;
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Category>> {
    const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;

    let query = db.categories.orderBy(sortBy as keyof Category);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.categories.count();
    const data = await query.offset(offset).limit(limit).toArray();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async count(): Promise<number> {
    return db.categories.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.categories.get(id)) !== undefined;
  }

  // Category-specific methods
  async findByKind(kind: CategoryKind): Promise<Category[]> {
    return db.categories.where('kind').equals(kind).toArray();
  }

  async findByParentId(parentId: string): Promise<Category[]> {
    return db.categories.where('parentId').equals(parentId).toArray();
  }

  async findRootCategories(): Promise<Category[]> {
    return db.categories.where('parentId').equals(undefined).toArray();
  }

  async findActive(): Promise<Category[]> {
    return db.categories.where('active').equals(true).toArray();
  }

  async findWithSubcategories(id: string): Promise<Category & { subcategories: Category[] }> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`Category with id ${id} not found`);
    }

    const subcategories = await this.findByParentId(id);
    
    return {
      ...category,
      subcategories,
    };
  }

  async findCategoryTree(kind?: CategoryKind): Promise<(Category & { subcategories: Category[] })[]> {
    const rootCategories = kind 
      ? await db.categories.where('parentId').equals(undefined).and(cat => cat.kind === kind).toArray()
      : await this.findRootCategories();

    const tree: (Category & { subcategories: Category[] })[] = [];

    for (const category of rootCategories) {
      const subcategories = await this.findByParentId(category.id);
      tree.push({
        ...category,
        subcategories,
      });
    }

    return tree;
  }

  async canDelete(id: string): Promise<boolean> {
    const usageCount = await this.getUsageCount(id);
    return usageCount === 0;
  }

  async getUsageCount(id: string): Promise<number> {
    return db.transactions.where('categoryId').equals(id).count();
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    // For simplicity, we'll just update the order in which they're stored
    // In a more complex implementation, you might add an 'order' field
    const categories = await db.categories.where('id').anyOf(categoryIds).toArray();
    
    for (let i = 0; i < categoryIds.length; i++) {
      const category = categories.find(c => c.id === categoryIds[i]);
      if (category) {
        await db.categories.put({
          ...category,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  async createDefaultCategories(): Promise<Category[]> {
    const defaultCategories: CreateCategoryDTO[] = [
      // Income categories
      { name: 'Salario', kind: CategoryKind.INCOME, color: '#22c55e', icon: 'Banknote' },
      { name: 'Freelance', kind: CategoryKind.INCOME, color: '#3b82f6', icon: 'Laptop' },
      { name: 'Inversiones', kind: CategoryKind.INCOME, color: '#8b5cf6', icon: 'TrendingUp' },
      { name: 'Otros Ingresos', kind: CategoryKind.INCOME, color: '#06b6d4', icon: 'Plus' },

      // Expense categories
      { name: 'Alimentación', kind: CategoryKind.EXPENSE, color: '#f59e0b', icon: 'UtensilsCrossed' },
      { name: 'Transporte', kind: CategoryKind.EXPENSE, color: '#ef4444', icon: 'Car' },
      { name: 'Vivienda', kind: CategoryKind.EXPENSE, color: '#8b5cf6', icon: 'Home' },
      { name: 'Servicios', kind: CategoryKind.EXPENSE, color: '#06b6d4', icon: 'Zap' },
      { name: 'Entretenimiento', kind: CategoryKind.EXPENSE, color: '#f97316', icon: 'Gamepad2' },
      { name: 'Salud', kind: CategoryKind.EXPENSE, color: '#dc2626', icon: 'Heart' },
      { name: 'Educación', kind: CategoryKind.EXPENSE, color: '#7c3aed', icon: 'GraduationCap' },
      { name: 'Compras', kind: CategoryKind.EXPENSE, color: '#db2777', icon: 'ShoppingBag' },
      { name: 'Otros Gastos', kind: CategoryKind.EXPENSE, color: '#6b7280', icon: 'MoreHorizontal' },
    ];

    return this.createMany(defaultCategories);
  }
}
