import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useTransactionForm,
  TRANSACTION_TYPES,
} from '../../../hooks/use-transaction-form';
import { DebtStatus, TransactionType } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockRepository = {
  categories: {
    findAll: jest.fn().mockResolvedValue([
      { id: 'c1', active: true, kind: 'EXPENSE' },
      { id: 'c2', active: false, kind: 'INCOME' },
    ]),
  },
  accounts: {
    findByUserId: jest
      .fn()
      .mockResolvedValue([{ id: 'a1', active: true, currencyCode: 'USD' }]),
  },
  transactions: { create: jest.fn().mockResolvedValue({ id: 't1' }) },
};

jest.mock('@/providers', () => ({
  useRepository: () => mockRepository,
}));

const mockUser = { id: 'u1' };
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 40,
}));

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: any) => selector({ selectedRateSource: 'bcv' }),
}));

jest.mock('@/lib/utils/evaluate-calculator-expression', () => ({
  evaluateCalculatorExpression: (expr: string) => {
    if (expr === 'Error') throw new Error('Error');
    return parseFloat(expr);
  },
}));

describe('useTransactionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await waitFor(() => {
      expect(result.current.loadingCategories).toBe(false);
      expect(result.current.loadingAccounts).toBe(false);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.formData.type).toBe('');
    expect(result.current.accounts.length).toBe(1); // Only active accounts
  });

  describe('Calculator', () => {
    it('handles numeric input', async () => {
      const { result } = renderHook(() => useTransactionForm());
      await waitFor(() => {
        expect(result.current.loadingCategories).toBe(false);
        expect(result.current.loadingAccounts).toBe(false);
      });

      act(() => {
        result.current.handleCalculatorClick('5');
      });
      act(() => {
        result.current.handleCalculatorClick('0');
      });

      expect(result.current.calculatorValue).toBe('50');
      expect(result.current.formData.amount).toBe('50');
    });

    it('handles C (clear)', async () => {
      const { result } = renderHook(() => useTransactionForm());
      await waitFor(() => {
        expect(result.current.loadingCategories).toBe(false);
        expect(result.current.loadingAccounts).toBe(false);
      });

      act(() => {
        result.current.handleCalculatorClick('5');
      });
      act(() => {
        result.current.handleCalculatorClick('C');
      });

      expect(result.current.calculatorValue).toBe('0');
      expect(result.current.formData.amount).toBe('');
    });

    it('handles backspace', async () => {
      const { result } = renderHook(() => useTransactionForm());
      await waitFor(() => {
        expect(result.current.loadingCategories).toBe(false);
        expect(result.current.loadingAccounts).toBe(false);
      });

      act(() => {
        result.current.handleCalculatorClick('5');
      });
      act(() => {
        result.current.handleCalculatorClick('0');
      });
      act(() => {
        result.current.handleCalculatorClick('⌫');
      });

      expect(result.current.calculatorValue).toBe('5');
    });

    it('handles equals', async () => {
      const { result } = renderHook(() => useTransactionForm());
      await waitFor(() => {
        expect(result.current.loadingCategories).toBe(false);
        expect(result.current.loadingAccounts).toBe(false);
      });

      act(() => {
        result.current.handleCalculatorClick('5');
      });
      act(() => {
        result.current.handleCalculatorClick('=');
      });

      expect(result.current.calculatorValue).toBe('5');
    });
  });

  // More tests to cover submission and helpers
  it('getCategoriesByType filters', async () => {
    const { result } = renderHook(() => useTransactionForm());
    await waitFor(() => {
      expect(result.current.loadingCategories).toBe(false);
      expect(result.current.loadingAccounts).toBe(false);
    });

    expect(
      result.current.getCategoriesByType(TransactionType.EXPENSE).length
    ).toBe(1);
    expect(
      result.current.getCategoriesByType(TransactionType.INCOME).length
    ).toBe(0);
    expect(
      result.current.getCategoriesByType(TransactionType.TRANSFER_OUT).length
    ).toBe(1);
  });

  it('handles manual input change', async () => {
    const { result } = renderHook(() => useTransactionForm());
    await waitFor(() => {
      expect(result.current.loadingCategories).toBe(false);
      expect(result.current.loadingAccounts).toBe(false);
    });
    act(() => {
      result.current.handleCalculatorInputChange('5.5');
    });
    expect(result.current.calculatorValue).toBe('5.5');
    expect(result.current.formData.amount).toBe('5.5');
  });

  it('fails submit with missing amount', async () => {
    const origAlert = global.alert;
    global.alert = jest.fn();
    const { result } = renderHook(() => useTransactionForm());
    await waitFor(() => {
      expect(result.current.loadingCategories).toBe(false);
      expect(result.current.loadingAccounts).toBe(false);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(global.alert).toHaveBeenCalledWith('Por favor ingresa un monto');
    global.alert = origAlert;
  });

  it('handles category creation and auto-selection', async () => {
    const { result } = renderHook(() => useTransactionForm());
    await waitFor(() => expect(result.current.loadingCategories).toBe(false));

    const newCategory = {
      id: 'c3',
      active: true,
      name: 'New Cat',
      kind: 'EXPENSE',
    } as any;
    mockRepository.categories.findAll.mockResolvedValueOnce([
      { id: 'c1', active: true, kind: 'EXPENSE' },
      newCategory,
    ]);

    await act(async () => {
      await result.current.handleCategorySaved(newCategory);
    });

    expect(result.current.formData.categoryId).toBe('c3');
    expect(result.current.categories.length).toBe(2);
  });

  it('submits a valid transaction successfully', async () => {
    const { result } = renderHook(() => useTransactionForm());
    await waitFor(() => expect(result.current.loadingAccounts).toBe(false));

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        amount: '100',
        accountId: 'a1',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        description: 'Test',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockRepository.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 10000,
        accountId: 'a1',
        description: 'Test',
      })
    );
  });
});
