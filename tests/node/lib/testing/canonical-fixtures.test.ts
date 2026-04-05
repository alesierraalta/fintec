import { ensureCanonicalUserFixtures } from '@/lib/testing/canonical-fixtures';
import { AccountType, CategoryKind } from '@/types';

describe('ensureCanonicalUserFixtures', () => {
  function buildDependencies() {
    return {
      authUser: {
        id: 'user-1',
        email: 'test@fintec.com',
        user_metadata: {
          name: 'Test User',
        },
      },
      canonicalUser: {
        email: 'test@fintec.com',
        password: 'Test123!',
        displayName: 'Test User',
        baseCurrency: 'USD',
        authRequiredLane: 'auth-required' as const,
        displayLabels: ['Test User', 'Dashboard'],
      },
      usersProfileRepository: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      appRepository: {
        accounts: {
          findActive: jest.fn(),
          create: jest.fn(),
        } as any,
        categories: {
          findByKind: jest.fn(),
          create: jest.fn(),
        } as any,
      } as any,
    };
  }

  it('reuses deterministic fixtures when they already exist', async () => {
    const dependencies = buildDependencies();
    const existingAccount = {
      id: 'account-1',
      userId: 'user-1',
      name: 'Fintec Canonical Cash',
      type: AccountType.CASH,
      currencyCode: 'USD',
      balance: 0,
      active: true,
      createdAt: '2026-03-18T00:00:00.000Z',
      updatedAt: '2026-03-18T00:00:00.000Z',
    };
    const existingIncomeCategory = {
      id: 'category-income',
      name: 'Fintec Canonical Income',
      kind: CategoryKind.INCOME,
      color: '#16a34a',
      icon: 'ArrowDownCircle',
      active: true,
      userId: 'user-1',
      isDefault: false,
      createdAt: '2026-03-18T00:00:00.000Z',
      updatedAt: '2026-03-18T00:00:00.000Z',
    };
    const existingExpenseCategory = {
      id: 'category-expense',
      name: 'Fintec Canonical Expense',
      kind: CategoryKind.EXPENSE,
      color: '#dc2626',
      icon: 'ArrowUpCircle',
      active: true,
      userId: 'user-1',
      isDefault: false,
      createdAt: '2026-03-18T00:00:00.000Z',
      updatedAt: '2026-03-18T00:00:00.000Z',
    };

    dependencies.appRepository.accounts.findActive.mockResolvedValue([
      existingAccount,
    ]);
    dependencies.appRepository.categories.findByKind
      .mockResolvedValueOnce([existingIncomeCategory])
      .mockResolvedValueOnce([existingExpenseCategory]);

    const result = await ensureCanonicalUserFixtures(dependencies);

    expect(dependencies.usersProfileRepository.upsert).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'test@fintec.com',
      name: 'Test User',
      baseCurrency: 'USD',
    });
    expect(dependencies.appRepository.accounts.create).not.toHaveBeenCalled();
    expect(dependencies.appRepository.categories.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      account: existingAccount,
      incomeCategory: existingIncomeCategory,
      expenseCategory: existingExpenseCategory,
      created: {
        account: false,
        incomeCategory: false,
        expenseCategory: false,
      },
      profile: {
        email: 'test@fintec.com',
        displayName: 'Test User',
        baseCurrency: 'USD',
      },
    });
  });

  it('creates missing fixtures with deterministic payloads', async () => {
    const dependencies = buildDependencies();

    dependencies.appRepository.accounts.findActive.mockResolvedValue([]);
    dependencies.appRepository.accounts.create.mockResolvedValue({
      id: 'account-created',
      userId: 'user-1',
      name: 'Fintec Canonical Cash',
      type: AccountType.CASH,
      currencyCode: 'USD',
      balance: 0,
      active: true,
      createdAt: '2026-03-18T00:00:00.000Z',
      updatedAt: '2026-03-18T00:00:00.000Z',
    });
    dependencies.appRepository.categories.findByKind
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    dependencies.appRepository.categories.create
      .mockResolvedValueOnce({
        id: 'income-created',
        name: 'Fintec Canonical Income',
        kind: CategoryKind.INCOME,
        color: '#16a34a',
        icon: 'ArrowDownCircle',
        active: true,
        userId: 'user-1',
        isDefault: false,
        createdAt: '2026-03-18T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'expense-created',
        name: 'Fintec Canonical Expense',
        kind: CategoryKind.EXPENSE,
        color: '#dc2626',
        icon: 'ArrowUpCircle',
        active: true,
        userId: 'user-1',
        isDefault: false,
        createdAt: '2026-03-18T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
      });

    const result = await ensureCanonicalUserFixtures(dependencies);

    expect(dependencies.appRepository.accounts.create).toHaveBeenCalledWith({
      name: 'Fintec Canonical Cash',
      type: AccountType.CASH,
      currencyCode: 'USD',
      balance: 0,
      active: true,
    });
    expect(
      dependencies.appRepository.categories.create
    ).toHaveBeenNthCalledWith(1, {
      name: 'Fintec Canonical Income',
      kind: CategoryKind.INCOME,
      color: '#16a34a',
      icon: 'ArrowDownCircle',
      active: true,
      isDefault: false,
    });
    expect(
      dependencies.appRepository.categories.create
    ).toHaveBeenNthCalledWith(2, {
      name: 'Fintec Canonical Expense',
      kind: CategoryKind.EXPENSE,
      color: '#dc2626',
      icon: 'ArrowUpCircle',
      active: true,
      isDefault: false,
    });
    expect(result.created).toEqual({
      account: true,
      incomeCategory: true,
      expenseCategory: true,
    });
    expect(result.profile).toEqual({
      email: 'test@fintec.com',
      displayName: 'Test User',
      baseCurrency: 'USD',
    });
  });
});
