import { GoalsRepository } from '@/repositories/contracts';
import { SavingsGoal, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import { 
  mapSupabaseGoalToDomain, 
  mapDomainGoalToSupabase,
  mapSupabaseGoalArrayToDomain 
} from './mappers';

export class SupabaseGoalsRepository implements GoalsRepository {
  async findAll(): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findById(id: string): Promise<SavingsGoal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch goal: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(data);
  }

  async findByAccountId(accountId: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('account_id', accountId)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch goals by account: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findActive(): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findCompleted(): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .gte('current_base_minor', supabase.raw('target_base_minor'))
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch completed goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findByTargetDateRange(startDate: string, endDate: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch goals by target date range: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findWithPagination(params: PaginationParams): Promise<PaginatedResult<SavingsGoal>> {
    const { page, limit, sortBy = 'target_date', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (countError) {
      throw new Error(`Failed to count goals: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .order('name', { ascending: true }) // Secondary sort
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseGoalArrayToDomain(data || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingsGoal> {
    const supabaseGoal = mapDomainGoalToSupabase(goal);

    const { data, error } = await supabase
      .from('goals')
      .insert(supabaseGoal)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(data);
  }

  async update(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const supabaseUpdates = mapDomainGoalToSupabase({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('goals')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(data);
  }

  async delete(id: string): Promise<void> {
    // Soft delete by setting active to false
    const { error } = await supabase
      .from('goals')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete goal: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count goals: ${error.message}`);
    }

    return count || 0;
  }

  async updateProgress(id: string, currentBaseMinor: number): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from('goals')
      .update({ 
        current_base_minor: currentBaseMinor,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal progress: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(data);
  }

  async getGoalProgress(id: string): Promise<{
    target: number;
    current: number;
    remaining: number;
    percentageComplete: number;
    isCompleted: boolean;
  } | null> {
    const goal = await this.findById(id);
    
    if (!goal) {
      return null;
    }

    const target = goal.targetBaseMinor;
    const current = goal.currentBaseMinor;
    const remaining = Math.max(0, target - current);
    const percentageComplete = target > 0 ? (current / target) * 100 : 0;
    const isCompleted = current >= target;

    return {
      target,
      current,
      remaining,
      percentageComplete: Math.min(100, Math.max(0, percentageComplete)),
      isCompleted,
    };
  }

  async getGoalsByStatus(): Promise<{
    active: SavingsGoal[];
    completed: SavingsGoal[];
    overdue: SavingsGoal[];
  }> {
    const today = new Date().toISOString().split('T')[0];

    const [activeGoals, completedGoals, overdueGoals] = await Promise.all([
      // Active goals (not completed, not overdue)
      supabase
        .from('goals')
        .select('*')
        .eq('active', true)
        .lt('current_base_minor', supabase.raw('target_base_minor'))
        .or(`target_date.is.null,target_date.gte.${today}`)
        .order('target_date', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to fetch active goals: ${error.message}`);
          return mapSupabaseGoalArrayToDomain(data || []);
        }),

      // Completed goals
      supabase
        .from('goals')
        .select('*')
        .eq('active', true)
        .gte('current_base_minor', supabase.raw('target_base_minor'))
        .order('target_date', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to fetch completed goals: ${error.message}`);
          return mapSupabaseGoalArrayToDomain(data || []);
        }),

      // Overdue goals (not completed and past target date)
      supabase
        .from('goals')
        .select('*')
        .eq('active', true)
        .lt('current_base_minor', supabase.raw('target_base_minor'))
        .not('target_date', 'is', null)
        .lt('target_date', today)
        .order('target_date', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw new Error(`Failed to fetch overdue goals: ${error.message}`);
          return mapSupabaseGoalArrayToDomain(data || []);
        })
    ]);

    return {
      active: activeGoals,
      completed: completedGoals,
      overdue: overdueGoals,
    };
  }

  async search(query: string): Promise<SavingsGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to search goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }
}
