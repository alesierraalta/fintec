import {
  CategoriesRepository,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '@/repositories/contracts';
import {
  Category,
  CategoryKind,
  PaginationParams,
  PaginatedResult,
} from '@/types';
import { RequestContext } from '@/lib/cache/request-context';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { isBackendSharedReadCacheEnabled } from '@/lib/backend/feature-flags';
import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapSupabaseCategoryToDomain,
  mapDomainCategoryToSupabase,
  mapSupabaseCategoryArrayToDomain,
} from './mappers';
import { CATEGORY_LIST_PROJECTION } from './category-projections';

export class SupabaseCategoriesRepository implements CategoriesRepository {
  private client: SupabaseClient;
  private readonly requestContext?: RequestContext;
  private readonly readCache: ServerReadCache;

  constructor(
    client?: SupabaseClient,
    requestContext?: RequestContext,
    readCache?: ServerReadCache
  ) {
    this.client = client || supabase;
    this.requestContext = requestContext;
    // Default to a no-op cache (no Redis client) to stay client-safe
    this.readCache = readCache ?? new ServerReadCache(null);
  }

  private shouldUseSharedCache(): boolean {
    return isBackendSharedReadCacheEnabled() && this.readCache.isAvailable();
  }

  private recordCacheEvent(
    name: string,
    status: 'hit' | 'miss',
    value: unknown
  ) {
    if (!this.requestContext) {
      return;
    }

    const bytes = JSON.stringify(value)?.length ?? 0;
    const rowCount = Array.isArray(value) ? value.length : value ? 1 : 0;

    this.requestContext.profiler.record({
      name: `cache_${status}_${name}`,
      durationMs: 0,
      bytes,
      queryCount: 0,
      rowCount,
    });
  }

  private async readThroughDefaultCache<T>(
    name: string,
    key: string,
    loader: () => Promise<T>,
    ttlSeconds = 600
  ): Promise<T> {
    if (!this.shouldUseSharedCache()) {
      return loader();
    }

    const cached = await this.readCache.get<T>(key);
    if (cached) {
      this.recordCacheEvent(name, 'hit', cached);
      return cached;
    }

    const loaded = await loader();
    await this.readCache.set(key, loaded, ttlSeconds);
    this.recordCacheEvent(name, 'miss', loaded);
    return loaded;
  }

  private async invalidateDefaultCategoryCache(): Promise<void> {
    if (!this.readCache.isAvailable()) {
      return;
    }

    await this.readCache.invalidatePattern('categories:default:*');
  }

  private async getCurrentUser() {
    if (this.requestContext) {
      // Return a partial user object with the ID if we only have the ID
      return { id: this.requestContext.userId } as any;
    }

    const {
      data: { user },
    } = await this.client.auth.getUser();

    return user;
  }

  private async fetchDefaultCategories(options: {
    cacheKeyParts: string[];
    kind?: CategoryKind;
    parentId?: string | null;
    search?: string;
  }): Promise<Category[]> {
    const cacheKey = this.readCache.makeKey(
      'categories',
      'default',
      ...options.cacheKeyParts
    );

    return this.readThroughDefaultCache(
      'categories_default',
      cacheKey,
      async () => {
        let query = this.client
          .from('categories')
          .select(CATEGORY_LIST_PROJECTION)
          .eq('active', true)
          .eq('is_default', true)
          .order('kind', { ascending: true })
          .order('name', { ascending: true });

        if (options.kind) {
          query = query.eq('kind', options.kind);
        }

        if (options.parentId === null) {
          query = query.is('parent_id', null);
        } else if (options.parentId) {
          query = query.eq('parent_id', options.parentId);
        }

        if (options.search) {
          query = query.ilike('name', `%${options.search}%`);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(
            `Failed to fetch default categories: ${error.message}`
          );
        }

        return mapSupabaseCategoryArrayToDomain(data || []);
      }
    );
  }

  private async fetchUserCategories(
    userId: string,
    options: {
      kind?: CategoryKind;
      parentId?: string | null;
      search?: string;
    }
  ): Promise<Category[]> {
    let query = this.client
      .from('categories')
      .select(CATEGORY_LIST_PROJECTION)
      .eq('active', true)
      .eq('user_id', userId)
      .order('kind', { ascending: true })
      .order('name', { ascending: true });

    if (options.kind) {
      query = query.eq('kind', options.kind);
    }

    if (options.parentId === null) {
      query = query.is('parent_id', null);
    } else if (options.parentId) {
      query = query.eq('parent_id', options.parentId);
    }

    if (options.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch user categories: ${error.message}`);
    }

    return mapSupabaseCategoryArrayToDomain(data || []);
  }

  private mergeCategories(
    defaultCategories: Category[],
    userCategories: Category[]
  ): Category[] {
    return [...defaultCategories, ...userCategories];
  }
  async findAll(): Promise<Category[]> {
    const user = await this.getCurrentUser();
    const defaultCategories = await this.fetchDefaultCategories({
      cacheKeyParts: ['all'],
    });

    if (!user) {
      return defaultCategories;
    }

    const userCategories = await this.fetchUserCategories(user.id, {});
    return this.mergeCategories(defaultCategories, userCategories);
  }

  async findById(id: string): Promise<Category | null> {
    const cacheKey = this.readCache.makeKey('categories', 'id', id);

    // Try shared cache first
    const cached = await this.readCache.get<Category>(cacheKey);
    if (cached) {
      this.recordCacheEvent('categories_findById', 'hit', cached);
      return cached;
    }

    const { data, error } = await this.client
      .from('categories')
      .select(CATEGORY_LIST_PROJECTION)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const result = mapSupabaseCategoryToDomain(data as any);

    // Only cache in shared cache if it's a default category
    if (result.isDefault) {
      await this.readCache.set(cacheKey, result, 600);
      this.recordCacheEvent('categories_findById', 'miss', result);
    }

    return result;
  }

  async findByKind(kind: CategoryKind): Promise<Category[]> {
    const user = await this.getCurrentUser();
    const defaultCategories = await this.fetchDefaultCategories({
      cacheKeyParts: ['kind', kind],
      kind,
    });

    if (!user) {
      return defaultCategories;
    }

    const userCategories = await this.fetchUserCategories(user.id, { kind });
    return this.mergeCategories(defaultCategories, userCategories);
  }

  async findByParent(parentId: string | null): Promise<Category[]> {
    const user = await this.getCurrentUser();
    const defaultCategories = await this.fetchDefaultCategories({
      cacheKeyParts: ['parent', parentId ?? 'root'],
      parentId,
    });

    if (!user) {
      return defaultCategories;
    }

    const userCategories = await this.fetchUserCategories(user.id, {
      parentId,
    });
    return this.mergeCategories(defaultCategories, userCategories);
  }

  async findWithPagination(
    params: PaginationParams
  ): Promise<PaginatedResult<Category>> {
    const { page, limit, sortBy = 'name', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;
    const {
      data: { user },
    } = await this.client.auth.getUser();

    let query = this.client
      .from('categories')
      .select(CATEGORY_LIST_PROJECTION, { count: 'exact' })
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (user) {
      query = query.or(`is_default.eq.true,user_id.eq.${user.id}`);
    } else {
      query = query.eq('is_default', true);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseCategoryArrayToDomain((data as any) || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(category: CreateCategoryDTO): Promise<Category> {
    const user = await this.getCurrentUser();

    if (!user && !category.isDefault) {
      throw new Error('Unauthorized');
    }

    const supabaseCategory = mapDomainCategoryToSupabase({
      ...category,
      active: category.active ?? true,
      userId: category.isDefault ? null : user?.id || null,
      isDefault: category.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await (this.client.from('categories') as any)
      .insert(supabaseCategory as any)
      .select(CATEGORY_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    const createdCategory = mapSupabaseCategoryToDomain(data as any);
    if (createdCategory.isDefault) {
      await this.invalidateDefaultCategoryCache();
    }

    return createdCategory;
  }

  async update(id: string, updates: UpdateCategoryDTO): Promise<Category> {
    const user = await this.getCurrentUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Category not found: ${id}`);
    }

    if (existing.userId !== user?.id && !existing.isDefault) {
      throw new Error(`You can only update your own categories`);
    }

    const { id: updateId, ...updateData } = updates;
    const supabaseUpdates = mapDomainCategoryToSupabase({
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await (this.client.from('categories') as any)
      .update(supabaseUpdates as any)
      .eq('id', id)
      .select(CATEGORY_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    const updatedCategory = mapSupabaseCategoryToDomain(data as any);
    if (existing.isDefault || updatedCategory.isDefault) {
      await this.invalidateDefaultCategoryCache();
      // Also invalidate the specific ID key in the shared cache
      await this.readCache.delete(
        this.readCache.makeKey('categories', 'id', id)
      );
    }

    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

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
    const { error } = await (this.client.from('categories') as any)
      .update({ active: false } as any)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    if (existing?.isDefault) {
      await this.invalidateDefaultCategoryCache();
      await this.readCache.delete(
        this.readCache.makeKey('categories', 'id', id)
      );
    }
  }

  async hardDelete(id: string): Promise<void> {
    const existing = await this.findById(id);

    const { error } = await this.client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete category: ${error.message}`);
    }

    if (existing?.isDefault) {
      await this.invalidateDefaultCategoryCache();
      await this.readCache.delete(
        this.readCache.makeKey('categories', 'id', id)
      );
    }
  }

  async count(): Promise<number> {
    const {
      data: { user },
    } = await this.client.auth.getUser();

    // If no user, we only count default categories, which can be cached
    if (!user) {
      const cacheKey = this.readCache.makeKey('categories', 'default-count');
      return this.readThroughDefaultCache(
        'categories_count_default',
        cacheKey,
        async () => {
          const { count, error } = await this.client
            .from('categories')
            .select('id', { count: 'exact', head: true })
            .eq('active', true)
            .eq('is_default', true);

          if (error) {
            throw new Error(`Failed to count categories: ${error.message}`);
          }

          return count || 0;
        }
      );
    }

    // For authenticated users, the count is mixed and harder to cache in shared cache
    // (We could use private memoization but that's handled by RequestContext)
    const { count, error } = await this.client
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
      .or(`is_default.eq.true,user_id.eq.${user.id}`);

    if (error) {
      throw new Error(`Failed to count categories: ${error.message}`);
    }

    return count || 0;
  }

  async search(query: string): Promise<Category[]> {
    const user = await this.getCurrentUser();
    const defaultCategories = await this.fetchDefaultCategories({
      cacheKeyParts: ['search', query],
      search: query,
    });

    if (!user) {
      return defaultCategories;
    }

    const userCategories = await this.fetchUserCategories(user.id, {
      search: query,
    });

    return this.mergeCategories(defaultCategories, userCategories);
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

  async findWithSubcategories(
    id: string
  ): Promise<Category & { subcategories: Category[] }> {
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

  async findCategoryTree(
    kind?: CategoryKind
  ): Promise<(Category & { subcategories: Category[] })[]> {
    let rootCategories: Category[];

    if (kind) {
      const allCategories = await this.findByKind(kind);
      rootCategories = allCategories.filter((cat) => !cat.parentId);
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
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      // No user authenticated = cannot delete
      console.warn(
        'No authenticated user - returning false for category deletion check'
      );
      return false;
    }

    const userId = user.id;

    // Get user's account IDs first
    const { data: accounts } = await this.client
      .from('accounts')
      .select('id')
      .eq('user_id', userId);

    if (!accounts || accounts.length === 0) {
      return true; // No accounts = no transactions = can delete
    }

    const accountIds = ((accounts as any[]) || []).map((acc: any) => acc.id);

    // Check if category has any transactions from user's accounts
    const { count, error } = await this.client
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
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      // No user authenticated = no transactions visible
      console.warn(
        'No authenticated user - returning 0 for category usage count'
      );
      return 0;
    }

    const userId = user.id;

    // Get user's account IDs first
    const { data: accounts } = await this.client
      .from('accounts')
      .select('id')
      .eq('user_id', userId);

    if (!accounts || accounts.length === 0) {
      return 0; // No accounts = no transactions
    }

    const accountIds = ((accounts as any[]) || []).map((acc: any) => acc.id);

    const { count, error } = await this.client
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
  async findPaginated(
    params: PaginationParams
  ): Promise<PaginatedResult<Category>> {
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
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

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
    const { error } = await (this.client.from('categories') as any)
      .update({ active: false } as any)
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to delete categories: ${error.message}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    const cat = await this.findById(id);
    return !!cat;
  }
}
