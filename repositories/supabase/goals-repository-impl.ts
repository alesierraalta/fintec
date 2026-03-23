import {
  GoalsRepository,
  GoalWithProgress,
  CreateGoalDTO,
  UpdateGoalDTO,
} from '@/repositories/contracts';
import {
  GoalAnalytics,
  GoalContributionHistoryEntry,
  PaginationParams,
  PaginatedResult,
  SavingsGoal,
} from '@/types';
import { supabase } from './client';
import {
  mapSupabaseGoalToDomain,
  mapSupabaseGoalArrayToDomain,
} from './mappers';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseGoalsRepository implements GoalsRepository {
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

  private assertPositiveAmount(amountBaseMinor: number): void {
    if (!Number.isInteger(amountBaseMinor) || amountBaseMinor <= 0) {
      throw new Error(
        'Contribution amount must be a positive integer in minor units'
      );
    }
  }

  private async listGoalContributionRows(goalId: string): Promise<
    Array<{
      id: string;
      goal_id: string;
      user_id: string;
      delta_base_minor: number;
      note: string | null;
      source: string | null;
      related_transaction_id: string | null;
      created_at: string;
    }>
  > {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { data, error } = await this.client
      .from('goal_contributions')
      .select(
        'id, goal_id, user_id, delta_base_minor, note, source, related_transaction_id, created_at'
      )
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goal contributions: ${error.message}`);
    }

    return data || [];
  }

  private mapContributionHistoryEntry(row: {
    id: string;
    delta_base_minor: number;
    note: string | null;
    source: string | null;
    created_at: string;
  }): GoalContributionHistoryEntry {
    return {
      id: row.id,
      date: row.created_at,
      amountBaseMinor: row.delta_base_minor,
      note: row.note ?? undefined,
      source: row.source ?? undefined,
    };
  }

  private calculateAverageMonthlyContribution(
    rows: Array<{ created_at: string; delta_base_minor: number }>
  ): number {
    if (rows.length === 0) {
      return 0;
    }

    const totalsByMonth = new Map<string, number>();
    for (const row of rows) {
      const monthKey = row.created_at.slice(0, 7);
      totalsByMonth.set(
        monthKey,
        (totalsByMonth.get(monthKey) ?? 0) + row.delta_base_minor
      );
    }

    const total = Array.from(totalsByMonth.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return totalsByMonth.size > 0 ? total / totalsByMonth.size : 0;
  }

  private calculateProjectedCompletionDate(
    goal: SavingsGoal,
    totalContributions: number,
    averageMonthlyContribution: number
  ): string | undefined {
    if (averageMonthlyContribution <= 0) {
      return undefined;
    }

    const remainingAmount = goal.targetBaseMinor - totalContributions;
    if (remainingAmount <= 0) {
      return new Date().toISOString();
    }

    const monthsToCompletion = Math.ceil(
      remainingAmount / averageMonthlyContribution
    );
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsToCompletion);
    return projectedDate.toISOString();
  }

  private async recomputeManualGoalTotal(goalId: string): Promise<SavingsGoal> {
    const rows = await this.listGoalContributionRows(goalId);
    const totalContributions = rows.reduce(
      (sum, row) => sum + row.delta_base_minor,
      0
    );

    if (totalContributions < 0) {
      throw new Error('Goal contributions cannot result in a negative balance');
    }

    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: totalContributions,
    });
  }

  private async getLinkedGoalsForRefresh(
    goalId?: string
  ): Promise<Array<{ id: string; account_id: string }>> {
    const userId = await this.getUserId();
    if (!userId) {
      return [];
    }

    if (goalId) {
      const goal = await this.findById(goalId);
      if (!goal?.accountId || !goal.active) {
        return [];
      }

      return [{ id: goal.id, account_id: goal.accountId }];
    }

    const { data, error } = await this.client
      .from('goals')
      .select('id, account_id')
      .eq('user_id', userId)
      .eq('active', true)
      .not('account_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch linked goals: ${error.message}`);
    }

    return (data || []).filter(
      (goal): goal is { id: string; account_id: string } =>
        typeof goal.account_id === 'string'
    );
  }

  async findAll(): Promise<SavingsGoal[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findById(id: string): Promise<SavingsGoal | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
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
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch goals by account: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findActive(): Promise<SavingsGoal[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findCompleted(): Promise<SavingsGoal[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to fetch completed goals: ${error.message}`);
    }

    const goals = mapSupabaseGoalArrayToDomain(data || []);
    return goals.filter((g) => g.currentBaseMinor >= g.targetBaseMinor);
  }

  async findByTargetDateRange(
    startDate: string,
    endDate: string
  ): Promise<SavingsGoal[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .eq('user_id', userId)
      .eq('active', true)
      .order('target_date', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch goals by target date range: ${error.message}`
      );
    }

    return mapSupabaseGoalArrayToDomain(data || []);
  }

  async findPaginated(
    params: PaginationParams
  ): Promise<PaginatedResult<SavingsGoal>> {
    const { page, limit, sortBy = 'target_date', sortOrder = 'asc' } = params;
    const offset = (page - 1) * limit;
    const userId = await this.getUserId();
    if (!userId) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Get total count
    const { count, error: countError } = await this.client
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if (countError) {
      throw new Error(`Failed to count goals: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order(sortBy, { ascending: sortOrder === 'asc' })
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

  async create(data: CreateGoalDTO): Promise<SavingsGoal> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { data: insertedData, error } = await this.client
      .from('goals')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description,
        target_base_minor: data.targetBaseMinor,
        current_base_minor: 0, // Goals always start at 0
        target_date: data.targetDate,
        account_id: data.accountId,
        active: data.active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(insertedData);
  }

  async createMany(data: CreateGoalDTO[]): Promise<SavingsGoal[]> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const inserts = data.map((item) => ({
      user_id: userId,
      name: item.name,
      description: item.description,
      target_base_minor: item.targetBaseMinor,
      current_base_minor: 0,
      target_date: item.targetDate,
      account_id: item.accountId,
      active: item.active ?? true,
    }));

    const { data: insertedData, error } = await this.client
      .from('goals')
      .insert(inserts)
      .select();

    if (error) {
      throw new Error(`Failed to create goals: ${error.message}`);
    }

    return mapSupabaseGoalArrayToDomain(insertedData || []);
  }

  async update(id: string, updates: UpdateGoalDTO): Promise<SavingsGoal> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const supabaseUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.description !== undefined)
      supabaseUpdates.description = updates.description;
    if (updates.targetBaseMinor !== undefined)
      supabaseUpdates.target_base_minor = updates.targetBaseMinor;
    if (updates.currentBaseMinor !== undefined)
      supabaseUpdates.current_base_minor = updates.currentBaseMinor;
    if (updates.targetDate !== undefined)
      supabaseUpdates.target_date = updates.targetDate;
    if (updates.accountId !== undefined)
      supabaseUpdates.account_id = updates.accountId;
    if (updates.active !== undefined) supabaseUpdates.active = updates.active;

    const { data, error } = await this.client
      .from('goals')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    return mapSupabaseGoalToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client
      .from('goals')
      .update({ active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client
      .from('goals')
      .update({ active: false })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete goals: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    const { count, error } = await this.client
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to count goals: ${error.message}`);
    }

    return count || 0;
  }

  async exists(id: string): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    const { data, error } = await this.client
      .from('goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data && !error;
  }

  // Goal Progress methods
  async getGoalWithProgress(id: string): Promise<GoalWithProgress | null> {
    const goal = await this.findById(id);
    if (!goal) return null;
    return this.calculateGoalProgress(goal);
  }

  async getGoalsWithProgress(): Promise<GoalWithProgress[]> {
    const goals = await this.findActive();
    return Promise.all(goals.map((goal) => this.calculateGoalProgress(goal)));
  }

  // Contributions
  async addContribution(
    goalId: string,
    amountBaseMinor: number,
    note?: string
  ): Promise<SavingsGoal> {
    this.assertPositiveAmount(amountBaseMinor);

    const goal = await this.findById(goalId);
    if (!goal) throw new Error('Goal not found');
    if (goal.accountId) {
      throw new Error(
        'Linked-account goals derive progress from the linked account balance and do not accept manual contributions'
      );
    }

    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client.from('goal_contributions').insert({
      goal_id: goalId,
      user_id: userId,
      delta_base_minor: amountBaseMinor,
      note: note ?? null,
      source: 'manual',
      related_transaction_id: null,
    });

    if (error) {
      throw new Error(`Failed to add goal contribution: ${error.message}`);
    }

    return this.recomputeManualGoalTotal(goalId);
  }

  async removeContribution(
    goalId: string,
    amountBaseMinor: number,
    note?: string
  ): Promise<SavingsGoal> {
    this.assertPositiveAmount(amountBaseMinor);

    const goal = await this.findById(goalId);
    if (!goal) throw new Error('Goal not found');
    if (goal.accountId) {
      throw new Error(
        'Linked-account goals derive progress from the linked account balance and do not accept manual contributions'
      );
    }
    if (goal.currentBaseMinor < amountBaseMinor) {
      throw new Error('Cannot remove more than the currently saved amount');
    }

    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await this.client.from('goal_contributions').insert({
      goal_id: goalId,
      user_id: userId,
      delta_base_minor: -amountBaseMinor,
      note: note ?? null,
      source: 'manual',
      related_transaction_id: null,
    });

    if (error) {
      throw new Error(`Failed to remove goal contribution: ${error.message}`);
    }

    return this.recomputeManualGoalTotal(goalId);
  }

  // Analytics
  async getGoalAnalytics(goalId: string): Promise<GoalAnalytics> {
    const goal = await this.findById(goalId);
    if (!goal) throw new Error('Goal not found');

    if (goal.accountId) {
      return {
        totalContributions: goal.currentBaseMinor,
        averageMonthlyContribution: 0,
        contributionHistory: [],
        projectedCompletionDate: undefined,
        progressSource: 'linked_account',
        message:
          'El progreso de esta meta se calcula desde el saldo de la cuenta vinculada.',
      };
    }

    const rows = await this.listGoalContributionRows(goalId);
    const totalContributions = rows.reduce(
      (sum, row) => sum + row.delta_base_minor,
      0
    );
    const averageMonthlyContribution =
      this.calculateAverageMonthlyContribution(rows);

    return {
      totalContributions,
      averageMonthlyContribution,
      contributionHistory: rows.map((row) =>
        this.mapContributionHistoryEntry(row)
      ),
      projectedCompletionDate: this.calculateProjectedCompletionDate(
        goal,
        totalContributions,
        averageMonthlyContribution
      ),
      progressSource: 'manual_ledger',
    };
  }

  // Tracking
  async updateGoalProgress(goalId?: string): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) return;

    const goals = await this.getLinkedGoalsForRefresh(goalId);
    if (goals.length === 0) {
      return;
    }

    const accountIds = Array.from(
      new Set(goals.map((goal) => goal.account_id))
    );
    const { data: accounts, error: accountsError } = await this.client
      .from('accounts')
      .select('id, balance')
      .in('id', accountIds)
      .eq('user_id', userId);

    if (accountsError) {
      throw new Error(
        `Failed to fetch linked account balances: ${accountsError.message}`
      );
    }

    const balancesByAccountId = new Map(
      (accounts || []).map((account) => [
        account.id,
        Math.max(0, account.balance ?? 0),
      ])
    );

    for (const goal of goals) {
      const balance = balancesByAccountId.get(goal.account_id);
      if (balance === undefined) {
        continue;
      }

      const { error } = await this.client
        .from('goals')
        .update({
          current_base_minor: balance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)
        .eq('user_id', userId);

      if (error) {
        throw new Error(
          `Failed to update linked goal progress: ${error.message}`
        );
      }
    }
  }

  // Alerts
  async getGoalsNearingDeadline(days: number): Promise<GoalWithProgress[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    const today = new Date();
    const deadlineDate = new Date();
    deadlineDate.setDate(today.getDate() + days);

    const { data, error } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .gte('target_date', today.toISOString().split('T')[0])
      .lte('target_date', deadlineDate.toISOString().split('T')[0]);

    if (error) return [];

    const goals = mapSupabaseGoalArrayToDomain(data || []);
    return Promise.all(goals.map((goal) => this.calculateGoalProgress(goal)));
  }

  async getOffTrackGoals(): Promise<GoalWithProgress[]> {
    const goalsWithProgress = await this.getGoalsWithProgress();
    return goalsWithProgress.filter(
      (g) => g.active && !g.isOnTrack && g.currentBaseMinor < g.targetBaseMinor
    );
  }

  // Statistics
  async getGoalsSummary(): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetBaseMinor: number;
    totalSavedBaseMinor: number;
    averageProgress: number;
  }> {
    const userId = await this.getUserId();
    if (!userId) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTargetBaseMinor: 0,
        totalSavedBaseMinor: 0,
        averageProgress: 0,
      };
    }

    const { data, error } = await this.client
      .from('goals')
      .select('target_base_minor, current_base_minor, active')
      .eq('user_id', userId);

    if (error || !data) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTargetBaseMinor: 0,
        totalSavedBaseMinor: 0,
        averageProgress: 0,
      };
    }

    let activeGoals = 0;
    let completedGoals = 0;
    let totalTarget = 0;
    let totalSaved = 0;
    let progressSum = 0;

    data.forEach((row: any) => {
      if (row.active) {
        activeGoals++;
        totalTarget += row.target_base_minor;
        totalSaved += row.current_base_minor;
        const progress =
          row.target_base_minor > 0
            ? Math.min(
                (row.current_base_minor / row.target_base_minor) * 100,
                100
              )
            : 0;
        progressSum += progress;

        if (row.current_base_minor >= row.target_base_minor) {
          completedGoals++;
        }
      }
    });

    return {
      totalGoals: data.length,
      activeGoals,
      completedGoals,
      totalTargetBaseMinor: totalTarget,
      totalSavedBaseMinor: totalSaved,
      averageProgress: activeGoals > 0 ? progressSum / activeGoals : 0,
    };
  }

  // Bulk operations
  async markGoalAsCompleted(goalId: string): Promise<SavingsGoal> {
    const goal = await this.findById(goalId);
    if (!goal) throw new Error('Goal not found');

    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: goal.targetBaseMinor,
    });
  }

  async archiveCompletedGoals(): Promise<number> {
    const userId = await this.getUserId();
    if (!userId) return 0;

    // Fetch all goals where current >= target and active
    const { data, error } = await this.client
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true)
      .filter('current_base_minor', 'gte', 'target_base_minor'); // This might not work if target is dynamic, let's just fetch all and filter in JS

    if (error || !data) return 0;

    // Actually we need to fetch all and check in JS because we can't compare two columns easily in a simple filter with JS client
    const { data: allActive, error: fetchError } = await this.client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (fetchError || !allActive) return 0;

    const toArchive = allActive
      .filter((g) => g.current_base_minor >= g.target_base_minor)
      .map((g) => g.id);

    if (toArchive.length === 0) return 0;

    const { error: archiveError } = await this.client
      .from('goals')
      .update({ active: false })
      .in('id', toArchive)
      .eq('user_id', userId);

    if (archiveError)
      throw new Error(`Failed to archive goals: ${archiveError.message}`);

    return toArchive.length;
  }

  // Helper method to calculate goal progress
  private calculateGoalProgress(goal: SavingsGoal): GoalWithProgress {
    const progressPercentage =
      goal.targetBaseMinor > 0
        ? Math.min((goal.currentBaseMinor / goal.targetBaseMinor) * 100, 100)
        : 0;

    const remainingBaseMinor = Math.max(
      0,
      goal.targetBaseMinor - goal.currentBaseMinor
    );

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
        const daysSinceCreation = Math.max(
          1,
          Math.ceil(
            (today.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)
          )
        );
        const currentMonthlyRate =
          (goal.currentBaseMinor / daysSinceCreation) * 30.44;
        isOnTrack = currentMonthlyRate >= suggestedMonthlyContribution * 0.9; // 10% tolerance
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
