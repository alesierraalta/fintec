/**
 * Task 3.1: Finance Bounded Context
 *
 * Tests for FinanceContext interface and createFinanceContext factory.
 * Groups: transactions, accounts, budgets, goals repositories.
 */

import type { FinanceContext } from '@/repositories/contexts/finance';

// ─── Task 3.1: FinanceContext Interface Tests ─────────────────────────────────

describe('FinanceContext interface', () => {
  it('should export FinanceContext type from the context file', async () => {
    const mod = await import('@/repositories/contexts/finance');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('should have createFinanceContext factory function', async () => {
    const mod = await import('@/repositories/contexts/finance');
    expect(typeof mod.createFinanceContext).toBe('function');
  });
});

// ─── Task 3.1: FinanceContext Implementation Tests ────────────────────────────

describe('createFinanceContext', () => {
  let createFinanceContext: typeof import('@/repositories/contexts/finance').createFinanceContext;

  beforeAll(async () => {
    const mod = await import('@/repositories/contexts/finance');
    createFinanceContext = mod.createFinanceContext;
  });

  // Mock repositories
  const mockTransactionsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByAccountId: jest.fn(),
    findByCategoryId: jest.fn(),
    findByType: jest.fn(),
    findByDateRange: jest.fn(),
    findByFilters: jest.fn(),
    findByTransferId: jest.fn(),
    search: jest.fn(),
    findDebts: jest.fn(),
    getDebtSummary: jest.fn(),
    getTotalByType: jest.fn(),
    getTotalByCategory: jest.fn(),
    getMonthlyTotals: jest.fn(),
    getCategorySummary: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  const mockAccountsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
    findByType: jest.fn(),
    findByCurrency: jest.fn(),
    findActive: jest.fn(),
    updateBalance: jest.fn(),
    adjustBalance: jest.fn(),
    updateBalances: jest.fn(),
    getTotalBalanceByType: jest.fn(),
    getTotalBalanceByCurrency: jest.fn(),
    getBalanceSummary: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  const mockBudgetsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByCategoryId: jest.fn(),
    findByMonthYear: jest.fn(),
    findActive: jest.fn(),
    getBudgetWithProgress: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  const mockGoalsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findActive: jest.fn(),
    findByAccountId: jest.fn(),
    findByTargetDateRange: jest.fn(),
    getGoalWithProgress: jest.fn(),
    getGoalsWithProgress: jest.fn(),
    addContribution: jest.fn(),
    removeContribution: jest.fn(),
    getGoalAnalytics: jest.fn(),
    updateGoalProgress: jest.fn(),
    getGoalsNearingDeadline: jest.fn(),
    getOffTrackGoals: jest.fn(),
    getGoalsSummary: jest.fn(),
    markGoalAsCompleted: jest.fn(),
    archiveCompletedGoals: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a finance context with all required repositories', () => {
    const context = createFinanceContext({
      transactions: mockTransactionsRepo as never,
      accounts: mockAccountsRepo as never,
      budgets: mockBudgetsRepo as never,
      goals: mockGoalsRepo as never,
    });

    expect(context).toBeDefined();
    expect(context.transactions).toBe(mockTransactionsRepo);
    expect(context.accounts).toBe(mockAccountsRepo);
    expect(context.budgets).toBe(mockBudgetsRepo);
    expect(context.goals).toBe(mockGoalsRepo);
  });

  it('should expose transactions repository with correct interface', () => {
    const context = createFinanceContext({
      transactions: mockTransactionsRepo as never,
      accounts: mockAccountsRepo as never,
      budgets: mockBudgetsRepo as never,
      goals: mockGoalsRepo as never,
    });

    expect(typeof context.transactions.findAll).toBe('function');
    expect(typeof context.transactions.findById).toBe('function');
    expect(typeof context.transactions.create).toBe('function');
  });

  it('should expose accounts repository with correct interface', () => {
    const context = createFinanceContext({
      transactions: mockTransactionsRepo as never,
      accounts: mockAccountsRepo as never,
      budgets: mockBudgetsRepo as never,
      goals: mockGoalsRepo as never,
    });

    expect(typeof context.accounts.findByType).toBe('function');
    expect(typeof context.accounts.updateBalance).toBe('function');
    expect(typeof context.accounts.getBalanceSummary).toBe('function');
  });

  it('should expose budgets repository with correct interface', () => {
    const context = createFinanceContext({
      transactions: mockTransactionsRepo as never,
      accounts: mockAccountsRepo as never,
      budgets: mockBudgetsRepo as never,
      goals: mockGoalsRepo as never,
    });

    expect(typeof context.budgets.findByMonthYear).toBe('function');
    expect(typeof context.budgets.findActive).toBe('function');
  });

  it('should expose goals repository with correct interface', () => {
    const context = createFinanceContext({
      transactions: mockTransactionsRepo as never,
      accounts: mockAccountsRepo as never,
      budgets: mockBudgetsRepo as never,
      goals: mockGoalsRepo as never,
    });

    expect(typeof context.goals.addContribution).toBe('function');
    expect(typeof context.goals.getGoalAnalytics).toBe('function');
    expect(typeof context.goals.getGoalsSummary).toBe('function');
  });
});
