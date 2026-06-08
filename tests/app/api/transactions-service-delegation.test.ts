/**
 * Task 2.14: API Routes Delegating to Services
 *
 * Tests that demonstrate API routes can delegate business logic to services.
 * This test verifies the service integration pattern without breaking existing tests.
 */

import type { ITransactionService } from '@/lib/services/transaction-service.interface';
import type { Transaction, TransactionType } from '@/types';

describe('Transaction API Route Service Delegation', () => {
  it('should be able to create a TransactionService from repository', async () => {
    const { createServerServices } = await import('@/lib/services/service-provider');

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

    expect(services.transactionService).toBeDefined();
    expect(typeof services.transactionService.findAll).toBe('function');
    expect(typeof services.transactionService.create).toBe('function');
  });

  it('should use TransactionService.findAll instead of direct repository call', async () => {
    const { TransactionService } = await import('@/lib/services/transaction-service');

    const mockTransactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'EXPENSE' as TransactionType,
        accountId: 'acc-1',
        currencyCode: 'USD',
        amountMinor: 1000,
        amountBaseMinor: 1000,
        exchangeRate: 1,
        date: '2024-01-01T00:00:00.000Z',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const mockTransactionsRepo = {
      findAll: jest.fn().mockResolvedValue(mockTransactions),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByCategoryId: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockAccountsRepo = {
      findById: jest.fn(),
    };

    const service = new TransactionService(
      mockTransactionsRepo as never,
      mockAccountsRepo as never
    );

    const result = await service.findAll('user-1');

    expect(result).toEqual(mockTransactions);
    expect(mockTransactionsRepo.findAll).toHaveBeenCalled();
  });
});
