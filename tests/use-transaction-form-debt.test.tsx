import { act, renderHook, waitFor } from '@testing-library/react';
import { useTransactionForm } from '@/hooks/use-transaction-form';
import { DebtDirection, DebtStatus, TransactionType } from '@/types';

const pushMock = jest.fn();
const createMock = jest.fn();
const authStateMock = { user: { id: 'user-1' } };
const repositoryMock = {
  categories: {
    findAll: jest.fn().mockResolvedValue([
      { id: 'cat-expense', kind: 'EXPENSE', active: true, name: 'Comida' },
      { id: 'cat-income', kind: 'INCOME', active: true, name: 'Sueldo' },
    ]),
  },
  accounts: {
    findByUserId: jest.fn().mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Cuenta Principal',
        currencyCode: 'USD',
        active: true,
      },
    ]),
  },
  transactions: {
    create: createMock,
  },
};

jest.mock('@/providers', () => ({
  useRepository: () => repositoryMock,
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => authStateMock,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 36.5,
}));

jest.mock('@/lib/store', () => ({
  useAppStore: () => 'bcv',
}));

describe('useTransactionForm debt capture', () => {
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: 'tx-1' });
    pushMock.mockReset();
    alertSpy.mockClear();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('captures income debt with explicit direction', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThan(0);
      expect(result.current.categories.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        type: TransactionType.INCOME,
        accountId: 'acc-1',
        categoryId: 'cat-income',
        amount: '25.50',
        description: 'Prestamo',
        isDebt: true,
        debtDirection: DebtDirection.OWED_TO_ME,
        debtStatus: DebtStatus.OPEN,
        counterpartyName: 'Ana',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.INCOME,
        amountMinor: 2550,
        isDebt: true,
        debtDirection: 'OWED_TO_ME',
        debtStatus: DebtStatus.OPEN,
        counterpartyName: 'Ana',
      })
    );
  });

  it('captures expense debt with explicit direction', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        type: TransactionType.EXPENSE,
        accountId: 'acc-1',
        categoryId: 'cat-expense',
        amount: '30',
        description: 'Deuda pendiente',
        isDebt: true,
        debtDirection: DebtDirection.OWE,
        debtStatus: DebtStatus.OPEN,
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.EXPENSE,
        amountMinor: 3000,
        isDebt: true,
        debtDirection: 'OWE',
      })
    );
  });

  it('blocks debt submit without direction', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await waitFor(() => {
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setFormData((prev) => ({
        ...prev,
        type: TransactionType.EXPENSE,
        accountId: 'acc-1',
        categoryId: 'cat-expense',
        amount: '12',
        description: 'Sin direccion',
        isDebt: true,
        debtDirection: '',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Selecciona la direccion de la deuda'
    );
    expect(createMock).not.toHaveBeenCalled();
  });
});
