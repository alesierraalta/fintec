import { SavingsGoal, PaginatedResult, PaginationParams } from '@/types';
import { 
  GoalsRepository, 
  CreateGoalDTO, 
  UpdateGoalDTO, 
  GoalWithProgress 
} from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';
import { dateDifference, getCurrentDate } from '@/lib/dates';

export class LocalGoalsRepository implements GoalsRepository {
  async findById(id: string): Promise<SavingsGoal | null> {
    return (await db.goals.get(id)) || null;
  }

  async findAll(): Promise<SavingsGoal[]> {
    return db.goals.orderBy('createdAt').reverse().toArray();
  }

  async create(data: CreateGoalDTO): Promise<SavingsGoal> {
    const goal: SavingsGoal = {
      id: generateId('goal'),
      name: data.name,
      description: data.description,
      targetBaseMinor: data.targetBaseMinor,
      currentBaseMinor: 0,
      targetDate: data.targetDate,
      accountId: data.accountId,
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.goals.add(goal);
    return goal;
  }

  async update(id: string, data: UpdateGoalDTO): Promise<SavingsGoal> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Goal with id ${id} not found`);
    }

    const updated: SavingsGoal = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db.goals.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.goals.delete(id);
  }

  async createMany(data: CreateGoalDTO[]): Promise<SavingsGoal[]> {
    const goals: SavingsGoal[] = data.map(item => ({
      id: generateId('goal'),
      name: item.name,
      description: item.description,
      targetBaseMinor: item.targetBaseMinor,
      currentBaseMinor: 0,
      targetDate: item.targetDate,
      accountId: item.accountId,
      active: item.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.goals.bulkAdd(goals);
    return goals;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.goals.bulkDelete(ids);
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<SavingsGoal>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = db.goals.orderBy(sortBy as keyof SavingsGoal);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.goals.count();
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
    return db.goals.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.goals.get(id)) !== undefined;
  }

  // Goal-specific methods
  async findActive(): Promise<SavingsGoal[]> {
    return db.goals.where('active').equals(1).toArray();
  }

  async findByAccountId(accountId: string): Promise<SavingsGoal[]> {
    return db.goals.where('accountId').equals(accountId).toArray();
  }

  async findByTargetDateRange(startDate: string, endDate: string): Promise<SavingsGoal[]> {
    return db.goals
      .where('targetDate')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async getGoalWithProgress(id: string): Promise<GoalWithProgress | null> {
    const goal = await this.findById(id);
    if (!goal) {
      return null;
    }

    return this.calculateGoalProgress(goal);
  }

  async getGoalsWithProgress(): Promise<GoalWithProgress[]> {
    const goals = await this.findActive();
    return Promise.all(goals.map(goal => this.calculateGoalProgress(goal)));
  }

  async addContribution(goalId: string, amountBaseMinor: number, note?: string): Promise<SavingsGoal> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

    const newCurrentAmount = goal.currentBaseMinor + amountBaseMinor;
    
    // TODO: Log contribution history in a separate table
    // For now, we'll just update the current amount
    
    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: newCurrentAmount,
    });
  }

  async removeContribution(goalId: string, amountBaseMinor: number, note?: string): Promise<SavingsGoal> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

    const newCurrentAmount = Math.max(0, goal.currentBaseMinor - amountBaseMinor);
    
    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: newCurrentAmount,
    });
  }

  async getGoalAnalytics(goalId: string): Promise<{
    totalContributions: number;
    averageMonthlyContribution: number;
    contributionHistory: {
      date: string;
      amountBaseMinor: number;
      note?: string;
    }[];
    projectedCompletionDate?: string;
  }> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

    // TODO: Implement contribution history tracking
    // For now, return basic analytics based on current progress
    const totalContributions = goal.currentBaseMinor;
    const monthsSinceCreation = dateDifference(goal.createdAt, getCurrentDate(), 'months') || 1;
    const averageMonthlyContribution = totalContributions / monthsSinceCreation;

    // Calculate projected completion date
    let projectedCompletionDate: string | undefined;
    if (averageMonthlyContribution > 0) {
      const remainingAmount = goal.targetBaseMinor - goal.currentBaseMinor;
      const monthsToCompletion = Math.ceil(remainingAmount / averageMonthlyContribution);
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + monthsToCompletion);
      projectedCompletionDate = projectedDate.toISOString();
    }

    return {
      totalContributions,
      averageMonthlyContribution,
      contributionHistory: [], // TODO: Implement contribution history
      projectedCompletionDate,
    };
  }

  async updateGoalProgress(): Promise<void> {
    // Update goals based on linked account balances
    const goalsWithAccounts = await db.goals
      .filter(goal => goal.accountId !== undefined)
      .toArray();

    for (const goal of goalsWithAccounts) {
      if (!goal.accountId) continue;

      const account = await db.accounts.get(goal.accountId);
      if (account) {
        await this.update(goal.id, {
          id: goal.id,
          currentBaseMinor: Math.max(0, account.balance),
        });
      }
    }
  }

  async getGoalsNearingDeadline(days: number): Promise<GoalWithProgress[]> {
    const currentDate = getCurrentDate();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const goals = await db.goals
      .where('targetDate')
      .between(currentDate, futureDate.toISOString(), true, true)
      .and(goal => goal.active)
      .toArray();

    return Promise.all(goals.map(goal => this.calculateGoalProgress(goal)));
  }

  async getOffTrackGoals(): Promise<GoalWithProgress[]> {
    const goals = await this.getGoalsWithProgress();
    return goals.filter(goal => goal.isOnTrack === false);
  }

  async getGoalsSummary(): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetBaseMinor: number;
    totalSavedBaseMinor: number;
    averageProgress: number;
  }> {
    const allGoals = await this.findAll();
    const activeGoals = allGoals.filter(goal => goal.active);
    const completedGoals = allGoals.filter(goal => goal.currentBaseMinor >= goal.targetBaseMinor);

    const totalTargetBaseMinor = activeGoals.reduce((sum, goal) => sum + goal.targetBaseMinor, 0);
    const totalSavedBaseMinor = activeGoals.reduce((sum, goal) => sum + goal.currentBaseMinor, 0);
    
    const averageProgress = totalTargetBaseMinor > 0 
      ? (totalSavedBaseMinor / totalTargetBaseMinor) * 100 
      : 0;

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      totalTargetBaseMinor,
      totalSavedBaseMinor,
      averageProgress,
    };
  }

  async markGoalAsCompleted(goalId: string): Promise<SavingsGoal> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: goal.targetBaseMinor,
      active: false,
    });
  }

  async archiveCompletedGoals(): Promise<number> {
    const completedGoals = await db.goals
      .where('currentBaseMinor')
      .aboveOrEqual(0)
      .and(goal => goal.currentBaseMinor >= goal.targetBaseMinor && goal.active)
      .toArray();

    for (const goal of completedGoals) {
      await this.update(goal.id, { id: goal.id, active: false });
    }

    return completedGoals.length;
  }

  // Helper method to calculate goal progress
  private calculateGoalProgress(goal: SavingsGoal): GoalWithProgress {
    const progressPercentage = goal.targetBaseMinor > 0 
      ? Math.min((goal.currentBaseMinor / goal.targetBaseMinor) * 100, 100) 
      : 0;
    
    const remainingBaseMinor = Math.max(0, goal.targetBaseMinor - goal.currentBaseMinor);

    let daysRemaining: number | undefined;
    let isOnTrack: boolean | undefined;
    let suggestedMonthlyContribution: number | undefined;

    if (goal.targetDate) {
      daysRemaining = dateDifference(getCurrentDate(), goal.targetDate, 'days');
      
      if (daysRemaining > 0) {
        const monthsRemaining = daysRemaining / 30.44; // Average days per month
        suggestedMonthlyContribution = remainingBaseMinor / monthsRemaining;
        
        // Check if on track (simplified logic)
        const currentMonthlyRate = goal.currentBaseMinor / dateDifference(goal.createdAt, getCurrentDate(), 'days') * 30.44;
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
