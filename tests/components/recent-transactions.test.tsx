import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  test('preserves native VES amount and activates callback rows from keyboard', () => {
    const onTransactionClick = jest.fn();
    render(
      <RecentTransactions
        transactions={[
          makeTransaction({ currencyCode: 'VES', amountMinor: 10000 }),
        ]}
        bcvRates={{ usd: 50, eur: 55 }}
        binanceRates={{ usd_ves: 50 }}
        onTransactionClick={onTransactionClick}
      />
    );

    const row = screen.getByRole('button');
    expect(row).toHaveClass('focus-ring');
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onTransactionClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/~\$2\.00/)).toBeInTheDocument();
  });

  test('does not advertise a row as interactive without a callback', () => {
    render(
      <RecentTransactions
        transactions={[makeTransaction({ description: 'Solo lectura' })]}
      />
    );
    expect(
      screen.queryByRole('button', { name: /Solo lectura/i })
    ).not.toBeInTheDocument();
  });
});
