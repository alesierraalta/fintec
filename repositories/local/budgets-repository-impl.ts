import { Budget, PaginatedResult, PaginationParams } from '@/types';
import { 
  BudgetsRepository, 
  CreateBudgetDTO, 
  UpdateBudgetDTO, 
  BudgetWithProgress 
} from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';
import { getMonthBounds } from '@/lib/dates';

export class LocalBudgetsRepository implements BudgetsRepository {
  async findById(id: string): Promise<Budget | null> {
    return (await db.budgets.get(id)) || null;
  }

  async findAll(): Promise<Budget[]> {
    return db.budgets.orderBy('monthYYYYMM').reverse().toArray();
  }

  async create(data: CreateBudgetDTO): Promise<Budget> {
    // Check if budget already exists for this category and month
    const exists = await this.budgetExists(data.categoryId, data.monthYear);
    if (exists) {
      throw new Error(`Budget already exists for category ${data.categoryId} in ${data.monthYear}`);
    }

    const budget: Budget = {
      id: generateId('budget'),
      userId: 'current-user', // TODO: Get from auth context
      categoryId: data.categoryId,
      monthYYYYMM: data.monthYear.replace('-', ''), // Convert YYYY-MM to YYYYMM
      amountBaseMinor: data.amountBaseMinor,
      spentMinor: 0, // Will be calculated
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.budgets.add(budget);
    return budget;
  }

  async update(id: string, data: UpdateBudgetDTO): Promise<Budget> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Budget with id ${id} not found`);
    }

    const updated: Budget = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db.budgets.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.budgets.delete(id);
  }

  async createMany(data: CreateBudgetDTO[]): Promise<Budget[]> {
    const budgets: Budget[] = [];

    for (const item of data) {
      const budget = await this.create(item);
      budgets.push(budget);
    }

    return budgets;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.budgets.bulkDelete(ids);
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Budget>> {
    const { page, limit, sortBy = 'monthYYYYMM', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = db.budgets.orderBy(sortBy as keyof Budget);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.budgets.count();
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
    return db.budgets.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.budgets.get(id)) !== undefined;
  }

  // Budget-specific methods
  async findByMonthYear(monthYear: string): Promise<Budget[]> {
    // Convert YYYY-MM to YYYYMM for database query
    const monthYYYYMM = monthYear.replace('-', '');
    return db.budgets.where('monthYYYYMM').equals(monthYYYYMM).toArray();
  }

  async findByCategoryId(categoryId: string): Promise<Budget[]> {
    return db.budgets.where('categoryId').equals(categoryId).toArray();
  }

  async findActive(): Promise<Budget[]> {
    return db.budgets.where('active').equals(1).toArray();
  }

  async getBudgetWithProgress(id: string): Promise<BudgetWithProgress | null> {
    const budget = await this.findById(id);
    if (!budget) {
      return null;
    }

    const spentBaseMinor = await this.calculateSpentAmount(budget.categoryId, budget.monthYYYYMM);
    const remainingBaseMinor = budget.amountBaseMinor - spentBaseMinor;
    const percentageUsed = budget.amountBaseMinor > 0 ? (spentBaseMinor / budget.amountBaseMinor) * 100 : 0;
    const isOverBudget = spentBaseMinor > budget.amountBaseMinor;

    return {
      ...budget,
      spentBaseMinor,
      remainingBaseMinor,
      percentageUsed,
      isOverBudget,
    };
  }

  async getBudgetsWithProgress(monthYear: string): Promise<BudgetWithProgress[]> {
    const budgets = await this.findByMonthYear(monthYear);
    const budgetsWithProgress: BudgetWithProgress[] = [];

    for (const budget of budgets) {
      const spentBaseMinor = await this.calculateSpentAmount(budget.categoryId, budget.monthYYYYMM);
      const remainingBaseMinor = budget.amountBaseMinor - spentBaseMinor;
      const percentageUsed = budget.amountBaseMinor > 0 ? (spentBaseMinor / budget.amountBaseMinor) * 100 : 0;
      const isOverBudget = spentBaseMinor > budget.amountBaseMinor;

      budgetsWithProgress.push({
        ...budget,
        spentBaseMinor,
        remainingBaseMinor,
        percentageUsed,
        isOverBudget,
      });
    }

    return budgetsWithProgress;
  }

  async getMonthlyBudgetSummary(monthYear: string): Promise<{
    totalBudgetBaseMinor: number;
    totalSpentBaseMinor: number;
    totalRemainingBaseMinor: number;
    overBudgetCount: number;
    budgetsCount: number;
  }> {
    const budgetsWithProgress = await this.getBudgetsWithProgress(monthYear);

    const totalBudgetBaseMinor = budgetsWithProgress.reduce((sum, b) => sum + b.amountBaseMinor, 0);
    const totalSpentBaseMinor = budgetsWithProgress.reduce((sum, b) => sum + b.spentBaseMinor, 0);
    const totalRemainingBaseMinor = totalBudgetBaseMinor - totalSpentBaseMinor;
    const overBudgetCount = budgetsWithProgress.filter(b => b.isOverBudget).length;
    const budgetsCount = budgetsWithProgress.length;

    return {
      totalBudgetBaseMinor,
      totalSpentBaseMinor,
      totalRemainingBaseMinor,
      overBudgetCount,
      budgetsCount,
    };
  }

  async getOverBudgetAlerts(monthYear?: string): Promise<BudgetWithProgress[]> {
    const budgets = monthYear 
      ? await this.getBudgetsWithProgress(monthYear)
      : await this.getAllBudgetsWithProgress();

    return budgets.filter(budget => budget.isOverBudget);
  }

  async getBudgetAlerts(monthYear: string, threshold: number): Promise<BudgetWithProgress[]> {
    const budgets = await this.getBudgetsWithProgress(monthYear);
    return budgets.filter(budget => budget.percentageUsed >= threshold);
  }

  async compareBudgets(monthYear1: string, monthYear2: string): Promise<{
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
    const month1Budgets = await this.getBudgetsWithProgress(monthYear1);
    const month2Budgets = await this.getBudgetsWithProgress(monthYear2);

    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Create comparison data
    const categoryIds = new Set([
      ...month1Budgets.map(b => b.categoryId),
      ...month2Budgets.map(b => b.categoryId),
    ]);

    const comparison = Array.from(categoryIds).map(categoryId => {
      const category = categoryMap.get(categoryId);
      const month1Budget = month1Budgets.find(b => b.categoryId === categoryId);
      const month2Budget = month2Budgets.find(b => b.categoryId === categoryId);

      const month1BudgetAmount = month1Budget?.amountBaseMinor || 0;
      const month2BudgetAmount = month2Budget?.amountBaseMinor || 0;
      const month1SpentAmount = month1Budget?.spentBaseMinor || 0;
      const month2SpentAmount = month2Budget?.spentBaseMinor || 0;

      return {
        categoryId,
        categoryName: category?.name || 'Categoría eliminada',
        month1Budget: month1BudgetAmount,
        month2Budget: month2BudgetAmount,
        month1Spent: month1SpentAmount,
        month2Spent: month2SpentAmount,
        budgetChange: month2BudgetAmount - month1BudgetAmount,
        spentChange: month2SpentAmount - month1SpentAmount,
      };
    });

    return {
      month1: month1Budgets,
      month2: month2Budgets,
      comparison,
    };
  }

  async copyBudgetsToNextMonth(fromMonthYear: string, toMonthYear: string): Promise<Budget[]> {
    const sourceBudgets = await this.findByMonthYear(fromMonthYear);
    const newBudgets: CreateBudgetDTO[] = sourceBudgets.map(budget => ({
      name: `Budget ${budget.categoryId} - ${toMonthYear}`,
      categoryId: budget.categoryId,
      monthYear: toMonthYear,
      amountBaseMinor: budget.amountBaseMinor,
      active: budget.active,
    }));

    return this.createMany(newBudgets);
  }

    async budgetExists(categoryId: string, monthYear: string): Promise<boolean> {
    const budget = await db.budgets
      .where('categoryId').equals(categoryId)
      .and(b => b.monthYYYYMM === monthYear.replace('-', ''))
      .first();

    return budget !== undefined;
  }

  // Helper methods
  private async calculateSpentAmount(categoryId: string, monthYear: string): Promise<number> {
    const { start, end } = getMonthBounds(monthYear);
    
    const transactions = await db.transactions
      .where('categoryId').equals(categoryId)
      .and(t => t.date >= start && t.date <= end && t.type === 'EXPENSE')
      .toArray();

    return transactions.reduce((sum, t) => sum + Math.abs(t.amountBaseMinor), 0);
  }

  private async getAllBudgetsWithProgress(): Promise<BudgetWithProgress[]> {
    const budgets = await this.findAll();
    const budgetsWithProgress: BudgetWithProgress[] = [];

    for (const budget of budgets) {
      const spentBaseMinor = await this.calculateSpentAmount(budget.categoryId, budget.monthYYYYMM);
      const remainingBaseMinor = budget.amountBaseMinor - spentBaseMinor;
      const percentageUsed = budget.amountBaseMinor > 0 ? (spentBaseMinor / budget.amountBaseMinor) * 100 : 0;
      const isOverBudget = spentBaseMinor > budget.amountBaseMinor;

      budgetsWithProgress.push({
        ...budget,
        spentBaseMinor,
        remainingBaseMinor,
        percentageUsed,
        isOverBudget,
      });
    }

    return budgetsWithProgress;
  }
}
