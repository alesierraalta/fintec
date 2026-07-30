import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TransactionDetailPanel } from '@/components/transactions/transaction-detail-panel';
import { TransactionType } from '@/types/domain';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';

jest.mock('@/lib/services/bcv-history-service', () => ({
  bcvHistoryService: {
    getRatesForDate: jest.fn(),
    getLatestRate: jest.fn(),
  },
}));

jest.mock('@/lib/services/binance-history-service', () => ({
  binanceHistoryService: {
    getRatesForDate: jest.fn(),
    getLatestRate: jest.fn(),
  },
}));

describe('TransactionDetailPanel - Historical Rates Display', () => {
  const mockTransaction = {
    id: 'tx-123',
    type: TransactionType.EXPENSE,
    accountId: 'acc-1',
    categoryId: 'cat-1',
    currencyCode: 'VES',
    amountMinor: 4214545, // 42,145.45 VES
    amountBaseMinor: 4214545,
    exchangeRate: 1,
    date: '2026-06-22T00:00:00.000Z',
    description: 'patinaje',
    createdAt: '2026-06-22T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays historical rates for transaction date when available without fallback', async () => {
    (bcvHistoryService.getRatesForDate as jest.Mock).mockResolvedValue({
      date: '2026-06-22',
      usd: 744.23,
      eur: 846.07,
    });
    (binanceHistoryService.getRatesForDate as jest.Mock).mockResolvedValue({
      date: '2026-06-22',
      usd: 845.73,
    });

    render(
      <TransactionDetailPanel
        transaction={mockTransaction}
        isOpen={true}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        isMobile={false}
        accountName="Mercantil"
        categoryName="Sophi"
        formatAmount={(minor) => (minor / 100).toLocaleString('es-VE')}
        getCurrencySymbol={() => 'Bs.'}
      />
    );

    await waitFor(() => {
      expect(bcvHistoryService.getRatesForDate).toHaveBeenCalledWith(
        '2026-06-22'
      );
      expect(binanceHistoryService.getRatesForDate).toHaveBeenCalledWith(
        '2026-06-22'
      );
    });

    // Ensure getLatestRate was NOT called
    expect(bcvHistoryService.getLatestRate).not.toHaveBeenCalled();
    expect(binanceHistoryService.getLatestRate).not.toHaveBeenCalled();

    // Verify date header
    expect(screen.getByText('Tasas al 22/06/2026')).toBeInTheDocument();

    // Verify rates values
    expect(screen.getAllByText('1 USD = 744.23 Bs')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1 EUR = 846.07 Bs')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1 USDT = 845.73 Bs')[0]).toBeInTheDocument();
  });

  it('displays missing historical rate notice when no rates exist for date and does not fallback to latest', async () => {
    (bcvHistoryService.getRatesForDate as jest.Mock).mockResolvedValue(null);
    (binanceHistoryService.getRatesForDate as jest.Mock).mockResolvedValue(
      null
    );

    render(
      <TransactionDetailPanel
        transaction={mockTransaction}
        isOpen={true}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        isMobile={false}
        accountName="Mercantil"
        categoryName="Sophi"
        formatAmount={(minor) => (minor / 100).toLocaleString('es-VE')}
        getCurrencySymbol={() => 'Bs.'}
      />
    );

    await waitFor(() => {
      expect(bcvHistoryService.getRatesForDate).toHaveBeenCalledWith(
        '2026-06-22'
      );
      expect(binanceHistoryService.getRatesForDate).toHaveBeenCalledWith(
        '2026-06-22'
      );
    });

    expect(bcvHistoryService.getLatestRate).not.toHaveBeenCalled();
    expect(binanceHistoryService.getLatestRate).not.toHaveBeenCalled();

    // Header still reflects transaction date
    expect(screen.getByText('Tasas al 22/06/2026')).toBeInTheDocument();

    // Message shows exact date
    expect(
      screen.getByText('No hay tasas históricas disponibles para el 22/06/2026')
    ).toBeInTheDocument();
  });
  it('displays fallback rate from nearest prior date when exact date is missing', async () => {
    // Service returns a rate from 20/06/2026 (weekend) instead of 22/06/2026
    (bcvHistoryService.getRatesForDate as jest.Mock).mockResolvedValue({
      date: '2026-06-20',
      usd: 740.0,
      eur: 840.0,
    });
    (binanceHistoryService.getRatesForDate as jest.Mock).mockResolvedValue({
      date: '2026-06-20',
      usd: 839.5,
    });

    render(
      <TransactionDetailPanel
        transaction={mockTransaction}
        isOpen={true}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        isMobile={false}
        accountName="Mercantil"
        categoryName="Sophi"
        formatAmount={(minor) => (minor / 100).toLocaleString('es-VE')}
        getCurrencySymbol={() => 'Bs.'}
      />
    );

    await waitFor(() => {
      expect(bcvHistoryService.getRatesForDate).toHaveBeenCalledWith(
        '2026-06-22'
      );
    });

    // Date label heading contains the fallback date
    await waitFor(() => {
      const heading = screen.getByRole('heading', {
        name: /Tasas al 20\/06\/2026/,
        hidden: true,
      });
      expect(heading).toBeInTheDocument();
    });

    // Fallback indicator is shown
    expect(screen.getByText('(última disponible)')).toBeInTheDocument();

    // Rate values are from the fallback record
    expect(screen.getAllByText('1 USD = 740.00 Bs')[0]).toBeInTheDocument();
  });
});
