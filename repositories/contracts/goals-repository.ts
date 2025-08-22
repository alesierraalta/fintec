import { SavingsGoal } from '@/types';
import { BaseRepository } from './base-repository';

export interface CreateGoalDTO {
  name: string;
  description?: string;
  targetBaseMinor: number;
  targetDate?: string;
  accountId?: string;
  active?: boolean;
}

export interface UpdateGoalDTO extends Partial<CreateGoalDTO> {
  id: string;
  currentBaseMinor?: number;
}

export interface GoalWithProgress extends SavingsGoal {
  progressPercentage: number;
  remainingBaseMinor: number;
  daysRemaining?: number;
  isOnTrack?: boolean;
  suggestedMonthlyContribution?: number;
}

export interface GoalsRepository extends BaseRepository<SavingsGoal, CreateGoalDTO, UpdateGoalDTO> {
  // Goal-specific queries
  findActive(): Promise<SavingsGoal[]>;
  findByAccountId(accountId: string): Promise<SavingsGoal[]>;
  findByTargetDateRange(startDate: string, endDate: string): Promise<SavingsGoal[]>;
  
  // Goal progress
  getGoalWithProgress(id: string): Promise<GoalWithProgress | null>;
  getGoalsWithProgress(): Promise<GoalWithProgress[]>;
  
  // Goal contributions
  addContribution(goalId: string, amountBaseMinor: number, note?: string): Promise<SavingsGoal>;
  removeContribution(goalId: string, amountBaseMinor: number, note?: string): Promise<SavingsGoal>;
  
  // Goal analytics
  getGoalAnalytics(goalId: string): Promise<{
    totalContributions: number;
    averageMonthlyContribution: number;
    contributionHistory: {
      date: string;
      amountBaseMinor: number;
      note?: string;
    }[];
    projectedCompletionDate?: string;
  }>;
  
  // Goal tracking
  updateGoalProgress(): Promise<void>; // Recalculate all goal progress based on linked accounts
  
  // Goal alerts
  getGoalsNearingDeadline(days: number): Promise<GoalWithProgress[]>;
  getOffTrackGoals(): Promise<GoalWithProgress[]>;
  
  // Goal statistics
  getGoalsSummary(): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetBaseMinor: number;
    totalSavedBaseMinor: number;
    averageProgress: number;
  }>;
  
  // Bulk operations
  markGoalAsCompleted(goalId: string): Promise<SavingsGoal>;
  archiveCompletedGoals(): Promise<number>; // Returns count of archived goals
}
