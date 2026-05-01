import {
  BudgetsRepository,
  CreateBudgetDTO,
  UpdateBudgetDTO,
  BudgetWithProgress,
} from '@/repositories/contracts';
import { Budget, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SupabaseBudget } from './types';
import type { RequestContext } from '@/lib/cache/request-context';
import { getOwnedAccountScope } from './account-scope';
import { getMemoizedOwnedAccountScope } from './memoized-account-scope';
import {
  mapSupabaseBudgetToDomain,
  mapDomainBudgetToSupabase,
  mapSupabaseBudgetArrayToDomain,
} from './mappers';
import {
  BUDGET_LIST_PROJECTION,
  BUDGET_DETAIL_PROJECTION,
} from './budget-projections';

export class SupabaseBudgetsRepository implements BudgetsRepository {
  private client: SupabaseClient;
  private readonly requestContext?: RequestContext;

  constructor(client?: SupabaseClient, requestContext?: RequestContext) {
    this.client = client || supabase;
    this.requestContext = requestContext;
  }

  private async getUserId(): Promise<string | null> {
    if (this.requestContext) {
      return this.requestContext.userId;
    }

    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user?.id || null;
  }

  private async getAccountScope(userId: string) {
    if (this.requestContext && this.requestContext.userId === userId) {
      return getMemoizedOwnedAccountScope(this.requestContext, this.client);
    }

    return getOwnedAccountScope(this.client, userId);
  }

  private async getOwnedAccountIds(userId: string): Promise<string[]> {
    const scope = await this.getAccountScope(userId);
    return scope.accountIds;
  }
  async findAll(): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('user_id', userId)
      .eq('active', true)
      .order('month_year', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain((data as any) || []);
  }

  async findById(id: string): Promise<Budget | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch budget: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data as any);
  }

  async findByCategoryId(categoryId: string): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('category_id', categoryId)
      .eq('user_id', userId)
      .eq('active', true)
      .order('month_year', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch budgets by category: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain((data as any) || []);
  }

  async findByMonthYear(monthYear: string): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('month_year', monthYear)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to fetch budgets by month: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain((data as any) || []);
  }

  async findActive(): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to fetch active budgets: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain((data as any) || []);
  }

  // Budget progress
  async getBudgetWithProgress(id: string): Promise<BudgetWithProgress | null> {
    const budget = await this.findById(id);
    if (!budget) return null;

    const spent = await this.calculateSpentAmount(
      budget.categoryId,
      budget.monthYYYYMM
    );
    return this.enrichWithProgress(budget, spent);
  }

  async getBudgetsWithProgress(
    monthYear: string
  ): Promise<BudgetWithProgress[]> {
    const budgets = await this.findByMonthYear(monthYear);
    if (budgets.length === 0) return [];

    // Optimize by getting all transactions for the month in one go if needed,
    // but for now we'll do them in parallel
    return Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.calculateSpentAmount(
          budget.categoryId,
          budget.monthYYYYMM
        );
        return this.enrichWithProgress(budget, spent);
      })
    );
  }

  private async calculateSpentAmount(
    categoryId: string,
    monthYYYYMM: string
  ): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const ownedAccountIds = await this.getOwnedAccountIds(userId);
    if (ownedAccountIds.length === 0) {
      return 0;
    }

    const monthYear = `${monthYYYYMM.substring(0, 4)}-${monthYYYYMM.substring(4)}`;
    const dateFrom = `${monthYear}-01`;
    const nextMonthDate = new Date(
      Number.parseInt(monthYYYYMM.substring(0, 4), 10),
      Number.parseInt(monthYYYYMM.substring(4), 10),
      1
    );
    const dateTo = nextMonthDate.toISOString().split('T')[0];

    const { data, error } = await this.client
      .from('transactions')
      .select('amount_base_minor')
      .eq('category_id', categoryId)
      .eq('type', 'EXPENSE')
      .in('account_id', ownedAccountIds)
      .gte('date', dateFrom)
      .lt('date', dateTo);

    if (error) {
      throw new Error(`Failed to calculate spent amount: ${error.message}`);
    }

    return (data || []).reduce(
      (sum, transaction) => sum + (transaction.amount_base_minor || 0),
      0
    );
  }

  private enrichWithProgress(
    budget: Budget,
    spentBaseMinor: number
  ): BudgetWithProgress {
    const remainingBaseMinor = budget.amountBaseMinor - spentBaseMinor;
    const percentageUsed =
      budget.amountBaseMinor > 0
        ? (spentBaseMinor / budget.amountBaseMinor) * 100
        : 0;

    return {
      ...budget,
      spentMinor: spentBaseMinor,
      spentBaseMinor,
      remainingBaseMinor,
      percentageUsed,
      isOverBudget: spentBaseMinor > budget.amountBaseMinor,
    };
  }

  async findByMonth(monthYYYYMM: string): Promise<Budget[]> {
    // Standardize to use month_year format internally
    const monthYear = `${monthYYYYMM.substring(0, 4)}-${monthYYYYMM.substring(4)}`;
    return this.findByMonthYear(monthYear);
  }

  async findByCategoryAndMonth(
    categoryId: string,
    monthYYYYMM: string
  ): Promise<Budget | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const monthYear = `${monthYYYYMM.substring(0, 4)}-${monthYYYYMM.substring(4)}`;

    const { data, error } = await this.client
      .from('budgets')
      .select(BUDGET_LIST_PROJECTION)
      .eq('category_id', categoryId)
      .eq('month_year', monthYear)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(
        `Failed to fetch budget by category and month: ${error.message}`
      );
    }

    return mapSupabaseBudgetToDomain(data as any);
  }

  async findPaginated(
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
      .select(BUDGET_LIST_PROJECTION)
      .eq('user_id', userId)
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseBudgetArrayToDomain((data as any) || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Backward compatibility
  async findWithPagination(
    params: PaginationParams
  ): Promise<PaginatedResult<Budget>> {
    return this.findPaginated(params);
  }

  async create(data: CreateBudgetDTO): Promise<Budget> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error: insertError } = await this.client.from('budgets').insert({
      user_id: userId,
      name: data.name,
      category_id: data.categoryId,
      month_year: data.monthYear,
      amount_base_minor: data.amountBaseMinor,
      spent_base_minor: 0,
      active: data.active ?? true,
    });

    if (insertError) {
      throw new Error(`Failed to create budget: ${insertError.message}`);
    }

    // Fetch the created budget to return it fully (with ID generated by DB)
    const { data: insertedData, error: fetchError } = await this.client
      .from('budgets')
      .select(BUDGET_DETAIL_PROJECTION)
      .eq('user_id', userId)
      .eq('category_id', data.categoryId)
      .eq('month_year', data.monthYear)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch created budget: ${fetchError.message}`);
    }

    return mapSupabaseBudgetToDomain(insertedData as any);
  }

  async update(id: string, updates: UpdateBudgetDTO): Promise<Budget> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const supabaseUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.categoryId !== undefined)
      supabaseUpdates.category_id = updates.categoryId;
    if (updates.monthYear !== undefined)
      supabaseUpdates.month_year = updates.monthYear;
    if (updates.amountBaseMinor !== undefined)
      supabaseUpdates.amount_base_minor = updates.amountBaseMinor;
    if (updates.active !== undefined) supabaseUpdates.active = updates.active;

    const { data, error } = await this.client
      .from('budgets')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select(BUDGET_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error(`Failed to update budget: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data as any);
  }

  async createMany(data: CreateBudgetDTO[]): Promise<Budget[]> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const inserts = data.map((item) => ({
      user_id: userId,
      name: item.name,
      category_id: item.categoryId,
      month_year: item.monthYear,
      amount_base_minor: item.amountBaseMinor,
      spent_base_minor: 0,
      active: item.active ?? true,
    }));

    const { data: insertedData, error } = await this.client
      .from('budgets')
      .insert(inserts)
      .select(BUDGET_LIST_PROJECTION);

    if (error) {
      throw new Error(`Failed to create budgets: ${error.message}`);
    }

    return mapSupabaseBudgetArrayToDomain((insertedData as any) || []);
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

  async deleteMany(ids: string[]): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client
      .from('budgets')
      .update({ active: false })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete budgets: ${error.message}`);
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

  async exists(id: string): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    const { data, error } = await this.client
      .from('budgets')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data && !error;
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
      .select(BUDGET_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error(`Failed to update budget spent amount: ${error.message}`);
    }

    return mapSupabaseBudgetToDomain(data as any);
  }

  async getMonthlyBudgetSummary(monthYear: string): Promise<{
    totalBudgetBaseMinor: number;
    totalSpentBaseMinor: number;
    totalRemainingBaseMinor: number;
    overBudgetCount: number;
    budgetsCount: number;
  }> {
    const budgetsWithProgress = await this.getBudgetsWithProgress(monthYear);

    const totalBudgetBaseMinor = budgetsWithProgress.reduce(
      (sum, b) => sum + b.amountBaseMinor,
      0
    );
    const totalSpentBaseMinor = budgetsWithProgress.reduce(
      (sum, b) => sum + b.spentBaseMinor,
      0
    );
    const totalRemainingBaseMinor = totalBudgetBaseMinor - totalSpentBaseMinor;
    const overBudgetCount = budgetsWithProgress.filter(
      (b) => b.isOverBudget
    ).length;

    return {
      totalBudgetBaseMinor,
      totalSpentBaseMinor,
      totalRemainingBaseMinor,
      overBudgetCount,
      budgetsCount: budgetsWithProgress.length,
    };
  }

  async getOverBudgetAlerts(monthYear?: string): Promise<BudgetWithProgress[]> {
    const myMonthYear = monthYear || new Date().toISOString().substring(0, 7);
    const budgets = await this.getBudgetsWithProgress(myMonthYear);
    return budgets.filter((b) => b.isOverBudget);
  }

  async getBudgetAlerts(
    monthYear: string,
    threshold: number
  ): Promise<BudgetWithProgress[]> {
    const budgets = await this.getBudgetsWithProgress(monthYear);
    return budgets.filter((b) => b.percentageUsed >= threshold);
  }

  async compareBudgets(
    monthYear1: string,
    monthYear2: string
  ): Promise<{
    month1: BudgetWithProgress[];
    month2: BudgetWithProgress[];
    comparison: {
      categoryId: string;
      categoryName: string;
      month1Budget: number;
      month2Budget: number;
      month1Spent: number;
      month2Spent: number;
      budgetChange: number;
      spentChange: number;
    }[];
  }> {
    const [month1Progress, month2Progress] = await Promise.all([
      this.getBudgetsWithProgress(monthYear1),
      this.getBudgetsWithProgress(monthYear2),
    ]);

    // This would ideally fetch category names too, but we'll use IDs for now
    // or assume the caller handles names. The contract has categoryName.
    // To get names, we'd need to fetch categories.

    const comparison = month1Progress.map((b1) => {
      const b2 = month2Progress.find((b) => b.categoryId === b1.categoryId);
      return {
        categoryId: b1.categoryId,
        categoryName: `Category ${b1.categoryId}`, // Placeholder
        month1Budget: b1.amountBaseMinor,
        month2Budget: b2?.amountBaseMinor || 0,
        month1Spent: b1.spentBaseMinor,
        month2Spent: b2?.spentBaseMinor || 0,
        budgetChange: (b2?.amountBaseMinor || 0) - b1.amountBaseMinor,
        spentChange: (b2?.spentBaseMinor || 0) - b1.spentBaseMinor,
      };
    });

    return {
      month1: month1Progress,
      month2: month2Progress,
      comparison,
    };
  }

  async copyBudgetsToNextMonth(
    fromMonthYear: string,
    toMonthYear: string
  ): Promise<Budget[]> {
    const budgets = await this.findByMonthYear(fromMonthYear);
    if (budgets.length === 0) return [];

    const results: Budget[] = [];
    for (const budget of budgets) {
      // Check if already exists in target month
      const exists = await this.budgetExists(budget.categoryId, toMonthYear);
      if (!exists) {
        const newBudget = await this.create({
          name: `Budget for ${budget.categoryId}`,
          categoryId: budget.categoryId,
          monthYear: toMonthYear,
          amountBaseMinor: budget.amountBaseMinor,
          active: true,
        });
        results.push(newBudget);
      }
    }

    return results;
  }

  async budgetExists(categoryId: string, monthYear: string): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    const { data, error } = await this.client
      .from('budgets')
      .select('id')
      .eq('category_id', categoryId)
      .eq('month_year', monthYear)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    return !!data && !error;
  }
}
