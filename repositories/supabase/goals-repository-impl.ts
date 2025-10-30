import { GoalsRepository } from '@/repositories/contracts';
import { SavingsGoal, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import { 
  mapSupabaseGoalToDomain, 
  mapDomainGoalToSupabase,
  mapSupabaseGoalArrayToDomain 
} from './mappers';

// @ts-ignore - Incomplete implementation, using LocalAppRepository instead
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
    // Stub implementation - would need proper SQL for comparing columns
    const { data, error } = await supabase
      .from('goals')
      .select('*')
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

    const { data, error } = await (supabase
      .from('goals') as any)
      .insert(supabaseGoal as any)
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

    const { data, error } = await (supabase
      .from('goals') as any)
      .update(supabaseUpdates as any)
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
    const { error } = await (supabase
      .from('goals') as any)
      .update({ active: false } as any)
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
    const { data, error } = await (supabase
      .from('goals') as any)
      .update({ 
        current_base_minor: currentBaseMinor,
        updated_at: new Date().toISOString()
      } as any)
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
    const { data, error } = await supabase
      .from('goals')
      .select('target_base_minor, current_base_minor')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch goal progress: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const row: any = data as any;
    const target = row.target_base_minor;
    const current = row.current_base_minor;
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
        .lt('current_base_minor', 999999999 /* Stub: would need proper SQL for column comparison */)
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
        .gte('current_base_minor', 999999999 /* Stub: would need proper SQL for column comparison */)
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
        .lt('current_base_minor', 999999999 /* Stub: would need proper SQL for column comparison */)
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

  async getGoalsWithProgress(): Promise<import('@/repositories/contracts').GoalWithProgress[]> {
    const goals = await this.findActive();
    return Promise.all(goals.map(goal => this.calculateGoalProgress(goal)));
  }

  async getGoalWithProgress(id: string): Promise<import('@/repositories/contracts').GoalWithProgress | null> {
    const goal = await this.findById(id);
    if (!goal) {
      return null;
    }
    return this.calculateGoalProgress(goal);
  }

  // Helper method to calculate goal progress
  private calculateGoalProgress(goal: SavingsGoal): import('@/repositories/contracts').GoalWithProgress {
    const progressPercentage = goal.targetBaseMinor > 0 
      ? Math.min((goal.currentBaseMinor / goal.targetBaseMinor) * 100, 100) 
      : 0;
    
    const remainingBaseMinor = Math.max(0, goal.targetBaseMinor - goal.currentBaseMinor);

    let daysRemaining: number | undefined;
    let isOnTrack: boolean | undefined;
    let suggestedMonthlyContribution: number | undefined;

    if (goal.targetDate) {
      const today = new Date();
      const targetDate = new Date(goal.targetDate);
      const timeDiff = targetDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysRemaining > 0) {
        const monthsRemaining = daysRemaining / 30.44; // Average days per month
        suggestedMonthlyContribution = remainingBaseMinor / monthsRemaining;
        
        // Check if on track (simplified logic)
        const createdDate = new Date(goal.createdAt);
        const daysSinceCreation = Math.max(1, Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)));
        const currentMonthlyRate = goal.currentBaseMinor / daysSinceCreation * 30.44;
        isOnTrack = currentMonthlyRate >= suggestedMonthlyContribution;
      } else {
        isOnTrack = progressPercentage >= 100;
      }
    }

    return {
      ...goal,
      progressPercentage,
      remainingBaseMinor,
      daysRemaining,
      isOnTrack,
      suggestedMonthlyContribution,
    };
  }
}
