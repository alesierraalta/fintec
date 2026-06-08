import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the useOptimizedTransactions hook
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedTransactions: jest.fn(),
}));

// Mock the useCurrencyConverter hook
jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: jest.fn(),
}));

// Mock recharts
jest.mock('recharts', () => ({
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  TrendingUp: () => null,
  DollarSign: () => null,
  ShoppingCart: () => null,
  Car: () => null,
  Film: () => null,
  Zap: () => null,
  Heart: () => null,
  Package: () => null,
}));

import { SpendingChart } from '@/components/dashboard/spending-chart';
import { useOptimizedTransactions } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';

describe('SpendingChart - Dynamic Import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOptimizedTransactions as jest.Mock).mockReturnValue({
      expenseTransactions: [],
      categories: [],
      loading: false,
    });
    (useCurrencyConverter as jest.Mock).mockReturnValue({
      convert: (amount: number) => amount,
    });
  });

  it('should render the component', () => {
    render(<SpendingChart />);
    // The component should render without errors
    expect(screen.getByText(/Sin gastos registrados/)).toBeInTheDocument();
  });

  it('should show empty state when no transactions', () => {
    render(<SpendingChart />);
    expect(screen.getByText(/Sin gastos registrados/)).toBeInTheDocument();
    expect(screen.getByText(/Cuando tengas gastos/)).toBeInTheDocument();
  });

  it('should render chart when there are transactions', () => {
    (useOptimizedTransactions as jest.Mock).mockReturnValue({
      expenseTransactions: [
        { id: 'tx-1', amountMinor: 5000, currencyCode: 'USD', categoryId: 'cat-1' },
      ],
      categories: [{ id: 'cat-1', name: 'Alimentación' }],
      loading: false,
    });

    render(<SpendingChart />);
    // Should not show empty state
    expect(screen.queryByText(/Sin gastos registrados/)).not.toBeInTheDocument();
  });
});
