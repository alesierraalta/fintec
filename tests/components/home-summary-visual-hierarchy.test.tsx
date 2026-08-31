import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from '@/lib/dates/dayjs';
import type { DashboardPeriodControllerProps } from '@/components/dashboard/dashboard-period-props';

jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: jest.fn(() => ({
    accounts: [
      { id: 'ves-account', balance: 123456, currencyCode: 'VES' },
      { id: 'usd-account', balance: 6789, currencyCode: 'USD' },
    ],
    transactions: [
      {
        id: 'income-1',
        type: 'INCOME',
        amountMinor: 10000,
        currencyCode: 'USD',
        date: new Date().toISOString(),
      },
    ],
    loading: false,
    loadAllData: jest.fn(),
  })),
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: jest.fn(() => ({
    usd: 50,
    eur: 55,
    lastUpdated: new Date().toISOString(),
  })),
}));
jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(() => ({
    rates: { usd_ves: 50, lastUpdated: new Date().toISOString() },
  })),
}));
jest.mock('@/lib/store', () => ({
  useAppStore: (selector: (state: { selectedRateSource: string }) => unknown) =>
    selector({ selectedRateSource: 'bcv_usd' }),
}));
jest.mock('@/providers', () => ({
  useRepository: () => ({
    goals: { getGoalsWithProgress: jest.fn().mockResolvedValue([]) },
  }),
}));
jest.mock('@/components/subscription/free-limit-warning', () => ({
  FreeLimitWarning: () => null,
}));
jest.mock('@/components/dashboard/quick-actions', () => ({
  QuickActions: () => <div data-testid="quick-actions-content" />,
}));
jest.mock('@/components/dashboard/recent-transactions', () => ({
  RecentTransactions: () => <section aria-label="Movimientos recientes" />,
}));
jest.mock('@/components/dashboard/lazy-spending-chart', () => ({
  LazySpendingChart: () => <section aria-label="Gastos por Categoría" />,
}));
jest.mock('@/components/dashboard/income-sources', () => ({
  IncomeSources: () => <section aria-label="Fuentes de ingresos" />,
}));
jest.mock('@/components/dashboard/accounts-overview', () => ({
  AccountsOverview: () => <div data-testid="accounts-content" />,
}));

import { DesktopDashboard } from '@/components/dashboard/desktop-dashboard';
import { MobileDashboard } from '@/components/dashboard/mobile-dashboard';

const dashboardProps: DashboardPeriodControllerProps = {
  period: 'this_month',
  referenceNow: dayjs(),
  onPeriodChange: jest.fn(),
};

const branches = [
  ['DesktopDashboard', DesktopDashboard],
  ['MobileDashboard', MobileDashboard],
] as const;

describe.each(branches)('%s Home visual hierarchy', (_name, Dashboard) => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('uses one shared metric surface without nested card shells', () => {
    render(<Dashboard {...dashboardProps} />);

    const metric = screen.getByText(/INGRESOS MES|Ingresos del Mes/i);
    const surface = metric.closest('.glass-card');

    expect(surface).not.toBeNull();
    expect(surface).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'xl:grid-cols-3'
    );
    expect(surface?.querySelectorAll('.glass-card')).toHaveLength(0);
  });

  it('defaults to visible amounts and restores the exact values and provenance after a toggle', () => {
    render(<Dashboard {...dashboardProps} />);

    const toggle = screen.getByRole('button', { name: 'Ocultar' });
    const hero = screen
      .getByText(/Balance Total|BALANCE TOTAL/i)
      .closest('.glass-card');
    const original = hero?.textContent ?? '';

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(original).toContain('Bs.');
    expect(original).toContain('$67.89');
    expect(original).toMatch(/BCV/);

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Mostrar' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(hero?.textContent).toContain('••••••');
    expect(hero?.textContent).not.toContain('$67.89');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(hero?.textContent).toBe(original);
  });
});
