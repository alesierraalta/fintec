import React from 'react';
import { render, screen } from '@testing-library/react';
import dayjs from '@/lib/dates/dayjs';

jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: jest.fn(),
}));
jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: jest.fn(),
}));
jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: jest.fn(),
}));
jest.mock('lucide-react', () => ({
  ArrowDownToLine: () => <svg aria-hidden="true" />,
  DollarSign: () => <svg aria-hidden="true" />,
  Package: () => <svg aria-hidden="true" />,
}));

import { IncomeSources } from '@/components/dashboard/income-sources';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';

describe('IncomeSources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOptimizedData as jest.Mock).mockReturnValue({
      transactions: [],
      categories: [],
      loading: false,
    });
    (useCurrencyConverter as jest.Mock).mockReturnValue({ convert: jest.fn() });
    (useActiveUsdVesRate as jest.Mock).mockReturnValue(50);
  });

  it('groups current-month income by category and displays minor-unit amounts', () => {
    render(
      <IncomeSources
        categories={
          [
            { id: 'salary', name: 'Salario' },
            { id: 'freelance', name: 'Freelance' },
          ] as any
        }
        transactions={
          [
            {
              type: 'INCOME',
              amountMinor: 10000,
              currencyCode: 'USD',
              categoryId: 'salary',
              date: dayjs().toISOString(),
            },
            {
              type: 'INCOME',
              amountMinor: 2500,
              currencyCode: 'USD',
              categoryId: 'salary',
              date: dayjs().toISOString(),
            },
            {
              type: 'INCOME',
              amountMinor: 5000,
              currencyCode: 'USD',
              categoryId: 'freelance',
              date: dayjs().toISOString(),
            },
            {
              type: 'EXPENSE',
              amountMinor: 99900,
              currencyCode: 'USD',
              categoryId: 'salary',
              date: dayjs().toISOString(),
            },
          ] as any
        }
      />
    );

    expect(screen.getByText('Salario')).toBeInTheDocument();
    expect(screen.getByText('$125.00')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('shows a clear empty state when there is no current-month income', () => {
    render(<IncomeSources transactions={[]} categories={[]} />);

    expect(
      screen.getByText(/Todavía no hay ingresos registrados este mes/i)
    ).toBeInTheDocument();
  });
});
