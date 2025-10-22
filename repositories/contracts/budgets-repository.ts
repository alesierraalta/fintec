import { Budget } from '@/types';
import { BaseRepository } from './base-repository';

export interface CreateBudgetDTO {
  name: string;
  categoryId: string;
  monthYear: string; // YYYY-MM format
  amountBaseMinor: number;
  active?: boolean;
}

export interface UpdateBudgetDTO extends Partial<CreateBudgetDTO> {
  id: string;
}

export interface BudgetWithProgress extends Budget {
  spentBaseMinor: number;
  remainingBaseMinor: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

export interface BudgetsRepository extends BaseRepository<Budget, CreateBudgetDTO, UpdateBudgetDTO> {
  // Budget-specific queries
  findByMonthYear(monthYear: string): Promise<Budget[]>;
  findByCategoryId(categoryId: string): Promise<Budget[]>;
  findActive(): Promise<Budget[]>;
  
  // Budget progress
  getBudgetWithProgress(id: string): Promise<BudgetWithProgress | null>;
  getBudgetsWithProgress(monthYear: string): Promise<BudgetWithProgress[]>;
  
  // Monthly budget overview
  getMonthlyBudgetSummary(monthYear: string): Promise<{
    totalBudgetBaseMinor: number;
    totalSpentBaseMinor: number;
    totalRemainingBaseMinor: number;
    overBudgetCount: number;
    budgetsCount: number;
  }>;
  
  // Budget alerts
  getOverBudgetAlerts(monthYear?: string): Promise<BudgetWithProgress[]>;
  getBudgetAlerts(monthYear: string, threshold: number): Promise<BudgetWithProgress[]>; // threshold as percentage (0-100)
  
  // Budget comparison
  compareBudgets(monthYear1: string, monthYear2: string): Promise<{
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
  }>;
  
  // Bulk operations
  copyBudgetsToNextMonth(fromMonthYear: string, toMonthYear: string): Promise<Budget[]>;
  
  // Validation
  budgetExists(categoryId: string, monthYear: string): Promise<boolean>;
}
