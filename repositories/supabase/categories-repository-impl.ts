import { CategoriesRepository } from '@/repositories/contracts';
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

  async create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const supabaseCategory = mapDomainCategoryToSupabase(category);

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

  async update(id: string, updates: Partial<Category>): Promise<Category> {
    const supabaseUpdates = mapDomainCategoryToSupabase(updates);

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
}

