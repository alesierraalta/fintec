import {
  GoalAnalytics,
  GoalContribution,
  GoalContributionHistoryEntry,
  SavingsGoal,
  PaginatedResult,
  PaginationParams,
} from '@/types';
import {
  GoalsRepository,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalWithProgress,
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
      id,
      updatedAt: new Date().toISOString(),
    };

    await db.goals.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.goals.delete(id);
    await db.goalContributions.where('goalId').equals(id).delete();
  }

  async createMany(data: CreateGoalDTO[]): Promise<SavingsGoal[]> {
    const now = new Date().toISOString();
    const goals: SavingsGoal[] = data.map((item) => ({
      id: generateId('goal'),
      name: item.name,
      description: item.description,
      targetBaseMinor: item.targetBaseMinor,
      currentBaseMinor: 0,
      targetDate: item.targetDate,
      accountId: item.accountId,
      active: item.active ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    await db.goals.bulkAdd(goals);
    return goals;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.goals.bulkDelete(ids);
    await Promise.all(
      ids.map((id) => db.goalContributions.where('goalId').equals(id).delete())
    );
  }

  async findPaginated(
    params: PaginationParams
  ): Promise<PaginatedResult<SavingsGoal>> {
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

  async findActive(): Promise<SavingsGoal[]> {
    return db.goals.where('active').equals(1).toArray();
  }

  async findByAccountId(accountId: string): Promise<SavingsGoal[]> {
    return db.goals.where('accountId').equals(accountId).toArray();
  }

  async findByTargetDateRange(
    startDate: string,
    endDate: string
  ): Promise<SavingsGoal[]> {
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
    return Promise.all(goals.map((goal) => this.calculateGoalProgress(goal)));
  }

  async addContribution(
    goalId: string,
    amountBaseMinor: number,
    note?: string
  ): Promise<SavingsGoal> {
    this.assertPositiveAmount(amountBaseMinor);

    const goal = await this.getManualGoal(goalId);
    await db.goalContributions.add({
      id: generateId('goalc'),
      goalId,
      deltaBaseMinor: amountBaseMinor,
      note,
      source: 'manual',
      createdAt: new Date().toISOString(),
    });

    return this.recomputeManualGoal(goal.id);
  }

  async removeContribution(
    goalId: string,
    amountBaseMinor: number,
    note?: string
  ): Promise<SavingsGoal> {
    this.assertPositiveAmount(amountBaseMinor);

    const goal = await this.getManualGoal(goalId);
    if (goal.currentBaseMinor < amountBaseMinor) {
      throw new Error('Cannot remove more than the currently saved amount');
    }

    await db.goalContributions.add({
      id: generateId('goalc'),
      goalId,
      deltaBaseMinor: -amountBaseMinor,
      note,
      source: 'manual',
      createdAt: new Date().toISOString(),
    });

    return this.recomputeManualGoal(goal.id);
  }

  async getGoalAnalytics(goalId: string): Promise<GoalAnalytics> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

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

    const contributions = await this.getGoalContributionRows(goalId);
    const totalContributions = contributions.reduce(
      (sum, contribution) => sum + contribution.deltaBaseMinor,
      0
    );
    const averageMonthlyContribution =
      this.calculateAverageMonthlyContribution(contributions);

    return {
      totalContributions,
      averageMonthlyContribution,
      contributionHistory: contributions.map((contribution) =>
        this.mapContributionToHistoryEntry(contribution)
      ),
      projectedCompletionDate: this.calculateProjectedCompletionDate(
        goal,
        totalContributions,
        averageMonthlyContribution
      ),
      progressSource: 'manual_ledger',
    };
  }

  async updateGoalProgress(goalId?: string): Promise<void> {
    if (goalId) {
      const goal = await this.findById(goalId);
      if (!goal?.accountId) {
        return;
      }

      const account = await db.accounts.get(goal.accountId);
      if (!account) {
        return;
      }

      await this.update(goal.id, {
        id: goal.id,
        currentBaseMinor: Math.max(0, account.balance),
      });
      return;
    }

    const goalsWithAccounts = await db.goals
      .filter((goal) => goal.accountId !== undefined)
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
      .and((goal) => goal.active)
      .toArray();

    return Promise.all(goals.map((goal) => this.calculateGoalProgress(goal)));
  }

  async getOffTrackGoals(): Promise<GoalWithProgress[]> {
    const goals = await this.getGoalsWithProgress();
    return goals.filter((goal) => goal.isOnTrack === false);
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
    const activeGoals = allGoals.filter((goal) => goal.active);
    const completedGoals = allGoals.filter(
      (goal) => goal.currentBaseMinor >= goal.targetBaseMinor
    );

    const totalTargetBaseMinor = activeGoals.reduce(
      (sum, goal) => sum + goal.targetBaseMinor,
      0
    );
    const totalSavedBaseMinor = activeGoals.reduce(
      (sum, goal) => sum + goal.currentBaseMinor,
      0
    );

    const averageProgress =
      totalTargetBaseMinor > 0
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
      .and(
        (goal) => goal.currentBaseMinor >= goal.targetBaseMinor && goal.active
      )
      .toArray();

    for (const goal of completedGoals) {
      await this.update(goal.id, { id: goal.id, active: false });
    }

    return completedGoals.length;
  }

  private assertPositiveAmount(amountBaseMinor: number): void {
    if (!Number.isInteger(amountBaseMinor) || amountBaseMinor <= 0) {
      throw new Error(
        'Contribution amount must be a positive integer in minor units'
      );
    }
  }

  private async getManualGoal(goalId: string): Promise<SavingsGoal> {
    const goal = await this.findById(goalId);
    if (!goal) {
      throw new Error(`Goal with id ${goalId} not found`);
    }

    if (goal.accountId) {
      throw new Error(
        'Linked-account goals derive progress from the linked account balance and do not accept manual contributions'
      );
    }

    return goal;
  }

  private async getGoalContributionRows(
    goalId: string
  ): Promise<GoalContribution[]> {
    const rows = await db.goalContributions
      .where('goalId')
      .equals(goalId)
      .toArray();
    return rows.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  private mapContributionToHistoryEntry(
    contribution: GoalContribution
  ): GoalContributionHistoryEntry {
    return {
      id: contribution.id,
      date: contribution.createdAt,
      amountBaseMinor: contribution.deltaBaseMinor,
      note: contribution.note,
      source: contribution.source,
    };
  }

  private calculateAverageMonthlyContribution(
    contributions: GoalContribution[]
  ): number {
    if (contributions.length === 0) {
      return 0;
    }

    const totalsByMonth = new Map<string, number>();
    for (const contribution of contributions) {
      const monthKey = contribution.createdAt.slice(0, 7);
      totalsByMonth.set(
        monthKey,
        (totalsByMonth.get(monthKey) ?? 0) + contribution.deltaBaseMinor
      );
    }

    const total = Array.from(totalsByMonth.values()).reduce(
      (sum, value) => sum + value,
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

  private async recomputeManualGoal(goalId: string): Promise<SavingsGoal> {
    const contributions = await this.getGoalContributionRows(goalId);
    const netTotal = contributions.reduce(
      (sum, contribution) => sum + contribution.deltaBaseMinor,
      0
    );

    if (netTotal < 0) {
      throw new Error('Goal contributions cannot result in a negative balance');
    }

    return this.update(goalId, {
      id: goalId,
      currentBaseMinor: netTotal,
    });
  }

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
      daysRemaining = dateDifference(getCurrentDate(), goal.targetDate, 'days');

      if (daysRemaining > 0) {
        const monthsRemaining = daysRemaining / 30.44;
        suggestedMonthlyContribution = remainingBaseMinor / monthsRemaining;

        const currentMonthlyRate =
          (goal.currentBaseMinor /
            Math.max(
              dateDifference(goal.createdAt, getCurrentDate(), 'days'),
              1
            )) *
          30.44;
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
