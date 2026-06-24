import React from 'react';
import { render, screen } from '@testing-library/react';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

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
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: jest.fn(() => ({ usd: 100, eur: 110 })),
}));

function createSnapshot(
  overrides: Partial<BinanceRatesSnapshot> = {}
): BinanceRatesSnapshot {
  return {
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
    status: 'live',
    message: null,
    error: null,
    isFallback: false,
    isStale: false,
    lastUpdatedLabel: '04/04/2026, 12:00:00',
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('BinanceRatesComponent dispatcher', () => {
  it('defaults to simple mode and renders the simple card', () => {
    render(<BinanceRatesComponent snapshot={createSnapshot()} />);
    expect(screen.getByTestId('binance-rate-card')).toBeInTheDocument();
    expect(
      screen.queryByTestId('binance-rate-advanced')
    ).not.toBeInTheDocument();
  });

  it('renders the advanced card when mode="full"', () => {
    render(
      <BinanceRatesComponent
        snapshot={createSnapshot()}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('binance-rate-advanced')).toBeInTheDocument();
    expect(screen.queryByTestId('binance-rate-card')).not.toBeInTheDocument();
  });

  it('forwards onModeChange to the active variant', () => {
    const onModeChange = jest.fn();
    render(
      <BinanceRatesComponent
        snapshot={createSnapshot()}
        mode="simple"
        onModeChange={onModeChange}
      />
    );
    screen.getByTestId('binance-rate-mode-toggle').click();
    expect(onModeChange).toHaveBeenCalledWith('full');
  });

  it('works without onModeChange (no-op fallback)', () => {
    render(<BinanceRatesComponent snapshot={createSnapshot()} />);
    // Clicking the toggle should not throw
    screen.getByTestId('binance-rate-mode-toggle').click();
  });
});
