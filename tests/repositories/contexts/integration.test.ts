/**
 * Task 3.13: Integration Tests for Bounded Contexts
 *
 * Comprehensive tests verifying all contexts work together,
 * context registry creates all contexts correctly,
 * and factory integration works end-to-end.
 */

import { createAllContexts, type AllContexts } from '@/repositories/contexts';
import { createFinanceContext } from '@/repositories/contexts/finance';
import { createRatesContext } from '@/repositories/contexts/rates';
import { createUsersContext } from '@/repositories/contexts/users';
import { createOperationsContext } from '@/repositories/contexts/operations';

// ─── Mock Repository Factories ────────────────────────────────────────────────

function createMockRepo<T extends Record<string, jest.Mock>>(methods: T): T {
  return methods;
}

const mocks = {
  transactions: createMockRepo({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByAccountId: jest.fn().mockResolvedValue([]),
    findByCategoryId: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
    findByFilters: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    findByTransferId: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    findDebts: jest.fn().mockResolvedValue([]),
    getDebtSummary: jest.fn().mockResolvedValue({ totalPending: 0, totalOwed: 0 }),
    getTotalByType: jest.fn().mockResolvedValue(0),
    getTotalByCategory: jest.fn().mockResolvedValue(0),
    getMonthlyTotals: jest.fn().mockResolvedValue([]),
    getCategorySummary: jest.fn().mockResolvedValue([]),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
  }),
  accounts: createMockRepo({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    findByCurrency: jest.fn().mockResolvedValue([]),
    findActive: jest.fn().mockResolvedValue([]),
    updateBalance: jest.fn(),
    adjustBalance: jest.fn(),
    updateBalances: jest.fn(),
    getTotalBalanceByType: jest.fn().mockResolvedValue(0),
    getTotalBalanceByCurrency: jest.fn().mockResolvedValue(0),
    getBalanceSummary: jest.fn().mockResolvedValue({ totalByType: {}, totalByCurrency: {}, total: 0 }),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
  }),
  budgets: createMockRepo({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByCategoryId: jest.fn().mockResolvedValue([]),
    findByMonthYear: jest.fn().mockResolvedValue([]),
    findActive: jest.fn().mockResolvedValue([]),
    getBudgetWithProgress: jest.fn().mockResolvedValue(null),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
  }),
  goals: createMockRepo({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findActive: jest.fn().mockResolvedValue([]),
    findByAccountId: jest.fn().mockResolvedValue([]),
    findByTargetDateRange: jest.fn().mockResolvedValue([]),
    getGoalWithProgress: jest.fn().mockResolvedValue(null),
    getGoalsWithProgress: jest.fn().mockResolvedValue([]),
    addContribution: jest.fn(),
    removeContribution: jest.fn(),
    getGoalAnalytics: jest.fn().mockResolvedValue({}),
    updateGoalProgress: jest.fn(),
    getGoalsNearingDeadline: jest.fn().mockResolvedValue([]),
    getOffTrackGoals: jest.fn().mockResolvedValue([]),
    getGoalsSummary: jest.fn().mockResolvedValue({ totalGoals: 0, activeGoals: 0, completedGoals: 0, totalTargetBaseMinor: 0, totalSavedBaseMinor: 0, averageProgress: 0 }),
    markGoalAsCompleted: jest.fn(),
    archiveCompletedGoals: jest.fn().mockResolvedValue(0),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
  }),
  exchangeRates: createMockRepo({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByPair: jest.fn().mockResolvedValue([]),
    findLatestByPair: jest.fn().mockResolvedValue(null),
    findByDate: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
    findByProvider: jest.fn().mockResolvedValue([]),
    getRate: jest.fn().mockResolvedValue(0),
    getRateWithFallback: jest.fn().mockResolvedValue({ rate: 0, source: 'fallback', date: '' }),
    updateRatesFromProvider: jest.fn().mockResolvedValue([]),
    clearOldRates: jest.fn().mockResolvedValue(0),
    getSupportedCurrencies: jest.fn().mockResolvedValue([]),
    getRateHistory: jest.fn().mockResolvedValue([]),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    count: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
  }),
  ratesHistory: createMockRepo({
    upsertBCVRate: jest.fn(),
    listBCVRatesSince: jest.fn().mockResolvedValue([]),
    upsertBinanceRate: jest.fn(),
    listBinanceRatesSince: jest.fn().mockResolvedValue([]),
    insertExchangeRateSnapshot: jest.fn(),
    getLatestExchangeRateSnapshot: jest.fn().mockResolvedValue(null),
    getLatestBCVRate: jest.fn().mockResolvedValue(null),
    getLatestBinanceRate: jest.fn().mockResolvedValue(null),
    listExchangeRateSnapshots: jest.fn().mockResolvedValue([]),
  }),
  scrapeAttempts: createMockRepo({
    recordAttempt: jest.fn(),
    getLatestAttempts: jest.fn().mockResolvedValue([]),
  }),
  usersProfile: createMockRepo({
    upsert: jest.fn(),
    update: jest.fn(),
  }),
  subscriptions: createMockRepo({
    getUserSubscriptionSnapshot: jest.fn().mockResolvedValue(null),
  }),
  waitlist: createMockRepo({
    create: jest.fn(),
  }),
  orders: createMockRepo({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    listByUserId: jest.fn().mockResolvedValue([]),
    markPaid: jest.fn(),
  }),
  paymentOrders: createMockRepo({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    listByUserId: jest.fn().mockResolvedValue([]),
    listAll: jest.fn().mockResolvedValue([]),
    updateForUser: jest.fn(),
    approve: jest.fn(),
    setAdminNotes: jest.fn(),
    reject: jest.fn(),
  }),
  recurringTransactions: createMockRepo({
    findByUserId: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    findDueForExecution: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleActive: jest.fn(),
    getSummary: jest.fn().mockResolvedValue({}),
    createFromTransaction: jest.fn(),
    updateNextExecution: jest.fn(),
  }),
  transfers: createMockRepo({
    listByUserId: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
  }),
  notifications: createMockRepo({
    findByUserId: jest.fn().mockResolvedValue([]),
    findUnreadByUserId: jest.fn().mockResolvedValue([]),
    countUnreadByUserId: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    deleteAllRead: jest.fn(),
    deleteByUserId: jest.fn(),
  }),
  approvalRequests: createMockRepo({
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByIdForUser: jest.fn().mockResolvedValue(null),
    listByUserId: jest.fn().mockResolvedValue([]),
    respond: jest.fn(),
    markTimeout: jest.fn(),
  }),
};

// ─── Integration Tests ────────────────────────────────────────────────────────

describe('Bounded Contexts Integration', () => {
  let contexts: AllContexts;

  beforeEach(() => {
    jest.clearAllMocks();
    contexts = createAllContexts(mocks as never);
  });

  describe('Context creation', () => {
    it('should create all four bounded contexts', () => {
      expect(contexts.finance).toBeDefined();
      expect(contexts.rates).toBeDefined();
      expect(contexts.users).toBeDefined();
      expect(contexts.operations).toBeDefined();
    });

    it('should wire correct repositories to finance context', () => {
      expect(contexts.finance.transactions).toBe(mocks.transactions);
      expect(contexts.finance.accounts).toBe(mocks.accounts);
      expect(contexts.finance.budgets).toBe(mocks.budgets);
      expect(contexts.finance.goals).toBe(mocks.goals);
    });

    it('should wire correct repositories to rates context', () => {
      expect(contexts.rates.exchangeRates).toBe(mocks.exchangeRates);
      expect(contexts.rates.ratesHistory).toBe(mocks.ratesHistory);
      expect(contexts.rates.scrapeAttempts).toBe(mocks.scrapeAttempts);
    });

    it('should wire correct repositories to users context', () => {
      expect(contexts.users.usersProfile).toBe(mocks.usersProfile);
      expect(contexts.users.subscriptions).toBe(mocks.subscriptions);
      expect(contexts.users.waitlist).toBe(mocks.waitlist);
    });

    it('should wire correct repositories to operations context', () => {
      expect(contexts.operations.orders).toBe(mocks.orders);
      expect(contexts.operations.paymentOrders).toBe(mocks.paymentOrders);
      expect(contexts.operations.recurringTransactions).toBe(mocks.recurringTransactions);
      expect(contexts.operations.transfers).toBe(mocks.transfers);
      expect(contexts.operations.notifications).toBe(mocks.notifications);
      expect(contexts.operations.approvalRequests).toBe(mocks.approvalRequests);
    });
  });

  describe('Context isolation', () => {
    it('should allow independent operation on each context', async () => {
      // Finance operations
      await contexts.finance.transactions.findAll();
      expect(mocks.transactions.findAll).toHaveBeenCalledTimes(1);

      // Rates operations
      await contexts.rates.exchangeRates.findAll();
      expect(mocks.exchangeRates.findAll).toHaveBeenCalledTimes(1);

      // Users operations
      await contexts.users.subscriptions.getUserSubscriptionSnapshot('user-1');
      expect(mocks.subscriptions.getUserSubscriptionSnapshot).toHaveBeenCalledWith('user-1');

      // Operations
      await contexts.operations.orders.listByUserId('user-1');
      expect(mocks.orders.listByUserId).toHaveBeenCalledWith('user-1');

      // Verify no cross-context calls
      expect(mocks.accounts.findAll).not.toHaveBeenCalled();
      expect(mocks.ratesHistory.upsertBCVRate).not.toHaveBeenCalled();
    });
  });

  describe('Cross-context data flow', () => {
    it('should support reading from multiple contexts in sequence', async () => {
      // Simulate a dashboard load that reads from multiple contexts
      const [accounts, rates, notifications] = await Promise.all([
        contexts.finance.accounts.findAll(),
        contexts.rates.exchangeRates.findAll(),
        contexts.operations.notifications.findByUserId('user-1'),
      ]);

      expect(accounts).toEqual([]);
      expect(rates).toEqual([]);
      expect(notifications).toEqual([]);

      expect(mocks.accounts.findAll).toHaveBeenCalledTimes(1);
      expect(mocks.exchangeRates.findAll).toHaveBeenCalledTimes(1);
      expect(mocks.notifications.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Factory integration', () => {
    it('should create individual contexts via factory functions', () => {
      const finance = createFinanceContext({
        transactions: mocks.transactions as never,
        accounts: mocks.accounts as never,
        budgets: mocks.budgets as never,
        goals: mocks.goals as never,
      });

      const rates = createRatesContext({
        exchangeRates: mocks.exchangeRates as never,
        ratesHistory: mocks.ratesHistory as never,
        scrapeAttempts: mocks.scrapeAttempts as never,
      });

      const users = createUsersContext({
        usersProfile: mocks.usersProfile as never,
        subscriptions: mocks.subscriptions as never,
        waitlist: mocks.waitlist as never,
      });

      const operations = createOperationsContext({
        orders: mocks.orders as never,
        paymentOrders: mocks.paymentOrders as never,
        recurringTransactions: mocks.recurringTransactions as never,
        transfers: mocks.transfers as never,
        notifications: mocks.notifications as never,
        approvalRequests: mocks.approvalRequests as never,
      });

      expect(finance.transactions).toBe(mocks.transactions);
      expect(rates.exchangeRates).toBe(mocks.exchangeRates);
      expect(users.usersProfile).toBe(mocks.usersProfile);
      expect(operations.orders).toBe(mocks.orders);
    });
  });

  describe('Total repository coverage', () => {
    it('should cover all 16 repository interfaces across contexts', () => {
      const allRepos = [
        // Finance (4)
        contexts.finance.transactions,
        contexts.finance.accounts,
        contexts.finance.budgets,
        contexts.finance.goals,
        // Rates (3)
        contexts.rates.exchangeRates,
        contexts.rates.ratesHistory,
        contexts.rates.scrapeAttempts,
        // Users (3)
        contexts.users.usersProfile,
        contexts.users.subscriptions,
        contexts.users.waitlist,
        // Operations (6)
        contexts.operations.orders,
        contexts.operations.paymentOrders,
        contexts.operations.recurringTransactions,
        contexts.operations.transfers,
        contexts.operations.notifications,
        contexts.operations.approvalRequests,
      ];

      expect(allRepos).toHaveLength(16);
      allRepos.forEach((repo) => {
        expect(repo).toBeDefined();
      });
    });
  });
});
