import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TransactionsPage from '@/app/transactions/transactions-page-client';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { TransactionType } from '@/types/domain';
import type { Transaction } from '@/types/domain';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/transactions',
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

jest.mock('@/components/filters/transaction-filters', () => ({
  TransactionFilters: () => null,
}));

jest.mock('@/components/ui/collapsible-section', () => ({
  CollapsibleSection: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));

jest.mock('@/components/transactions/add-transaction-menu', () => ({
  AddTransactionMenu: ({
    label,
    onAddSingle,
  }: {
    label: string;
    onAddSingle: () => void;
  }) => (
    <button type="button" onClick={onAddSingle}>
      {label}
    </button>
  ),
}));

jest.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({
    title,
    description,
    actionLabel,
    onAction,
  }: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
}));

jest.mock('@/components/transactions/transaction-actions-dropdown', () => ({
  TransactionActionsDropdown: () => null,
}));

jest.mock('@/components/transactions/transaction-detail-panel', () => ({
  TransactionDetailPanel: () => null,
}));

jest.mock('@/components/ui/swipeable-card', () => ({
  SwipeableCard: () => null,
}));

jest.mock('@/hooks', () => ({
  useMediaQuery: () => false,
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: jest.fn(),
}));

jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: () => ({
    convert: jest.fn(() => 0),
    convertToUSD: jest.fn(() => 0),
  }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 50,
}));

jest.mock('@/lib/store', () => ({
  useAppStore: (selector: (state: { selectedRateSource: string }) => unknown) =>
    selector({ selectedRateSource: 'bcv_usd' }),
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: class {
    observe() {}
    disconnect() {}
  },
});

const mockedUseOptimizedData = useOptimizedData as jest.Mock;

function makeTransaction(): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.EXPENSE,
    accountId: 'account-1',
    currencyCode: 'USD',
    amountMinor: 10000,
    amountBaseMinor: 10000,
    exchangeRate: 1,
    date: '2026-04-30',
    description: 'Alquiler',
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
  };
}

function setData(transactions: Transaction[]) {
  mockedUseOptimizedData.mockReturnValue({
    transactions,
    accounts: [],
    categories: [],
    loading: false,
    loadAllData: jest.fn(),
    deleteTransaction: jest.fn(),
  });
}

describe('TransactionsPage empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('distinguishes filtered no-results from the first-use empty state', () => {
    setData([makeTransaction()]);
    mockSearchParams = new URLSearchParams('search=nomatch');

    render(<TransactionsPage />);

    expect(
      screen.getByRole('heading', { name: 'Sin resultados' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Limpiar filtros' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('¡Comienza tu Gestión Financiera!')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(mockReplace).toHaveBeenCalledWith('/transactions', {
      scroll: false,
    });
  });

  it('keeps the create action for a truly empty transaction list', () => {
    setData([]);

    render(<TransactionsPage />);

    expect(
      screen.getByText('¡Comienza tu Gestión Financiera!')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Crear Primera Transacción' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Sin resultados' })
    ).not.toBeInTheDocument();
  });
});
