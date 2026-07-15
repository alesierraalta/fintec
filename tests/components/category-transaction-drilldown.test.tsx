import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Category, Transaction } from '@/types';

jest.mock('framer-motion', () => ({
  AnimatePresence: (p: { children: React.ReactNode }) => <>{p.children}</>,
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...pp }, ref) => (
        <div ref={ref} {...pp}>
          {children}
        </div>
      )
    ),
  },
}));

const cat = (o: Partial<Category> = {}): Category =>
  ({
    id: 'c',
    name: 'Test',
    kind: 'EXPENSE',
    color: '',
    icon: '',
    active: true,
    userId: '',
    isDefault: false,
    createdAt: '',
    updatedAt: '',
    ...o,
  }) as Category;
const tx = (o: Partial<Transaction> = {}): Transaction => ({
  id: 't',
  type: 'EXPENSE' as const,
  accountId: '',
  categoryId: '',
  currencyCode: 'USD',
  amountMinor: 1000,
  amountBaseMinor: 1000,
  exchangeRate: 1,
  date: '',
  description: '',
  createdAt: '',
  updatedAt: '',
  ...o,
});

const ff = jest.fn();
const repo = { transactions: { findByFilters: ff } };
const onClose = jest.fn();
const onEdit = jest.fn();

let C: typeof import('@/components/categories/category-transaction-drilldown').CategoryTransactionDrilldown;
beforeAll(async () => {
  C = (await import('@/components/categories/category-transaction-drilldown'))
    .CategoryTransactionDrilldown;
});

const r = (e: Record<string, unknown> = {}) =>
  render(
    <C
      category={cat()}
      categories={[cat()]}
      repository={repo}
      refreshKey={0}
      onClose={onClose}
      onEdit={onEdit}
      {...e}
    />
  );
const m = (o: Record<string, unknown> = {}) =>
  ff.mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
    ...o,
  });

describe('Drilldown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('hierarchy+toggle', async () => {
    const cats = [cat({ id: 'p' }), cat({ id: 'c', parentId: 'p' })];
    m();
    render(
      <C
        category={cats[0]}
        categories={cats}
        repository={repo}
        refreshKey={0}
        onClose={onClose}
        onEdit={onEdit}
      />
    );
    await waitFor(() =>
      expect(ff).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: expect.arrayContaining(['p', 'c']),
        }),
        expect.any(Object)
      )
    );
    await userEvent.click(screen.getByRole('switch'));
    await waitFor(() =>
      expect(ff).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryIds: ['p'] }),
        expect.any(Object)
      )
    );
  });
  it('inverted range clears', async () => {
    m({
      data: [tx({ description: 'X' })],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    r();
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/from/i), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText(/to/i), {
      target: { value: '2026-06-01' },
    });
    await waitFor(() =>
      expect(
        screen.getAllByText(/start date must be before/i).length
      ).toBeGreaterThanOrEqual(1)
    );
    await waitFor(() =>
      expect(screen.queryByText('X')).not.toBeInTheDocument()
    );
  });
  it('states: loading,error,empty', async () => {
    ff.mockReturnValue(new Promise(() => {}));
    r();
    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
    ff.mockRejectedValue(new Error('E'));
    r();
    await waitFor(() => expect(screen.getByText('E')).toBeInTheDocument());
    m();
    r();
    await waitFor(() =>
      expect(
        screen.getByText(/no transactions for this category/i)
      ).toBeInTheDocument()
    );
  });
  it('pagination+refreshKey', async () => {
    m({
      data: [tx()],
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
    r();
    await waitFor(() => {
      expect(screen.getByLabelText(/previous page/i)).toBeDisabled();
      expect(screen.getByLabelText(/next page/i)).not.toBeDisabled();
    });
    await userEvent.click(screen.getByLabelText(/next page/i));
    await waitFor(() => {
      const calls = ff.mock.calls;
      expect(calls[calls.length - 1][1]).toMatchObject({ page: 2 });
    });
    const c = cat();
    m();
    const { rerender } = render(
      <C
        category={c}
        categories={[c]}
        repository={repo}
        refreshKey={0}
        onClose={onClose}
        onEdit={onEdit}
      />
    );
    await waitFor(() => expect(ff).toHaveBeenCalledTimes(3));
    rerender(
      <C
        category={c}
        categories={[c]}
        repository={repo}
        refreshKey={1}
        onClose={onClose}
        onEdit={onEdit}
      />
    );
    await waitFor(() => expect(ff).toHaveBeenCalledTimes(4));
  });
  it('stale-guard', async () => {
    let resolveOld!: (v: any) => void;
    ff.mockReturnValueOnce(
      new Promise<any>((r) => {
        resolveOld = r;
      })
    );
    ff.mockResolvedValue({
      data: [tx({ description: 'New' })],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
    r();
    await userEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(ff).toHaveBeenCalledTimes(2));
    resolveOld({
      data: [tx({ description: 'Stale' })],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    await new Promise((r) => setTimeout(r, 50));
    await waitFor(() =>
      expect(screen.queryByText('Stale')).not.toBeInTheDocument()
    );
  });
  it('a11y+responsive', async () => {
    m({
      data: [tx()],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    r({ category: cat({ name: 'MyCat' }) });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getAllByText('MyCat').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('button', { name: /edit.*transaction/i }).className
      ).toMatch(/min-h-\[44px\]/);
      const d = screen.getByRole('dialog');
      expect(d.className).toMatch(/h-\[100dvh\]/);
      expect(d.className).toMatch(/sm:w-\[min\(42rem,100vw\)\]/);
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
