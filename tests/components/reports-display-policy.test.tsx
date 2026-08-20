import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Mock data + auth hooks so we drive the report rendering deterministically.
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: jest.fn(),
}));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

import { MobileReports } from '@/components/reports/mobile-reports';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useAuth } from '@/hooks/use-auth';
import { TransactionType, DebtDirection, DebtStatus } from '@/types';

function baseTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    type: TransactionType.INCOME,
    amountBaseMinor: 10000,
    amountMinor: 10000,
    currencyCode: 'USD',
    date: new Date().toISOString().split('T')[0],
    description: 'Salario',
    categoryId: 'salary',
    accountId: 'acc-1',
    isDebt: false,
    debtDirection: DebtDirection.OWED_TO_ME,
    debtStatus: DebtStatus.SETTLED,
    ...overrides,
  };
}

describe('Reports display policy (WU58)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'u1' },
      baseCurrency: 'USD',
    });
  });

  it('shows an honest unavailable state (not 0,00) when there are no totals', () => {
    (useOptimizedData as jest.Mock).mockReturnValue({
      transactions: [],
      categories: [],
      accounts: [],
      loading: false,
      loadAllData: jest.fn(),
    });

    render(<MobileReports />);

    // Three KPI cards (Ingresos / Gastos / Balance Neto) must disclose "Sin datos".
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThanOrEqual(3);
    // The empty total must NOT be presented as 0,00 anywhere in the KPI cards.
    const incomeCard = screen.getByText('Ingresos').closest('.rounded-2xl')!;
    expect(within(incomeCard as HTMLElement).queryByText(/0,00/)).toBeNull();
  });

  it('renders a historical total that is stable and equals the base-amount DTO', () => {
    (useOptimizedData as jest.Mock).mockReturnValue({
      transactions: [baseTransaction()],
      categories: [{ id: 'salary', name: 'Salario' }],
      accounts: [],
      loading: false,
      loadAllData: jest.fn(),
    });

    render(<MobileReports />);

    const incomeCard = screen.getByText('Ingresos').closest('.rounded-2xl')!;
    // Historical value derived from amountBaseMinor (stable, independent of live rate).
    expect(
      within(incomeCard as HTMLElement).getByText('$100,00')
    ).toBeInTheDocument();
    expect(within(incomeCard as HTMLElement).queryByText('Sin datos')).toBeNull();
  });
});
