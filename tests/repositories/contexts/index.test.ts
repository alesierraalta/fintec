/**
 * Task 3.5: Context Registry
 *
 * Tests for the context registry index that exports all bounded contexts.
 */

describe('Context registry', () => {
  it('should export all bounded context types', async () => {
    const mod = await import('@/repositories/contexts');
    expect(mod).toBeDefined();
  });

  it('should export createFinanceContext', async () => {
    const mod = await import('@/repositories/contexts');
    expect(typeof mod.createFinanceContext).toBe('function');
  });

  it('should export createRatesContext', async () => {
    const mod = await import('@/repositories/contexts');
    expect(typeof mod.createRatesContext).toBe('function');
  });

  it('should export createUsersContext', async () => {
    const mod = await import('@/repositories/contexts');
    expect(typeof mod.createUsersContext).toBe('function');
  });

  it('should export createOperationsContext', async () => {
    const mod = await import('@/repositories/contexts');
    expect(typeof mod.createOperationsContext).toBe('function');
  });
});

describe('createAllContexts', () => {
  it('should export createAllContexts factory', async () => {
    const mod = await import('@/repositories/contexts');
    expect(typeof mod.createAllContexts).toBe('function');
  });

  it('should create all four contexts from repository map', async () => {
    const { createAllContexts } = await import('@/repositories/contexts');

    const mockRepos = {
      transactions: {} as never,
      accounts: {} as never,
      budgets: {} as never,
      goals: {} as never,
      exchangeRates: {} as never,
      ratesHistory: {} as never,
      scrapeAttempts: {} as never,
      usersProfile: {} as never,
      subscriptions: {} as never,
      waitlist: {} as never,
      orders: {} as never,
      paymentOrders: {} as never,
      recurringTransactions: {} as never,
      transfers: {} as never,
      notifications: {} as never,
      approvalRequests: {} as never,
    };

    const contexts = createAllContexts(mockRepos);

    expect(contexts.finance).toBeDefined();
    expect(contexts.rates).toBeDefined();
    expect(contexts.users).toBeDefined();
    expect(contexts.operations).toBeDefined();

    expect(contexts.finance.transactions).toBe(mockRepos.transactions);
    expect(contexts.finance.accounts).toBe(mockRepos.accounts);
    expect(contexts.finance.budgets).toBe(mockRepos.budgets);
    expect(contexts.finance.goals).toBe(mockRepos.goals);

    expect(contexts.rates.exchangeRates).toBe(mockRepos.exchangeRates);
    expect(contexts.rates.ratesHistory).toBe(mockRepos.ratesHistory);
    expect(contexts.rates.scrapeAttempts).toBe(mockRepos.scrapeAttempts);

    expect(contexts.users.usersProfile).toBe(mockRepos.usersProfile);
    expect(contexts.users.subscriptions).toBe(mockRepos.subscriptions);
    expect(contexts.users.waitlist).toBe(mockRepos.waitlist);

    expect(contexts.operations.orders).toBe(mockRepos.orders);
    expect(contexts.operations.paymentOrders).toBe(mockRepos.paymentOrders);
    expect(contexts.operations.recurringTransactions).toBe(mockRepos.recurringTransactions);
    expect(contexts.operations.transfers).toBe(mockRepos.transfers);
    expect(contexts.operations.notifications).toBe(mockRepos.notifications);
    expect(contexts.operations.approvalRequests).toBe(mockRepos.approvalRequests);
  });
});
