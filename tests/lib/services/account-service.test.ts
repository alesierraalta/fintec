/**
 * Task 2.3-2.4: Account Service Interface + Implementation
 *
 * Tests for IAccountService interface and AccountService implementation.
 */

import type { IAccountService, CreateAccountDTO, UpdateAccountDTO } from '@/lib/services/account-service.interface';
import type { Account, AccountType } from '@/types';

// ─── Task 2.3: Interface Contract Tests ────────────────────────────────────────

describe('IAccountService interface', () => {
  it('should export IAccountService type from the interface file', async () => {
    const mod = await import('@/lib/services/account-service.interface');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });
});

// ─── Task 2.4: AccountService Implementation Tests ─────────────────────────────

describe('AccountService', () => {
  let AccountService: typeof import('@/lib/services/account-service').AccountService;

  beforeAll(async () => {
    const mod = await import('@/lib/services/account-service');
    AccountService = mod.AccountService;
  });

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

  let service: IAccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountService(mockAccountsRepo as never);
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const mockAccounts: Account[] = [
        {
          id: 'acc-1',
          name: 'Checking',
          type: 'BANK' as AccountType,
          currencyCode: 'USD',
          balance: 5000,
          active: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockAccountsRepo.findAll.mockResolvedValue(mockAccounts);

      const result = await service.findAll();

      expect(result).toEqual(mockAccounts);
      expect(mockAccountsRepo.findAll).toHaveBeenCalled();
    });

    it('should filter by type when provided', async () => {
      mockAccountsRepo.findByType.mockResolvedValue([]);

      await service.findAll({ type: 'BANK' as AccountType });

      expect(mockAccountsRepo.findByType).toHaveBeenCalledWith('BANK');
    });

    it('should filter by active status when provided', async () => {
      mockAccountsRepo.findActive.mockResolvedValue([]);

      await service.findAll({ active: true });

      expect(mockAccountsRepo.findActive).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return an account by ID', async () => {
      const mockAccount: Account = {
        id: 'acc-1',
        name: 'Checking',
        type: 'BANK' as AccountType,
        currencyCode: 'USD',
        balance: 5000,
        active: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccountsRepo.findById.mockResolvedValue(mockAccount);

      const result = await service.findById('acc-1');

      expect(result).toEqual(mockAccount);
    });
  });

  describe('create', () => {
    it('should create an account with valid data', async () => {
      const dto: CreateAccountDTO = {
        name: 'Savings',
        type: 'SAVINGS' as AccountType,
        currencyCode: 'USD',
        balance: 1000,
        active: true,
      };

      const mockCreated: Account = {
        id: 'acc-new',
        name: dto.name,
        type: dto.type,
        currencyCode: dto.currencyCode,
        balance: dto.balance ?? 0,
        active: dto.active ?? true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccountsRepo.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto);

      expect(result).toEqual(mockCreated);
      expect(mockAccountsRepo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an account', async () => {
      const existing: Account = {
        id: 'acc-1',
        name: 'Old Name',
        type: 'BANK' as AccountType,
        currencyCode: 'USD',
        balance: 5000,
        active: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccountsRepo.findById.mockResolvedValue(existing);
      mockAccountsRepo.update.mockResolvedValue({ ...existing, name: 'New Name' });

      const result = await service.update('acc-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });

  describe('remove', () => {
    it('should delete an account', async () => {
      mockAccountsRepo.delete.mockResolvedValue(undefined);

      await service.remove('acc-1');

      expect(mockAccountsRepo.delete).toHaveBeenCalledWith('acc-1');
    });
  });

  describe('getBalanceSummary', () => {
    it('should return balance summary', async () => {
      const mockSummary = {
        totalByType: { BANK: 5000, CASH: 500 } as Record<AccountType, number>,
        totalByCurrency: { USD: 5500 },
        total: 5500,
      };

      mockAccountsRepo.getBalanceSummary.mockResolvedValue(mockSummary);

      const result = await service.getBalanceSummary();

      expect(result).toEqual(mockSummary);
    });
  });
});
