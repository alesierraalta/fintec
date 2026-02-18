// @ts-nocheck
import { BudgetsRepository, CreateBudgetDTO } from '@/repositories/contracts';
import { Budget, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SupabaseBudget } from './types';
import {
  mapSupabaseBudgetToDomain,
  mapDomainBudgetToSupabase,
  mapSupabaseBudgetArrayToDomain,
} from './mappers';

// @ts-ignore - Incomplete implementation, using LocalAppRepository instead
export class SupabaseBudgetsRepository implements BudgetsRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  private async getUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id || null;
  }
  async findAll(): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('month_year', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain(data || []);
  }

  async findById(id: string): Promise<Budget | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch budget: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data);
  }

  async findByCategoryId(categoryId: string): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('category_id', categoryId)
      .eq('user_id', userId)
      .eq('active', true)
      .order('month_year', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch budgets by category: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain(data || []);
  }

  async findByMonth(monthYYYYMM: string): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('month_year', monthYYYYMM)
      .eq('user_id', userId)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch budgets by month: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain(data || []);
  }

  async findByCategoryAndMonth(
    categoryId: string,
    monthYYYYMM: string
  ): Promise<Budget | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('category_id', categoryId)
      .eq('month_year', monthYYYYMM)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(
        `Failed to fetch budget by category and month: ${error.message}`
      );
    }

    return mapSupabaseBudgetToDomain(data);
  }

  async findWithPagination(
    params: PaginationParams
  ): Promise<PaginatedResult<Budget>> {
    const { page, limit, sortBy = 'month_year', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;
    const userId = await this.getUserId();
    if (!userId) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Get total count
    const { count, error: countError } = await this.client
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if (countError) {
      throw new Error(`Failed to count budgets: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .order('name', { ascending: true }) // Secondary sort
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseBudgetArrayToDomain(data || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(data: CreateBudgetDTO): Promise<Budget> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const budget: Budget = {
      id: crypto.randomUUID(),
      userId,
      categoryId: data.categoryId,
      monthYYYYMM: data.monthYear.replace('-', ''), // Convert YYYY-MM to YYYYMM
      amountBaseMinor: data.amountBaseMinor,
      spentMinor: 0, // Will be calculated
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabaseBudget = mapDomainBudgetToSupabase(budget);
    const insertData =
      supabaseBudget as unknown as Database['public']['Tables']['budgets']['Insert'];

    const { data: insertedData, error } = await (
      this.client.from('budgets') as any
    )
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create budget: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(insertedData);
  }

  async update(id: string, updates: Partial<Budget>): Promise<Budget> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const supabaseUpdates = mapDomainBudgetToSupabase({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const updateData =
      supabaseUpdates as unknown as Database['public']['Tables']['budgets']['Update'];

    const { data, error } = await (this.client.from('budgets') as any)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update budget: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Soft delete by setting active to false
    const softDelete = {
      active: false,
    } as unknown as Database['public']['Tables']['budgets']['Update'];
    const { error } = await (this.client.from('budgets') as any)
      .update(softDelete)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete budget: ${error.message}`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to hard delete budget: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const { count, error } = await this.client
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count budgets: ${error.message}`);
    }

    return count || 0;
  }

  async updateSpentAmount(id: string, spentMinor: number): Promise<Budget> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const updates: Database['public']['Tables']['budgets']['Update'] = {
      spent_base_minor: spentMinor,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (this.client.from('budgets') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update budget spent amount: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data);
  }

  async getBudgetSummary(monthYYYYMM: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    budgetCount: number;
  }> {
    const userId = await this.getUserId();
    if (!userId) {
      return { totalBudget: 0, totalSpent: 0, budgetCount: 0 };
    }

    const { data, error } = await this.client
      .from('budgets')
      .select('amount_base_minor, spent_base_minor')
      .eq('month_year', monthYYYYMM)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to get budget summary: ${error.message}`);
    }

    const budgets = (data || []) as Array<{
      amount_base_minor: number;
      spent_base_minor: number | null;
    }>;
    const totalBudget = budgets.reduce(
      (sum, budget) => sum + budget.amount_base_minor,
      0
    );
    const totalSpent = budgets.reduce(
      (sum, budget) => sum + (budget.spent_base_minor || 0),
      0
    );

    return {
      totalBudget,
      totalSpent,
      budgetCount: budgets.length,
    };
  }

  async getOverBudgetCategories(monthYYYYMM: string): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select('*')
      .eq('month_year', monthYYYYMM)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to get over-budget categories: ${error.message}`);
    }

    const budgets = mapSupabaseBudgetArrayToDomain(data || []);
    return budgets.filter(
      (budget) => (budget.spentMinor || 0) > budget.amountBaseMinor
    );
  }

  async getBudgetProgress(
    categoryId: string,
    monthYYYYMM: string
  ): Promise<{
    budgeted: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
  } | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('budgets')
      .select('amount_base_minor, spent_base_minor')
      .eq('category_id', categoryId)
      .eq('month_year', monthYYYYMM)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch budget progress: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const row = data as {
      amount_base_minor: number;
      spent_base_minor: number | null;
    };
    const budgeted = row.amount_base_minor;
    const spent = row.spent_base_minor || 0;
    const remaining = budgeted - spent;
    const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;

    return {
      budgeted,
      spent,
      remaining,
      percentageUsed,
    };
  }
}
