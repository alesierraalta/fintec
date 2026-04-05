import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AccountsPage from '@/app/accounts/accounts-page-client';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

const mockBinanceRatesComponent = jest.fn(
  ({ snapshot }: { snapshot: BinanceRatesSnapshot }) => (
    <div data-testid="binance-card">{`${snapshot.status}:${snapshot.rates.usd_ves}`}</div>
  )
);

const mockSnapshot: BinanceRatesSnapshot = {
  rates: {
    usd_ves: 105,
    usdt_ves: 105,
    busd_ves: 105,
    sell_rate: { min: 104, avg: 105, max: 106 },
    buy_rate: { min: 103, avg: 104, max: 105 },
    spread: 1,
    sell_prices_used: 3,
    buy_prices_used: 2,
    prices_used: 5,
    price_range: {
      sell_min: 104,
      sell_max: 106,
      buy_min: 103,
      buy_max: 105,
      min: 103,
      max: 106,
    },
    lastUpdated: new Date().toISOString(),
  },
  status: 'fallback',
  message: 'Mostrando datos de referencia de Binance P2P.',
  error: 'Mostrando datos de referencia de Binance P2P.',
  isFallback: true,
  isStale: false,
  lastUpdatedLabel: '04/04/2026, 12:00:00',
  loading: false,
  refetch: jest.fn().mockResolvedValue(undefined),
};

jest.mock('next/dynamic', () => () => () => null);

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, whileHover, whileTap, whileInView, ...props }: any) =>
          React.createElement(tag, props, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/currency/bcv-rates', () => ({
  BCVRates: () => <div data-testid="bcv-card" />,
}));

jest.mock('@/components/currency/binance-rates', () => ({
  BinanceRatesComponent: (props: { snapshot: BinanceRatesSnapshot }) =>
    mockBinanceRatesComponent(props),
}));

jest.mock('@/components/currency/rates-history', () => ({
  RatesHistory: () => <div data-testid="rates-history" />,
}));

jest.mock('@/components/forms/balance-alert-settings', () => ({
  BalanceAlertSettings: () => <div data-testid="balance-alert-settings" />,
}));

jest.mock('@/components/accounts/balance-alert-indicator', () => ({
  BalanceAlertIndicator: () => <div data-testid="balance-alert-indicator" />,
}));

jest.mock('@/components/accounts/swipeable-account-card', () => ({
  SwipeableAccountCard: () => <div data-testid="swipeable-account-card" />,
}));

jest.mock('@/components/skeletons/accounts-skeleton', () => ({
  AccountsSkeleton: () => <div data-testid="accounts-skeleton" />,
}));

jest.mock('@/components/ui/collapsible-section', () => ({
  CollapsibleSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/floating-action-button', () => ({
  FloatingActionButton: () => <button type="button">FAB</button>,
}));

jest.mock('@/components/ui/suspense-loading', () => ({
  FormLoading: () => <div data-testid="form-loading" />,
}));

jest.mock('@/components/ui', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

jest.mock('@/hooks', () => ({
  useModal: jest.fn(() => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  })),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: jest.fn(() => ({ usd: 100, eur: 110 })),
}));

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(() => mockSnapshot),
}));

jest.mock('@/hooks/use-balance-alerts', () => ({
  useBalanceAlerts: jest.fn(() => ({ checkAlerts: jest.fn() })),
}));

jest.mock('@/providers/repository-provider', () => ({
  useRepository: jest.fn(() => ({
    accounts: { findByUserId: jest.fn().mockResolvedValue([]) },
    transactions: { findAll: jest.fn().mockResolvedValue([]) },
    categories: { findAll: jest.fn().mockResolvedValue([]) },
  })),
}));

jest.mock('@/lib/store', () => ({
  useAppStore: jest.fn((selector: any) =>
    selector({ selectedRateSource: 'binance' })
  ),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AccountsPage Binance state wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the shared Binance snapshot into the renderer so balances and card stay in sync', async () => {
    render(<AccountsPage />);

    expect(await screen.findByTestId('binance-card')).toHaveTextContent(
      'fallback:105'
    );

    await waitFor(() => {
      expect(mockBinanceRatesComponent).toHaveBeenCalled();
    });

    const lastCall = mockBinanceRatesComponent.mock.calls.at(-1)?.[0];
    expect(lastCall.snapshot).toBe(mockSnapshot);
  });
});
