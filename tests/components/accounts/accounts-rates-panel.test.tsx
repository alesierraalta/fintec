import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccountsRatesPanel } from '@/components/accounts/accounts-rates-panel';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

// Mock the existing rate cards so we don't trigger their network/hook logic
jest.mock('@/components/currency/bcv-rates', () => ({
  BCVRates: () => <div data-testid="bcv-card">BCV RATES</div>,
}));

jest.mock('@/components/currency/binance-rates', () => ({
  BinanceRatesComponent: ({ snapshot }: { snapshot: BinanceRatesSnapshot }) => (
    <div data-testid="binance-card">
      BINANCE RATES {snapshot?.rates?.usd_ves ?? 'no-rate'}
    </div>
  ),
}));

const mockBcv = { usd: 36.5, eur: 40.0 };
const mockBinance = {
  rates: {
    usd_ves: 37.0,
    usdt_ves: 37.0,
    busd_ves: 37.0,
    sell_rate: { min: 36, avg: 37, max: 38 },
    buy_rate: { min: 36, avg: 36.5, max: 37 },
    spread: 1,
    sell_prices_used: 1,
    buy_prices_used: 1,
    prices_used: 2,
    price_range: {
      sell_min: 36,
      sell_max: 38,
      buy_min: 36,
      buy_max: 37,
      min: 36,
      max: 38,
    },
    lastUpdated: new Date().toISOString(),
  },
  status: 'ok' as const,
  message: '',
  error: null,
  isFallback: false,
  isStale: false,
  lastUpdatedLabel: '',
  loading: false,
  refetch: jest.fn(),
} as unknown as BinanceRatesSnapshot;

describe('AccountsRatesPanel', () => {
  it('renders the panel root with data-testid', () => {
    render(
      <AccountsRatesPanel
        bcv={mockBcv}
        binance={mockBinance}
        selectedSource="bcv_usd"
        onOpenHistory={jest.fn()}
      />
    );
    expect(screen.getByTestId('accounts-rates-panel')).toBeInTheDocument();
  });

  it('renders the BCV card and Binance card', () => {
    render(
      <AccountsRatesPanel
        bcv={mockBcv}
        binance={mockBinance}
        selectedSource="bcv_usd"
        onOpenHistory={jest.fn()}
      />
    );
    expect(screen.getByTestId('bcv-card')).toBeInTheDocument();
    expect(screen.getByTestId('binance-card')).toBeInTheDocument();
  });

  it('shows the selected rate source name in the strip', () => {
    render(
      <AccountsRatesPanel
        bcv={mockBcv}
        binance={mockBinance}
        selectedSource="binance"
        onOpenHistory={jest.fn()}
      />
    );
    const strip = screen.getByTestId('selected-rate-strip');
    expect(strip).toHaveTextContent('Binance');
    expect(strip).toHaveTextContent('37.00');
  });

  it('updates the strip when the selected source changes', () => {
    const { rerender } = render(
      <AccountsRatesPanel
        bcv={mockBcv}
        binance={mockBinance}
        selectedSource="binance"
        onOpenHistory={jest.fn()}
      />
    );
    expect(screen.getByTestId('selected-rate-strip')).toHaveTextContent(
      'Binance'
    );

    rerender(
      <AccountsRatesPanel
        bcv={mockBcv}
        binance={mockBinance}
        selectedSource="bcv_usd"
        onOpenHistory={jest.fn()}
      />
    );
    expect(screen.getByTestId('selected-rate-strip')).toHaveTextContent(
      'BCV USD'
    );
    expect(screen.getByTestId('selected-rate-strip')).toHaveTextContent(
      '36.50'
    );
  });
});
