import { renderHook, act } from '@testing-library/react';
import { useDebtActions } from '@/hooks/use-debt-actions';
import { DebtStatus, TransactionType, type Transaction } from '@/types';

const updateMock = jest.fn().mockResolvedValue({});
const deleteMock = jest.fn().mockResolvedValue({});
const settleDebtMock = jest.fn().mockResolvedValue({});
const onSuccessMock = jest.fn();

const mockRepository = {
  transactions: {
    update: updateMock,
    delete: deleteMock,
    settleDebt: settleDebtMock,
  },
};

jest.mock('@/providers', () => ({
  useRepository: () => mockRepository,
}));

const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
  },
}));

const sampleDebt: Transaction = {
  id: 'debt-1',
  type: TransactionType.EXPENSE,
  amountMinor: 5000,
  currencyCode: 'USD',
  description: 'Compra a credito',
  date: '2026-04-01',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  isDebt: true,
  debtDirection: 'OWE',
  debtStatus: DebtStatus.OPEN,
  counterpartyName: 'Tienda XYZ',
} as any;

describe('useDebtActions', () => {
  beforeEach(() => {
    updateMock.mockReset().mockResolvedValue({});
    deleteMock.mockReset().mockResolvedValue({});
    settleDebtMock.mockReset().mockResolvedValue({});
    onSuccessMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  describe('settleDebt', () => {
    it('happy path: calls settleDebt with input, shows success toast, calls onSuccess', async () => {
      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        await result.current.settleDebt(sampleDebt, {
          amountMinor: 5000,
          settlementAccountId: 'acc-1',
          date: '2026-07-07T00:00:00.000Z',
        });
      });

      expect(settleDebtMock).toHaveBeenCalledWith({
        debtTransactionId: 'debt-1',
        settlementAccountId: 'acc-1',
        amountMinor: 5000,
        date: '2026-07-07T00:00:00.000Z',
      });

      expect(toastSuccessMock).toHaveBeenCalledWith(
        'Deuda saldada exitosamente'
      );
      expect(onSuccessMock).toHaveBeenCalled();
    });

    it('error: shows error toast on API failure, does NOT call onSuccess', async () => {
      settleDebtMock.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        try {
          await result.current.settleDebt(sampleDebt, {
            amountMinor: 5000,
            settlementAccountId: 'acc-1',
            date: '2026-07-07T00:00:00.000Z',
          });
        } catch (e) {}
      });

      expect(toastErrorMock).toHaveBeenCalledWith('Error al saldar la deuda');
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('does nothing if debt has no id', async () => {
      const debtWithoutId = { ...sampleDebt, id: undefined } as any;

      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        await result.current.settleDebt(debtWithoutId);
      });

      expect(updateMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe('deleteDebt', () => {
    it('happy path: calls delete, shows success toast, calls onSuccess', async () => {
      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        await result.current.deleteDebt(sampleDebt);
      });

      expect(deleteMock).toHaveBeenCalledWith('debt-1');
      expect(toastSuccessMock).toHaveBeenCalledWith('Deuda eliminada');
      expect(onSuccessMock).toHaveBeenCalled();
    });

    it('error: shows error toast on API failure, does NOT call onSuccess', async () => {
      deleteMock.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        await result.current.deleteDebt(sampleDebt);
      });

      expect(toastErrorMock).toHaveBeenCalledWith('Error al eliminar la deuda');
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('does nothing if debt has no id', async () => {
      const debtWithoutId = { ...sampleDebt, id: undefined } as any;

      const { result } = renderHook(() =>
        useDebtActions({
          repository: mockRepository as any,
          onSuccess: onSuccessMock,
        })
      );

      await act(async () => {
        await result.current.deleteDebt(debtWithoutId);
      });

      expect(deleteMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });
  });
});
