import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { TransactionType } from '@/types';

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

function makeTransaction(
  overrides: Partial<
    Parameters<typeof RecentTransactions>[0]['transactions'][0]
  > = {}
) {
  return {
    id: 'tx-1',
    type: TransactionType.EXPENSE,
    accountId: 'acc-1',
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

describe('RecentTransactions', () => {
  test('renders real transaction description when available', () => {
    const transactions = [
      makeTransaction({ description: 'Supermercado Central' }),
    ];

    render(<RecentTransactions transactions={transactions} />);

    expect(screen.getByText('Supermercado Central')).toBeInTheDocument();
  });

  test('falls back to default text when description is missing', () => {
    const transactions = [makeTransaction({ description: undefined })];

    render(<RecentTransactions transactions={transactions} />);

    expect(screen.getByText('Transacción sin descripción')).toBeInTheDocument();
  });

  test('renders multiple transactions with mixed descriptions', () => {
    const transactions = [
      makeTransaction({ id: 'tx-1', description: 'Cine' }),
      makeTransaction({ id: 'tx-2', description: undefined }),
      makeTransaction({ id: 'tx-3', description: 'Gasolina' }),
    ];

    render(<RecentTransactions transactions={transactions} />);

    expect(screen.getByText('Cine')).toBeInTheDocument();
    expect(screen.getByText('Transacción sin descripción')).toBeInTheDocument();
    expect(screen.getByText('Gasolina')).toBeInTheDocument();
  });
});
