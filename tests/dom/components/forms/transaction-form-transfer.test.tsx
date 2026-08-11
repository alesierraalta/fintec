/**
 * #56 escape hatch: Transfer selection opens /transfers, never a lone TRANSFER_OUT.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types';
import type { Account, Category } from '@/types/domain';
// Mocks must return STABLE references or the form's useEffect re-runs per render.
jest.mock('@/providers', () => {
  const repo = {
    accounts: { findByUserId: jest.fn().mockResolvedValue([]) },
    categories: { findAll: jest.fn().mockResolvedValue([]) },
    transactions: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
  };
  return { useRepository: () => repo, __repo: repo };
});
const authState = { user: { id: 'user-1' } };
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => authState,
}));
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({ isAtLimit: () => false, tier: 'free' }),
}));
jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));
jest.mock('@/components/subscription/upgrade-modal', () => ({
  UpgradeModal: () => null,
}));
jest.mock('@/components/forms/category-form', () => ({
  CategoryForm: () => null,
}));
jest.mock('@/lib/rates', () => ({ useActiveUsdVesRate: () => 36.5 }));
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn() } }));
const mockToast = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToast('success', ...a),
    error: (...a: unknown[]) => mockToast('error', ...a),
  },
}));
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));
const account = {
  id: 'cash-usd',
  name: 'Cash USD',
  type: 'CASH' as any,
  currencyCode: 'USD',
  active: true,
} as Account;
const category = {
  id: 'cat-1',
  name: 'General',
  kind: 'EXPENSE' as any,
  active: true,
} as Category;
// `require` re-uses the jest.mock factory's repo instance.
const repositoryMock = require('@/providers').__repo;
repositoryMock.accounts.findByUserId.mockResolvedValue([account]);
repositoryMock.categories.findAll.mockResolvedValue([category]);
const createMock = repositoryMock.transactions.create;

describe('TransactionForm canonical transfer escape hatch', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: 'tx-1' });
    mockReplace.mockReset();
    mockToast.mockReset();
  });

  it('redirects to /transfers when Transfer is selected and persists nothing', async () => {
    render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        type={TransactionType.EXPENSE}
      />
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Transferencia' })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    expect(mockReplace).toHaveBeenCalledWith('/transfers');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('never persists a lone TRANSFER_OUT even when the form starts with one', async () => {
    const { container } = render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        type={TransactionType.TRANSFER_OUT}
      />
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Monto')).toBeInTheDocument();
    });
    // Required fields must be filled for jsdom to dispatch the submit event.
    fireEvent.change(screen.getByLabelText('Monto'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Cuenta'), {
      target: { value: 'cash-usd' },
    });
    const selects = Array.from(
      container.querySelectorAll('select')
    ) as HTMLSelectElement[];
    const categorySelect = selects.find((s) =>
      Array.from(s.options).some(
        (o) => o.textContent === 'Seleccionar categoría'
      )
    );
    expect(categorySelect).toBeDefined();
    fireEvent.change(categorySelect!, { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Detalle' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/transfers');
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
