import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccountsPage } from '@/hooks/use-accounts-page';
import type { Account } from '@/types';

const checkAlertsMock = jest.fn().mockResolvedValue(undefined);

const mockRepository = {
  accounts: {
    findByUserId: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
  },
  transactions: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  categories: {
    findAll: jest.fn().mockResolvedValue([]),
  },
};

// Note: the hook receives its repository via opts (dependency injection), so
// there is no useRepository() call to mock here.

jest.mock('@/hooks/use-balance-alerts', () => ({
  useBalanceAlerts: () => ({
    checkAlerts: checkAlertsMock,
  }),
}));

const toastSuccessMock = jest.fn();
const toastErrorMock = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockAccount: Account = {
  id: 'acc-1',
  name: 'Cuenta Principal',
  type: 'BANK',
  currencyCode: 'USD',
  balance: 100000,
  active: true,
  userId: 'u1',
} as any;

describe('useAccountsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('modal state', () => {
    it('should have isOpen false initially', async () => {
      const { result } = renderHook(() =>
        useAccountsPage({
          user: { id: 'u1' },
          repository: mockRepository as any,
          onOpenHistory: jest.fn(),
          dropdownRefs: { current: {} },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isOpen).toBe(false);
    });

    it('should open modal when handleNewAccount is called', async () => {
      const { result } = renderHook(() =>
        useAccountsPage({
          user: { id: 'u1' },
          repository: mockRepository as any,
          onOpenHistory: jest.fn(),
          dropdownRefs: { current: {} },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleNewAccount();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.selectedAccount).toBeNull();
    });

    it('should open modal and set selectedAccount when handleEditAccount is called', async () => {
      const { result } = renderHook(() =>
        useAccountsPage({
          user: { id: 'u1' },
          repository: mockRepository as any,
          onOpenHistory: jest.fn(),
          dropdownRefs: { current: {} },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleEditAccount(mockAccount);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.selectedAccount).toBe(mockAccount);
    });

    it('should close modal when closeModal is called', async () => {
      const { result } = renderHook(() =>
        useAccountsPage({
          user: { id: 'u1' },
          repository: mockRepository as any,
          onOpenHistory: jest.fn(),
          dropdownRefs: { current: {} },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleNewAccount();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should close modal when handleAccountSaved is called', async () => {
      const { result } = renderHook(() =>
        useAccountsPage({
          user: { id: 'u1' },
          repository: mockRepository as any,
          onOpenHistory: jest.fn(),
          dropdownRefs: { current: {} },
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.handleNewAccount();
      });

      expect(result.current.isOpen).toBe(true);

      // handleAccountSaved closes the modal synchronously via closeModal.
      act(() => {
        result.current.handleAccountSaved();
      });

      expect(result.current.isOpen).toBe(false);

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });
});
