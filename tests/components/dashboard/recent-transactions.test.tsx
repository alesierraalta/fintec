import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import type { Category, Transaction } from '@/types/domain';
import { CategoryKind, TransactionType } from '@/types/domain';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.EXPENSE,
    accountId: 'account-1',
    categoryId: 'category-1',
    currencyCode: 'USD',
    amountMinor: 10000,
    amountBaseMinor: 10000,
    exchangeRate: 1,
    date: '2026-04-30',
    createdAt: '2026-04-30T00:00:00Z',
    updatedAt: '2026-04-30T00:00:00Z',
    ...overrides,
  };
}

const category: Category = {
  id: 'category-1',
  name: 'Supermercado',
  kind: CategoryKind.EXPENSE,
  color: '#000000',
  icon: 'shopping-cart',
  active: true,
  userId: null,
  isDefault: true,
  createdAt: '2026-04-30T00:00:00Z',
  updatedAt: '2026-04-30T00:00:00Z',
};

describe('RecentTransactions category labels', () => {
  it('renders the category name when the category catalog is available', () => {
    render(
      <RecentTransactions
        transactions={[makeTransaction()]}
        categories={[category]}
      />
    );

    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.queryByText('Categoría')).not.toBeInTheDocument();
  });

  it('uses a truthful fallback when no category catalog is available', () => {
    render(<RecentTransactions transactions={[makeTransaction()]} />);

    expect(screen.getByText('Categoría no disponible')).toBeInTheDocument();
    expect(screen.queryByText('Categoría')).not.toBeInTheDocument();
  });
});
