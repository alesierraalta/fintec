/**
 * Task 2.7: Service Provider Factory
 *
 * Tests for the service provider that creates service instances.
 * Follows existing pattern from repositories/factory.ts.
 */

describe('service-provider', () => {
  it('should export createServerServices function', async () => {
    const mod = await import('@/lib/services/service-provider');
    expect(mod.createServerServices).toBeDefined();
    expect(typeof mod.createServerServices).toBe('function');
  });

  it('should create all services with repository injection', async () => {
    const { createServerServices } = await import('@/lib/services/service-provider');

    // Mock repository
    const mockRepository = {
      transactions: {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        findByAccountId: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        findByCategoryId: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        findByType: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        findByDateRange: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findByFilters: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        findByTransferId: jest.fn().mockResolvedValue([]),
        search: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        findDebts: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        getDebtSummary: jest.fn().mockResolvedValue({}),
        getTotalByType: jest.fn().mockResolvedValue(0),
        getTotalByCategory: jest.fn().mockResolvedValue(0),
        getMonthlyTotals: jest.fn().mockResolvedValue({}),
        getCategorySummary: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findPaginated: jest.fn(),
        count: jest.fn(),
        exists: jest.fn(),
      },
      accounts: {
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
        getTotalBalanceByType: jest.fn(),
        getTotalBalanceByCurrency: jest.fn(),
        getBalanceSummary: jest.fn().mockResolvedValue({
          totalByType: {},
          totalByCurrency: {},
          total: 0,
        }),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findPaginated: jest.fn(),
        count: jest.fn(),
        exists: jest.fn(),
      },
      categories: {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findByKind: jest.fn().mockResolvedValue([]),
        findByParentId: jest.fn().mockResolvedValue([]),
        findRootCategories: jest.fn().mockResolvedValue([]),
        findActive: jest.fn().mockResolvedValue([]),
        findWithSubcategories: jest.fn(),
        findCategoryTree: jest.fn().mockResolvedValue([]),
        canDelete: jest.fn().mockResolvedValue(true),
        getUsageCount: jest.fn().mockResolvedValue(0),
        reorderCategories: jest.fn(),
        createDefaultCategories: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findPaginated: jest.fn(),
        count: jest.fn(),
        exists: jest.fn(),
      },
    };

    const services = createServerServices(mockRepository as never);

    // Verify all services are created
    expect(services.transactionService).toBeDefined();
    expect(services.accountService).toBeDefined();
    expect(services.categoryService).toBeDefined();

    // Verify services have correct methods
    expect(typeof services.transactionService.findAll).toBe('function');
    expect(typeof services.transactionService.create).toBe('function');
    expect(typeof services.accountService.findAll).toBe('function');
    expect(typeof services.accountService.create).toBe('function');
    expect(typeof services.categoryService.findAll).toBe('function');
    expect(typeof services.categoryService.create).toBe('function');
  });
});
