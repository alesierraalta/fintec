import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryKind, TransactionType } from '@/types';
import type { Category, Transaction } from '@/types';

// ── Shared mutable store for drilldown mock ──
const txStore: { current: Transaction[] } = { current: [] };

jest.mock('@/providers/repository-provider', () => ({
  useRepository: jest.fn(() => ({
    transactions: { findByFilters: jest.fn() },
    categories: {
      findAll: jest.fn(),
      canDelete: jest.fn().mockResolvedValue(true),
      delete: jest.fn(),
    },
    accounts: { findByUserId: jest.fn() },
  })),
}));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'u1' } })),
}));
jest.mock('@/hooks', () => ({
  useModal: jest.fn(() => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  })),
}));
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: jest.fn(),
}));
jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: jest.fn(() => ({
    convertToUSD: jest.fn((a: number) => a / 100),
  })),
}));
jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@/lib/currency-ves', () => ({
  formatCurrencyWithBCV: jest.fn(() => 'Bs. 0,00'),
}));

// Drilldown mock — caches by refreshKey for recategorization causality
jest.mock('@/components/categories/category-transaction-drilldown', () => ({
  CategoryTransactionDrilldown: jest.fn(({ category, onEdit, refreshKey }) => {
    const cachedTxs = React.useMemo(() => txStore.current, [refreshKey]);
    return category ? (
      <div data-testid="drilldown">
        <span data-testid="rk">{refreshKey}</span>
        {cachedTxs
          .filter((tx) => tx.categoryId === category.id)
          .map((tx) => (
            <div key={tx.id} data-testid={`tx-${tx.id}`}>
              <span>{tx.description}</span>
              <button
                aria-label="Edit transaction"
                onClick={() => onEdit?.(tx)}
              >
                E
              </button>
            </div>
          ))}
        <button aria-label="Close" onClick={() => {}}>
          X
        </button>
      </div>
    ) : null;
  }),
}));

// TransactionForm mock — auto-fires onSuccess via microtask
jest.mock('@/components/forms/transaction-form', () => ({
  TransactionForm: jest.fn(({ isOpen, onSuccess }) => {
    React.useEffect(() => {
      if (isOpen && onSuccess) {
        const id = setTimeout(onSuccess);
        return () => clearTimeout(id);
      }
    }, [isOpen, onSuccess]);
    return isOpen ? <div data-testid="tx-form" /> : null;
  }),
}));

// FormatCurrency spy — sentinel proves shared-formatter delegation
jest.mock('@/lib/money', () => {
  const actual = jest.requireActual('@/lib/money');
  return { ...actual, formatCurrency: jest.fn((a, c) => `!${a}!${c}!`) };
});

// ── Typed fixtures (no unsafe casts) ──
const cat = (o: Partial<Category> = {}): Category => ({
  id: 'c1',
  name: 'Food',
  kind: CategoryKind.EXPENSE,
  color: '#f00',
  icon: 'UtensilsCrossed',
  active: true,
  userId: 'u1',
  isDefault: false,
  createdAt: '',
  updatedAt: '',
  ...o,
});

const tx = (o: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: TransactionType.EXPENSE,
  accountId: 'a1',
  categoryId: 'c1',
  currencyCode: 'USD',
  amountMinor: 1050,
  amountBaseMinor: 1050,
  exchangeRate: 1,
  date: '2026-07-01',
  description: 'Groceries',
  createdAt: '',
  updatedAt: '',
  ...o,
});

// ── Setup ──
const mockInvalidateCache = jest.fn();
const mockLoadAllData = jest.fn();

function setupMocks(cats: Category[] = [cat()], txs: Transaction[] = [tx()]) {
  txStore.current = txs;
  mockInvalidateCache.mockClear();
  mockLoadAllData.mockClear();
  mockLoadAllData.mockResolvedValue(undefined);
  const { useOptimizedData } = require('@/hooks/use-optimized-data');
  useOptimizedData.mockReturnValue({
    categories: cats,
    transactions: txs,
    accounts: [],
    loading: false,
    invalidateCache: mockInvalidateCache,
    loadAllData: mockLoadAllData,
  });
}

// ── Helper: assert accessible name + both 44px dimensions ──
function assert44px(name: RegExp) {
  const btn = screen.getByRole('button', { name });
  expect(btn.className).toMatch(/min-h-\[44px\]/);
  expect(btn.className).toMatch(/min-w-\[44px\]/);
}

// ── Tests ──
describe('CategoriesPage Slice 2', () => {
  let Page: typeof import('@/app/categories/page').default;

  beforeAll(async () => {
    Page = (await import('@/app/categories/page')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Fix 1 + Fix 4 (a11y + 44px): All action buttons in both modes
  it('all action buttons have accessible names and 44px targets in grid and list modes', async () => {
    setupMocks();
    render(<Page />);

    for (const mode of ['grid', 'list'] as const) {
      if (mode === 'list')
        await userEvent.click(screen.getByRole('button', { name: /lista/i }));
      assert44px(/view category food/i);
      assert44px(/edit category food/i);
      assert44px(/delete category food/i);
      assert44px(/add subcategory to food/i);
    }
    await userEvent.click(
      screen.getByRole('button', { name: /view category food/i })
    );
    await waitFor(() =>
      expect(screen.getByTestId('drilldown')).toBeInTheDocument()
    );
  });

  // Fix 2: No mount-time cache invalidation
  it('does not call invalidateCache or loadAllData on mount', () => {
    setupMocks();
    render(<Page />);
    expect(mockInvalidateCache).not.toHaveBeenCalled();
    expect(mockLoadAllData).not.toHaveBeenCalled();
  });

  // Fix 4: RefreshKey increments only after loadAllData resolves
  it('increments refreshKey only after loadAllData resolves', async () => {
    let resolveLoad!: () => void;
    setupMocks();
    mockLoadAllData.mockReset();
    mockLoadAllData.mockReturnValue(
      new Promise<void>((r) => {
        resolveLoad = r;
      })
    );
    render(<Page />);

    await userEvent.click(
      screen.getByRole('button', { name: /view category food/i })
    );
    await waitFor(() =>
      expect(screen.getByTestId('drilldown')).toBeInTheDocument()
    );
    expect(screen.getByTestId('rk').textContent).toBe('0');
    await userEvent.click(
      screen.getByRole('button', { name: /edit transaction/i })
    );
    await waitFor(() =>
      expect(mockInvalidateCache).toHaveBeenCalledWith('transactions')
    );
    expect(screen.getByTestId('rk').textContent).toBe('0');
    await act(async () => {
      resolveLoad();
    });
    await waitFor(() => expect(screen.getByTestId('rk').textContent).toBe('1'));
  });

  // Recategorization proof: row persists while reload is pending, gone only after resolve
  it('removes drilldown row only after recategorization reload resolves', async () => {
    let resolveLoad!: () => void;
    setupMocks(
      [cat()],
      [tx({ id: 't1', categoryId: 'c1', description: 'Groceries' })]
    );
    mockLoadAllData.mockReset();
    mockLoadAllData.mockReturnValue(
      new Promise<void>((r) => {
        resolveLoad = r;
      })
    );
    render(<Page />);

    await userEvent.click(
      screen.getByRole('button', { name: /view category food/i })
    );
    await waitFor(() =>
      expect(screen.getByTestId('tx-t1')).toBeInTheDocument()
    );

    txStore.current = [
      tx({ id: 't1', categoryId: 'c2', description: 'Groceries' }),
    ];

    await userEvent.click(
      screen.getByRole('button', { name: /edit transaction/i })
    );
    await waitFor(() => expect(mockInvalidateCache).toHaveBeenCalled());
    // Row must survive while reload is pending
    expect(screen.getByTestId('tx-t1')).toBeInTheDocument();
    expect(screen.getByTestId('rk').textContent).toBe('0');

    await act(async () => {
      resolveLoad();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('tx-t1')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('rk').textContent).toBe('1');
  });

  // Fix 5: Shared formatCurrency delegation with sentinel proof
  it('delegates money display to shared formatCurrency', () => {
    const { formatCurrency } = require('@/lib/money');
    formatCurrency.mockReturnValue('$SENTINEL$');

    setupMocks(
      [cat({ id: 'c1', name: 'Food' })],
      [tx({ amountMinor: 1050, currencyCode: 'USD' })]
    );
    render(<Page />);
    expect(formatCurrency).toHaveBeenCalledWith(1050, 'USD');
    expect(screen.getAllByText('$SENTINEL$').length).toBeGreaterThanOrEqual(1);
  });

  // Card counts must match what the drilldown opens by default: the category
  // PLUS its descendants. A parent with 3 direct and 4 subcategory
  // transactions must show 7, not 3.
  it('card transaction count includes descendant categories', () => {
    setupMocks(
      [
        cat({ id: 'p1', name: 'Food' }),
        cat({ id: 'c1', name: 'Delivery', parentId: 'p1' }),
      ],
      [
        tx({ id: 'd1', categoryId: 'p1' }),
        tx({ id: 'd2', categoryId: 'p1' }),
        tx({ id: 'd3', categoryId: 'p1' }),
        tx({ id: 's1', categoryId: 'c1' }),
        tx({ id: 's2', categoryId: 'c1' }),
        tx({ id: 's3', categoryId: 'c1' }),
        tx({ id: 's4', categoryId: 'c1' }),
      ]
    );
    render(<Page />);

    // Parent card: subtree count (3 direct + 4 in Delivery).
    expect(screen.getByText('7')).toBeInTheDocument();
    // Child card keeps its own subtree count (4, no descendants).
    expect(screen.getByText('4')).toBeInTheDocument();
    // The direct-only parent count must be gone.
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  // Card count and drilldown must walk the SAME visibility-filtered category
  // universe: a foreign-user child (data-integrity edge the service does not
  // prevent) is excluded from the count AND from the categories the drilldown
  // receives, so the pair cannot diverge again.
  it('count and drilldown share the visibility-filtered category universe', async () => {
    setupMocks(
      [
        cat({ id: 'p1', name: 'Food' }),
        cat({ id: 'cx', name: 'Foreign', parentId: 'p1', userId: 'u2' }),
      ],
      [
        tx({ id: 'd1', categoryId: 'p1' }),
        tx({ id: 'd2', categoryId: 'p1' }),
        tx({ id: 'd3', categoryId: 'p1' }),
        tx({ id: 'f1', categoryId: 'cx' }),
        tx({ id: 'f2', categoryId: 'cx' }),
        tx({ id: 'f3', categoryId: 'cx' }),
        tx({ id: 'f4', categoryId: 'cx' }),
      ]
    );
    render(<Page />);

    // Foreign child is outside the user's visible universe: count stays 3.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('7')).not.toBeInTheDocument();

    // Opening the drilldown hands it the same filtered universe.
    await userEvent.click(
      screen.getByRole('button', { name: /view category food/i })
    );
    const {
      CategoryTransactionDrilldown,
    } = require('@/components/categories/category-transaction-drilldown');
    const lastProps = CategoryTransactionDrilldown.mock.calls.at(-1)?.[0] ?? {};
    const ids = (lastProps.categories ?? []).map((c: Category) => c.id);
    expect(ids).toContain('p1');
    expect(ids).not.toContain('cx');
  });
});
