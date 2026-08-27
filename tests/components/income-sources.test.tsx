import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, onClick, onMouseEnter, onMouseLeave }: any) => (
    <div data-testid="pie">
      {data.map((entry: any, index: number) => (
        <div
          key={entry.id}
          data-testid={`pie-cell-${index}`}
          onMouseEnter={() => onMouseEnter?.(null, index)}
          onMouseLeave={onMouseLeave}
          onClick={() => onClick?.(null, index)}
        >
          {entry.name}
        </div>
      ))}
    </div>
  ),
  Cell: () => null,
      Tooltip: () => <div data-testid="income-tooltip" />,
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

    expect(screen.getAllByText('Salario')).toHaveLength(2);
    expect(screen.getByText('$125.00')).toBeInTheDocument();
    expect(screen.getAllByText('Freelance')).toHaveLength(2);
    expect(screen.getByText('$50.00')).toBeInTheDocument();

    const chart = screen.getByRole('img', {
      name: 'Distribución de ingresos por categoría',
    });
    expect(chart).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText('Total de ingresos')).toBeInTheDocument();
    expect(screen.getByText('(71.4%)')).toBeInTheDocument();
    expect(screen.getByText('(28.6%)')).toBeInTheDocument();
    expect(chart).not.toContainElement(screen.getByRole('list'));

    fireEvent.mouseEnter(screen.getByTestId('pie-cell-0'));
    expect(screen.getByText('Salario · 71.4%')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId('pie-cell-0'));
    expect(screen.getByText('Total de ingresos')).toBeInTheDocument();

    const freelanceCell = screen.getByTestId('pie-cell-1');
    fireEvent.click(freelanceCell);
    expect(screen.getByText('Freelance · 28.6%')).toBeInTheDocument();
    fireEvent.mouseLeave(freelanceCell);
    expect(screen.getByText('Freelance · 28.6%')).toBeInTheDocument();
  });

  it('renders a loading state before income data is ready', () => {
    (useOptimizedData as jest.Mock).mockReturnValue({
      transactions: [],
      categories: [],
      loading: true,
    });

    render(<IncomeSources />);
    expect(screen.getByLabelText('Cargando ingresos')).toBeInTheDocument();
    expect(screen.queryByTestId('income-sources-chart')).not.toBeInTheDocument();
  });

  it('changes the persisted selection when a different slice is clicked', () => {
    const categories = [
      { id: 'salary', name: 'Salario' },
      { id: 'freelance', name: 'Freelance' },
    ];
    render(
      <IncomeSources
        categories={categories as any}
        transactions={[
          { type: 'INCOME', amountMinor: 10000, currencyCode: 'USD', categoryId: 'salary', date: dayjs().toISOString() },
          { type: 'INCOME', amountMinor: 5000, currencyCode: 'USD', categoryId: 'freelance', date: dayjs().toISOString() },
        ] as any}
      />
    );

    fireEvent.click(screen.getByTestId('pie-cell-0'));
    expect(screen.getByText('Salario · 66.7%')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pie-cell-1'));
    expect(screen.getByText('Freelance · 33.3%')).toBeInTheDocument();
  });

  it('clears selected income context when data is replaced', () => {
    const categories = [{ id: 'salary', name: 'Salario' }, { id: 'freelance', name: 'Freelance' }];
    const { rerender } = render(
      <IncomeSources
        categories={categories as any}
        transactions={[{ type: 'INCOME', amountMinor: 10000, currencyCode: 'USD', categoryId: 'salary', date: dayjs().toISOString() }] as any}
      />
    );
    fireEvent.click(screen.getByTestId('pie-cell-0'));
    expect(screen.getByText('Salario · 100%')).toBeInTheDocument();
    rerender(
      <IncomeSources
        categories={categories as any}
        transactions={[{ type: 'INCOME', amountMinor: 5000, currencyCode: 'USD', categoryId: 'freelance', date: dayjs().toISOString() }] as any}
      />
    );
    expect(screen.getByText('Total de ingresos')).toBeInTheDocument();
  });

  it('does not render a tooltip overlay', () => {
    render(<IncomeSources transactions={[]} categories={[]} />);
    expect(screen.queryByTestId('income-tooltip')).not.toBeInTheDocument();
  });

  it('shows a clear empty state when there is no current-month income', () => {
    render(<IncomeSources transactions={[]} categories={[]} />);

    expect(
      screen.getByText(/Todavía no hay ingresos registrados este mes/i)
    ).toBeInTheDocument();
  });
});
