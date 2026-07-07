/**
 * Smoke tests for the debt-only UI additions in TransactionForm:
 *   - "Descontar de cuenta" toggle
 *   - Currency-filtered source-account picker
 *   - Disabled state when no eligible account exists
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { DebtDirection, DebtStatus, TransactionType } from '@/types';
import type { Account, Category } from '@/types/domain';

// Mock heavy dependencies so the component only renders its UI.
// IMPORTANT: mocks must return STABLE references; otherwise the form's
// useEffect on `[isOpen, user, repository]` will re-run on every render
// and trip React's "Maximum update depth" guard.
jest.mock('@/providers', () => {
  const repo = {
    accounts: { findByUserId: jest.fn().mockResolvedValue([]) },
    categories: { findAll: jest.fn().mockResolvedValue([]) },
    transactions: {
      create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      update: jest.fn(),
    },
  };
  return {
    useRepository: () => repo,
    __repo: repo,
  };
});

const authState = { user: { id: 'user-1' } };
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const subState = {
  usageStatus: { transactions: { used: 0, limit: 100 } },
  isAtLimit: () => false,
  tier: 'free',
};
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => subState,
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

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 36.5,
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const pushToast = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => pushToast('success', ...args),
    error: (...args: any[]) => pushToast('error', ...args),
  },
}));

const accounts: Account[] = [
  {
    id: 'cash-usd',
    name: 'Cash USD',
    type: 'CASH' as any,
    currencyCode: 'USD',
    balance: 100000,
    active: true,
    createdAt: '2026-07-06T00:00:00Z',
    updatedAt: '2026-07-06T00:00:00Z',
  },
  {
    id: 'savings-usd',
    name: 'Savings USD',
    type: 'SAVINGS' as any,
    currencyCode: 'USD',
    balance: 50000,
    active: true,
    createdAt: '2026-07-06T00:00:00Z',
    updatedAt: '2026-07-06T00:00:00Z',
  },
  {
    id: 'cash-ves',
    name: 'Cash VES',
    type: 'CASH' as any,
    currencyCode: 'VES',
    balance: 0,
    active: true,
    createdAt: '2026-07-06T00:00:00Z',
    updatedAt: '2026-07-06T00:00:00Z',
  },
];

const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'General',
    kind: 'EXPENSE' as any,
    color: '#000',
    icon: 'tag',
    active: true,
    userId: 'user-1',
    isDefault: true,
    createdAt: '2026-07-06T00:00:00Z',
    updatedAt: '2026-07-06T00:00:00Z',
  },
];

// `require` here (not import) so the test module can re-use the repo
// mock the jest.mock factory installed at the top of the file.
const repositoryMock = require('@/providers').__repo;
repositoryMock.accounts.findByUserId.mockResolvedValue(accounts);
repositoryMock.categories.findAll.mockResolvedValue(categories);

const createMock = repositoryMock.transactions.create;

describe('TransactionForm debt deduction UI', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: 'tx-1' });
    pushToast.mockReset();
  });

  it('shows the deduct toggle and source picker when a debt is created', async () => {
    render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        debtMode="create"
        type={TransactionType.EXPENSE}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Descontar de cuenta')).toBeInTheDocument();
    });
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

    fireEvent.change(screen.getByLabelText('Monto'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText('Cuenta'), {
      target: { value: 'cash-ves' },
    });
    fireEvent.change(categorySelect!, { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Debt without source account' },
    });
    fireEvent.change(screen.getByLabelText('Direccion'), {
      target: { value: DebtDirection.OWE },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isDebt: true,
        deductFromAccount: false,
      })
    );
    expect(createMock.mock.calls[0][0].sourceAccountId).toBeUndefined();
  });

  it('hides the source picker when the user un-toggles deduct', async () => {
    render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        debtMode="create"
        type={TransactionType.EXPENSE}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Descontar de cuenta')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Cuenta'), {
      target: { value: 'cash-usd' },
    });

    const toggle = screen.getByLabelText(
      'Descontar de cuenta'
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle.checked).toBe(false);
    });
    // Picker should disappear once the toggle is off.
    expect(screen.queryByLabelText('Cuenta de origen')).not.toBeInTheDocument();
  });

  it('forwards deductFromAccount and sourceAccountId to the repository on submit', async () => {
    const { container } = render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        debtMode="create"
        type={TransactionType.EXPENSE}
      />
    );

    // Wait for the form to be ready.
    await waitFor(() => {
      expect(screen.getByLabelText('Descontar de cuenta')).toBeInTheDocument();
    });

    // The category <select> is not linked to its label via `htmlFor`, so we
    // find it by selecting the only <select> whose first option label is
    // "Seleccionar categoría" (the placeholder text).
    const selects = Array.from(
      container.querySelectorAll('select')
    ) as HTMLSelectElement[];
    const categorySelect = selects.find((s) =>
      Array.from(s.options).some(
        (o) => o.textContent === 'Seleccionar categoría'
      )
    );
    expect(categorySelect).toBeDefined();

    // Fill the required fields.
    fireEvent.change(screen.getByLabelText('Monto'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Cuenta'), {
      target: { value: 'cash-usd' },
    });
    fireEvent.change(categorySelect!, { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Borrowed 50' },
    });
    fireEvent.change(screen.getByLabelText('Direccion'), {
      target: { value: DebtDirection.OWE },
    });
    // Pick the other USD account as the source.
    fireEvent.change(screen.getByLabelText('Cuenta de origen'), {
      target: { value: 'savings-usd' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isDebt: true,
        debtDirection: DebtDirection.OWE,
        deductFromAccount: true,
        sourceAccountId: 'savings-usd',
      })
    );
  });
});
