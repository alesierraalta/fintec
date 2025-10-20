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
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('kind', { ascending: true })
      .order('name', { ascending: true });

    // Filter by user's categories or default categories
    if (user) {
      query = query.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      // If not authenticated, only show default categories
      query = query.eq('is_default', true);
    }

    const { data, error } = await query;

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
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('categories')
      .select('*')
      .eq('kind', kind)
      .eq('active', true)
      .order('name', { ascending: true });

    // Filter by user's categories or default categories
    if (user) {
      query = query.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      // If not authenticated, only show default categories
      query = query.eq('is_default', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories by kind: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  async findByParent(parentId: string | null): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
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

    // Filter by user's categories or default categories
    if (user) {
      query = query.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      // If not authenticated, only show default categories
      query = query.eq('is_default', true);
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
    const { data: { user } } = await supabase.auth.getUser();

    // Get total count
    let countQuery = supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // Filter by user's categories or default categories
    if (user) {
      countQuery = countQuery.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      countQuery = countQuery.eq('is_default', true);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count categories: ${countError.message}`);
    }

    // Get paginated data
    let dataQuery = supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Filter by user's categories or default categories
    if (user) {
      dataQuery = dataQuery.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      dataQuery = dataQuery.eq('is_default', true);
    }

    const { data, error } = await dataQuery;

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
    const { data: { user } } = await supabase.auth.getUser();
    
    const supabaseCategory = mapDomainCategoryToSupabase({
      ...category,
      active: category.active ?? true,
      userId: category.isDefault ? null : user?.id || null,
      isDefault: category.isDefault ?? false,
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
    const { data: { user } } = await supabase.auth.getUser();
    
    // First verify that the user owns this category or it's a default category
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Category not found: ${id}`);
    }

    // Users can only update their own categories or default categories (if they have admin permissions)
    if (existing.userId !== user?.id && !existing.isDefault) {
      throw new Error(`You can only update your own categories`);
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    
    // First verify that the user owns this category
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Category not found: ${id}`);
    }

    // Users can only delete their own categories (not default categories)
    if (existing.userId !== user?.id) {
      throw new Error(`You can only delete your own categories`);
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    // Filter by user's categories or default categories
    if (user) {
      query = query.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      // If not authenticated, only show default categories
      query = query.eq('is_default', true);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count categories: ${error.message}`);
    }

    return count || 0;
  }

  async search(query: string): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    let searchQuery = supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    // Filter by user's categories or default categories
    if (user) {
      searchQuery = searchQuery.or(`user_id.eq.${user.id},is_default.eq.true`);
    } else {
      // If not authenticated, only show default categories
      searchQuery = searchQuery.eq('is_default', true);
    }

    const { data, error } = await searchQuery;

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
    const { data: { user } } = await supabase.auth.getUser();
    
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
    const { data: { user } } = await supabase.auth.getUser();
    
    // Verify user owns all categories they're trying to delete
    for (const id of ids) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Category not found: ${id}`);
      }
      if (existing.userId !== user?.id) {
        throw new Error(`You can only delete your own categories`);
      }
    }

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
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // Not found
      throw new Error(`Failed to check category existence: ${error.message}`);
    }

    return !!data;
  }
}

