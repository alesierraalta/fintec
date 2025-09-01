import { CategoriesRepository, CreateCategoryDTO, UpdateCategoryDTO } from '@/repositories/contracts';
import { Category, CategoryKind, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import { 
  mapSupabaseCategoryToDomain, 
  mapDomainCategoryToSupabase,
  mapSupabaseCategoryArrayToDomain 
} from './mappers';

export class SupabaseCategoriesRepository implements CategoriesRepository {
  async findAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('kind', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  async findById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    return mapSupabaseCategoryToDomain(data);
  }

  async findByKind(kind: CategoryKind): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('kind', kind)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories by kind: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  async findByParent(parentId: string | null): Promise<Category[]> {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories by parent: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  async findWithPagination(params: PaginationParams): Promise<PaginatedResult<Category>> {
    const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (countError) {
      throw new Error(`Failed to count categories: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseCategoryArrayToDomain(data || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(category: CreateCategoryDTO): Promise<Category> {
    const supabaseCategory = mapDomainCategoryToSupabase({
      ...category,
      active: category.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('categories')
      .insert(supabaseCategory)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return mapSupabaseCategoryToDomain(data);
  }

  async update(id: string, updates: UpdateCategoryDTO): Promise<Category> {
    const { id: updateId, ...updateData } = updates;
    const supabaseUpdates = mapDomainCategoryToSupabase({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('categories')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return mapSupabaseCategoryToDomain(data);
  }

  async delete(id: string): Promise<void> {
    // Soft delete by setting active to false
    const { error } = await supabase
      .from('categories')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete category: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count categories: ${error.message}`);
    }

    return count || 0;
  }

  async search(query: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to search categories: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  // Missing methods from CategoriesRepository interface
  async findByParentId(parentId: string): Promise<Category[]> {
    return this.findByParent(parentId);
  }

  async findRootCategories(): Promise<Category[]> {
    return this.findByParent(null);
  }

  async findActive(): Promise<Category[]> {
    return this.findAll(); // findAll already filters by active
  }

  async findWithSubcategories(id: string): Promise<Category & { subcategories: Category[] }> {
    const category = await this.findById(id);
    if (!category) {
      throw new Error(`Category not found: ${id}`);
    }

    const subcategories = await this.findByParentId(id);
    
    return {
      ...category,
      subcategories,
    };
  }

  async findCategoryTree(kind?: CategoryKind): Promise<(Category & { subcategories: Category[] })[]> {
    let rootCategories: Category[];
    
    if (kind) {
      const allCategories = await this.findByKind(kind);
      rootCategories = allCategories.filter(cat => !cat.parentId);
    } else {
      rootCategories = await this.findRootCategories();
    }

    const results: (Category & { subcategories: Category[] })[] = [];
    
    for (const rootCategory of rootCategories) {
      const subcategories = await this.findByParentId(rootCategory.id);
      results.push({
        ...rootCategory,
        subcategories,
      });
    }

    return results;
  }

  async canDelete(id: string): Promise<boolean> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = cannot delete
      console.warn('No authenticated user - returning false for category deletion check');
      return false;
    }
    
    const userId = user.id;

    // Get user's account IDs first
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId);

    if (!accounts || accounts.length === 0) {
      return true; // No accounts = no transactions = can delete
    }

    const accountIds = accounts.map(acc => acc.id);

    // Check if category has any transactions from user's accounts
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .in('account_id', accountIds);

    if (error) {
      throw new Error(`Failed to check category usage: ${error.message}`);
    }

    // Also check if it has subcategories
    const subcategories = await this.findByParentId(id);
    
    return (count || 0) === 0 && subcategories.length === 0;
  }

  async getUsageCount(id: string): Promise<number> {
    // Only allow authenticated users - no fallbacks
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // No user authenticated = no transactions visible
      console.warn('No authenticated user - returning 0 for category usage count');
      return 0;
    }
    
    const userId = user.id;

    // Get user's account IDs first
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId);

    if (!accounts || accounts.length === 0) {
      return 0; // No accounts = no transactions
    }

    const accountIds = accounts.map(acc => acc.id);

    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .in('account_id', accountIds);

    if (error) {
      throw new Error(`Failed to get category usage count: ${error.message}`);
    }

    return count || 0;
  }

  async reorderCategories(categoryIds: string[]): Promise<void> {
    // TODO: Implement category reordering
    // This would require adding an order/position field to the categories table
  }

  async createDefaultCategories(): Promise<Category[]> {
    // TODO: Implement default categories creation
    // This should probably call the init-database API endpoint
    return [];
  }

  // Missing BaseRepository methods
  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Category>> {
    return this.findWithPagination(params);
  }

  async createMany(data: CreateCategoryDTO[]): Promise<Category[]> {
    const results: Category[] = [];
    
    for (const categoryData of data) {
      const result = await this.create(categoryData);
      results.push(result);
    }
    
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    // Soft delete by setting active to false
    const { error } = await supabase
      .from('categories')
      .update({ active: false })
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to delete categories: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const category = await this.findById(id);
    return category !== null;
  }
}

