/**
 * Task 2.1-2.2: Transaction Service Interface + Implementation
 *
 * Tests for ITransactionService interface and TransactionService implementation.
 * Uses TDD: write failing tests first, then implement.
 */

import type { ITransactionService, TransactionFilters } from '@/lib/services/transaction-service.interface';
import type { Transaction, TransactionType } from '@/types';

// ─── Task 2.1: Interface Contract Tests ────────────────────────────────────────

describe('ITransactionService interface', () => {
  it('should export ITransactionService type from the interface file', async () => {
    const mod = await import('@/lib/services/transaction-service.interface');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('should have a type definition for ITransactionService', async () => {
    const mod = await import('@/lib/services/transaction-service.interface');
    expect(mod).toBeDefined();
  });
});

// ─── Task 2.2: TransactionService Implementation Tests ─────────────────────────

describe('TransactionService', () => {
  let TransactionService: typeof import('@/lib/services/transaction-service').TransactionService;

  beforeAll(async () => {
    const mod = await import('@/lib/services/transaction-service');
    TransactionService = mod.TransactionService;
  });

  // Mock repositories
  const mockTransactionsRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByAccountId: jest.fn(),
    findByCategoryId: jest.fn(),
    findByType: jest.fn(),
    findByDateRange: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
    findById: jest.fn(),
    findAll: jest.fn(),
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

  let service: ITransactionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionService(
      mockTransactionsRepo as never,
      mockAccountsRepo as never
    );
  });

  describe('findAll', () => {
    it('should return transactions for a user', async () => {
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
          description: 'Groceries',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockTransactionsRepo.findAll.mockResolvedValue(mockTransactions);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsRepo.findAll).toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      const filters: TransactionFilters = {
        type: 'EXPENSE' as TransactionType,
        accountId: 'acc-1',
      };

      mockTransactionsRepo.findByAccountId.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findAll('user-1', filters);

      expect(mockTransactionsRepo.findByAccountId).toHaveBeenCalledWith('acc-1', undefined);
    });
  });

  describe('findById', () => {
    it('should return a transaction by ID', async () => {
      const mockTransaction: Transaction = {
        id: 'tx-1',
        type: 'EXPENSE' as TransactionType,
        accountId: 'acc-1',
        currencyCode: 'USD',
        amountMinor: 1000,
        amountBaseMinor: 1000,
        exchangeRate: 1,
        date: '2024-01-01T00:00:00.000Z',
        description: 'Groceries',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTransactionsRepo.findById.mockResolvedValue(mockTransaction);

      const result = await service.findById('user-1', 'tx-1');

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsRepo.findById).toHaveBeenCalledWith('tx-1');
    });

    it('should return null for non-existent transaction', async () => {
      mockTransactionsRepo.findById.mockResolvedValue(null);

      const result = await service.findById('user-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a transaction with valid data', async () => {
      const dto = {
        accountId: 'acc-1',
        amountMinor: 1000,
        currencyCode: 'USD',
        type: 'EXPENSE' as TransactionType,
        categoryId: 'cat-1',
        description: 'Groceries',
        date: '2024-01-01T00:00:00.000Z',
      };

      const mockAccount = {
        id: 'acc-1',
        name: 'Test Account',
        type: 'BANK',
        currencyCode: 'USD',
        balance: 5000,
        active: true,
      };

      mockAccountsRepo.findById.mockResolvedValue(mockAccount);

      const mockCreated: Transaction = {
        id: 'tx-new',
        ...dto,
        amountBaseMinor: 1000,
        exchangeRate: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockTransactionsRepo.create.mockResolvedValue(mockCreated);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(mockCreated);
      expect(mockAccountsRepo.findById).toHaveBeenCalledWith('acc-1');
      expect(mockTransactionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
          amountMinor: 1000,
        })
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      const dto = {
        accountId: '',
        amountMinor: 0,
        currencyCode: 'USD',
        type: 'EXPENSE' as TransactionType,
        categoryId: 'cat-1',
        description: '',
        date: '2024-01-01T00:00:00.000Z',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const existing: Transaction = {
        id: 'tx-1',
        type: 'EXPENSE' as TransactionType,
        accountId: 'acc-1',
        currencyCode: 'USD',
        amountMinor: 1000,
        amountBaseMinor: 1000,
        exchangeRate: 1,
        date: '2024-01-01T00:00:00.000Z',
        description: 'Old description',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const updated: Transaction = {
        ...existing,
        description: 'New description',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockTransactionsRepo.findById.mockResolvedValue(existing);
      mockTransactionsRepo.update.mockResolvedValue(updated);

      const result = await service.update('user-1', 'tx-1', {
        id: 'tx-1',
        description: 'New description',
      });

      expect(result.description).toBe('New description');
      expect(mockTransactionsRepo.update).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({ description: 'New description' })
      );
    });
  });

  describe('remove', () => {
    it('should delete a transaction', async () => {
      mockTransactionsRepo.delete.mockResolvedValue(undefined);

      await service.remove('user-1', 'tx-1');

      expect(mockTransactionsRepo.delete).toHaveBeenCalledWith('tx-1');
    });
  });

  describe('getMonthlyReport', () => {
    it('should generate a monthly report', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          type: 'INCOME' as TransactionType,
          accountId: 'acc-1',
          currencyCode: 'USD',
          amountMinor: 5000,
          amountBaseMinor: 5000,
          exchangeRate: 1,
          date: '2024-01-15T00:00:00.000Z',
          description: 'Salary',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
        },
        {
          id: 'tx-2',
          type: 'EXPENSE' as TransactionType,
          accountId: 'acc-1',
          currencyCode: 'USD',
          amountMinor: 1500,
          amountBaseMinor: 1500,
          exchangeRate: 1,
          date: '2024-01-10T00:00:00.000Z',
          description: 'Food',
          categoryId: 'cat-1',
          createdAt: '2024-01-10T00:00:00.000Z',
          updatedAt: '2024-01-10T00:00:00.000Z',
        },
        {
          id: 'tx-3',
          type: 'EXPENSE' as TransactionType,
          accountId: 'acc-1',
          currencyCode: 'USD',
          amountMinor: 1500,
          amountBaseMinor: 1500,
          exchangeRate: 1,
          date: '2024-01-20T00:00:00.000Z',
          description: 'Transport',
          categoryId: 'cat-2',
          createdAt: '2024-01-20T00:00:00.000Z',
          updatedAt: '2024-01-20T00:00:00.000Z',
        },
      ];

      mockTransactionsRepo.findByDateRange.mockResolvedValue({
        data: mockTransactions,
        total: 3,
      });

      const report = await service.getMonthlyReport('user-1', 2024, 1);

      expect(report.year).toBe(2024);
      expect(report.month).toBe(1);
      expect(report.totalIncome).toBe(5000);
      expect(report.totalExpenses).toBe(3000);
      expect(report.netBalance).toBe(2000);
      expect(report.byCategory).toHaveLength(2);
      expect(report.byCategory[0].categoryId).toBe('cat-1');
      expect(report.byCategory[0].total).toBe(1500);
    });
  });
});
