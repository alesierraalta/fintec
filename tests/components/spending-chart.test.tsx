import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from '@/lib/dates/dayjs';

// Mock hooks
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedTransactions: jest.fn(),
}));

jest.mock('@/hooks/use-currency-converter', () => ({
  useCurrencyConverter: jest.fn(),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: jest.fn(),
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, onMouseEnter, onMouseLeave }: any) => (
    <div data-testid="pie">
      {data?.map((entry: any, index: number) => (
        <div
          key={entry.name}
          data-testid={`pie-cell-${index}`}
          onMouseEnter={() => onMouseEnter && onMouseEnter(null, index)}
          onMouseLeave={() => onMouseLeave && onMouseLeave()}
        >
          {entry.name} - {entry.value}
        </div>
      ))}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => null,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  DollarSign: ({ className, style }: any) => (
    <svg data-testid="icon-dollar-sign" className={className} style={style} />
  ),
  ShoppingCart: ({ className, style }: any) => (
    <svg data-testid="icon-shopping-cart" className={className} style={style} />
  ),
  Car: ({ className, style }: any) => (
    <svg data-testid="icon-car" className={className} style={style} />
  ),
  Film: ({ className, style }: any) => (
    <svg data-testid="icon-film" className={className} style={style} />
  ),
  Zap: ({ className, style }: any) => (
    <svg data-testid="icon-zap" className={className} style={style} />
  ),
  Heart: ({ className, style }: any) => (
    <svg data-testid="icon-heart" className={className} style={style} />
  ),
  Package: ({ className, style }: any) => (
    <svg data-testid="icon-package" className={className} style={style} />
  ),
  GraduationCap: ({ className, style }: any) => (
    <svg
      data-testid="icon-graduation-cap"
      className={className}
      style={style}
    />
  ),
  Home: ({ className, style }: any) => (
    <svg data-testid="icon-home" className={className} style={style} />
  ),
  ShoppingBag: ({ className, style }: any) => (
    <svg data-testid="icon-shopping-bag" className={className} style={style} />
  ),
  Receipt: ({ className, style }: any) => (
    <svg data-testid="icon-receipt" className={className} style={style} />
  ),
  MoreHorizontal: ({ className, style }: any) => (
    <svg
      data-testid="icon-more-horizontal"
      className={className}
      style={style}
    />
  ),
}));

import {
  SpendingChart,
  SpendingChartSkeleton,
  getCategoryColor,
  getCategoryIcon,
  formatUSD,
} from '@/components/dashboard/spending-chart';
import { useOptimizedTransactions } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';

describe('SpendingChart Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Alimentación' },
    { id: 'cat-2', name: 'Transporte' },
    { id: 'cat-3', name: 'Entretenimiento' },
    { id: 'cat-4', name: 'Salud' },
    { id: 'cat-5', name: 'Educación' },
    { id: 'cat-6', name: 'Hogar' },
    { id: 'cat-7', name: 'Ropa' },
    { id: 'cat-8', name: 'Facturas' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useOptimizedTransactions as jest.Mock).mockReturnValue({
      expenseTransactions: [],
      categories: mockCategories,
      loading: false,
    });
    (useCurrencyConverter as jest.Mock).mockReturnValue({
      convert: (amountMinor: number) => amountMinor / 100,
    });
    (useActiveUsdVesRate as jest.Mock).mockReturnValue(50);
  });

  describe('1. Loading and Skeleton State', () => {
    it('should render SpendingChartSkeleton when loading is true', () => {
      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [],
        categories: [],
        loading: true,
      });

      render(<SpendingChart />);
      expect(screen.getByTestId('spending-chart-skeleton')).toBeInTheDocument();
      expect(
        screen.queryByText(/Sin gastos registrados/)
      ).not.toBeInTheDocument();
    });

    it('should render standalone SpendingChartSkeleton correctly', () => {
      render(<SpendingChartSkeleton />);
      expect(screen.getByTestId('spending-chart-skeleton')).toBeInTheDocument();
    });
  });

  describe('2. Empty State', () => {
    it('should render empty state when no transactions exist', () => {
      render(<SpendingChart />);
      expect(screen.getByText(/Sin gastos registrados/)).toBeInTheDocument();
      expect(
        screen.getByText(/Cuando tengas gastos en este período/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('3. Currency & Minor Units Calculations', () => {
    it('should calculate USD spending correctly from minor units', () => {
      const todayIso = dayjs().toISOString();
      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [
          {
            id: 'tx-1',
            type: 'EXPENSE',
            amountMinor: 5000, // $50.00
            currencyCode: 'USD',
            categoryId: 'cat-1',
            date: todayIso,
          },
          {
            id: 'tx-2',
            type: 'EXPENSE',
            amountMinor: 2500, // $25.00
            currencyCode: 'USD',
            categoryId: 'cat-2',
            date: todayIso,
          },
        ],
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);

      expect(
        screen.queryByText(/Sin gastos registrados/)
      ).not.toBeInTheDocument();
      // Total should be $75.00
      expect(screen.getAllByText('$75.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });

    it('should convert VES transactions to USD using activeUsdVesRate', () => {
      const todayIso = dayjs().toISOString();
      (useActiveUsdVesRate as jest.Mock).mockReturnValue(50); // 50 VES = 1 USD

      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [
          {
            id: 'tx-ves',
            type: 'EXPENSE',
            amountMinor: 1000000, // 10,000.00 VES -> 10,000 / 50 = 200.00 USD
            currencyCode: 'VES',
            categoryId: 'cat-1',
            date: todayIso,
          },
        ],
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);
      expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    });
  });

  describe('4. Time Periods Filtering', () => {
    it('should filter transactions based on selected period', () => {
      const thisMonthTx = {
        id: 'tx-current',
        type: 'EXPENSE',
        amountMinor: 10000, // $100.00
        currencyCode: 'USD',
        categoryId: 'cat-1',
        date: dayjs().toISOString(),
      };
      const lastMonthTx = {
        id: 'tx-last-month',
        type: 'EXPENSE',
        amountMinor: 6000, // $60.00
        currencyCode: 'USD',
        categoryId: 'cat-2',
        date: dayjs()
          .subtract(1, 'month')
          .startOf('month')
          .add(2, 'day')
          .toISOString(),
      };
      const oldTx = {
        id: 'tx-old',
        type: 'EXPENSE',
        amountMinor: 4000, // $40.00
        currencyCode: 'USD',
        categoryId: 'cat-3',
        date: dayjs().subtract(4, 'month').toISOString(),
      };

      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [thisMonthTx, lastMonthTx, oldTx],
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);

      // Default period: 'Este mes' ($100.00)
      expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.queryByText('Transporte')).not.toBeInTheDocument();

      // Switch to 'Mes anterior'
      const lastMonthTab = screen.getByRole('tab', { name: /Mes anterior/i });
      fireEvent.click(lastMonthTab);

      expect(screen.getAllByText('$60.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.queryByText('Alimentación')).not.toBeInTheDocument();

      // Switch to 'Histórico'
      const allTab = screen.getByRole('tab', { name: /Histórico/i });
      fireEvent.click(allTab);

      // Total = 100 + 60 + 40 = $200.00
      expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
    });
  });

  describe('5. Surplus Categories Consolidation (Otras)', () => {
    it('should aggregate surplus categories (> 6) into Otras', () => {
      const todayIso = dayjs().toISOString();
      const transactions = [
        {
          id: '1',
          type: 'EXPENSE',
          amountMinor: 8000,
          currencyCode: 'USD',
          categoryId: 'cat-1',
          date: todayIso,
        }, // $80
        {
          id: '2',
          type: 'EXPENSE',
          amountMinor: 7000,
          currencyCode: 'USD',
          categoryId: 'cat-2',
          date: todayIso,
        }, // $70
        {
          id: '3',
          type: 'EXPENSE',
          amountMinor: 6000,
          currencyCode: 'USD',
          categoryId: 'cat-3',
          date: todayIso,
        }, // $60
        {
          id: '4',
          type: 'EXPENSE',
          amountMinor: 5000,
          currencyCode: 'USD',
          categoryId: 'cat-4',
          date: todayIso,
        }, // $50
        {
          id: '5',
          type: 'EXPENSE',
          amountMinor: 4000,
          currencyCode: 'USD',
          categoryId: 'cat-5',
          date: todayIso,
        }, // $40
        {
          id: '6',
          type: 'EXPENSE',
          amountMinor: 3000,
          currencyCode: 'USD',
          categoryId: 'cat-6',
          date: todayIso,
        }, // $30
        {
          id: '7',
          type: 'EXPENSE',
          amountMinor: 2000,
          currencyCode: 'USD',
          categoryId: 'cat-7',
          date: todayIso,
        }, // $20
        {
          id: '8',
          type: 'EXPENSE',
          amountMinor: 1000,
          currencyCode: 'USD',
          categoryId: 'cat-8',
          date: todayIso,
        }, // $10
      ];
      // Total = $360.
      // Top 5: cat-1 ($80), cat-2 ($70), cat-3 ($60), cat-4 ($50), cat-5 ($40)
      // Surplus (cat-6 + cat-7 + cat-8): 30 + 20 + 10 = $60 in 'Otras'

      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: transactions,
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);

      // Top 5 must exist
      expect(screen.getByText('Alimentación')).toBeInTheDocument();
      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
      expect(screen.getByText('Salud')).toBeInTheDocument();
      expect(screen.getByText('Educación')).toBeInTheDocument();

      // 'Otras' category should exist with aggregated value of $60.00
      expect(screen.getByText('Otras')).toBeInTheDocument();
      expect(screen.getAllByText('$60.00').length).toBeGreaterThan(0);

      // Remaining individual categories should not appear as separate cards
      expect(screen.queryByText('Ropa')).not.toBeInTheDocument();
      expect(screen.queryByText('Facturas')).not.toBeInTheDocument();
    });
  });

  describe('6. Category Interaction', () => {
    it('should persist selected category details after clicking a category item', () => {
      const todayIso = dayjs().toISOString();
      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [
          {
            id: 'tx-1',
            type: 'EXPENSE',
            amountMinor: 7500, // $75.00 (75%)
            currencyCode: 'USD',
            categoryId: 'cat-1',
            date: todayIso,
          },
          {
            id: 'tx-2',
            type: 'EXPENSE',
            amountMinor: 2500, // $25.00 (25%)
            currencyCode: 'USD',
            categoryId: 'cat-2',
            date: todayIso,
          },
        ],
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);

      const categoryButton = screen.getByRole('button', {
        name: /Alimentación/i,
      });
      expect(screen.getByText('Total gastado')).toBeInTheDocument();

      fireEvent.click(categoryButton);

      expect(screen.getByText(/Alimentación \(75%\)/i)).toBeInTheDocument();
      expect(screen.queryByText('Total gastado')).not.toBeInTheDocument();
    });

    it('should update center stats when hovering a pie cell', () => {
      const todayIso = dayjs().toISOString();
      (useOptimizedTransactions as jest.Mock).mockReturnValue({
        expenseTransactions: [
          {
            id: 'tx-1',
            type: 'EXPENSE',
            amountMinor: 5000,
            currencyCode: 'USD',
            categoryId: 'cat-1',
            date: todayIso,
          },
        ],
        categories: mockCategories,
        loading: false,
      });

      render(<SpendingChart />);

      const pieCell = screen.getByTestId('pie-cell-0');
      fireEvent.mouseEnter(pieCell);
      expect(screen.getByText(/Alimentación \(100%\)/i)).toBeInTheDocument();

      fireEvent.mouseLeave(pieCell);
      expect(
        screen.queryByText(/Alimentación \(100%\)/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('7. Deterministic Category Colors and Icons', () => {
    it('should map standard categories to high-contrast colors and valid icons', () => {
      expect(getCategoryColor('Alimentación')).toBe('#10b981');
      expect(getCategoryColor('Transporte')).toBe('#3b82f6');
      expect(getCategoryColor('Entretenimiento')).toBe('#8b5cf6');
      expect(getCategoryColor('Salud')).toBe('#f43f5e');
      expect(getCategoryColor('Educación')).toBe('#f59e0b');
      expect(getCategoryColor('Hogar')).toBe('#06b6d4');
      expect(getCategoryColor('Ropa')).toBe('#ec4899');
      expect(getCategoryColor('Facturas')).toBe('#6366f1');
      expect(getCategoryColor('Otras')).toBe('#64748b');

      expect(getCategoryIcon('Alimentación')).toBeDefined();
      expect(getCategoryIcon('Transporte')).toBeDefined();
    });

    it('should deterministically generate high contrast colors for custom category names', () => {
      const color1 = getCategoryColor('Inversiones Cripto');
      const color2 = getCategoryColor('Inversiones Cripto');
      const color3 = getCategoryColor('Mascotas & Veterinario');

      expect(color1).toBe(color2); // Deterministic
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color3).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should format USD currency amounts consistently with formatUSD', () => {
      expect(formatUSD(1234.5)).toBe('$1,234.50');
      expect(formatUSD(0)).toBe('$0.00');
    });
  });
});
