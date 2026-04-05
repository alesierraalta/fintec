import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function renderCard(snapshot: BinanceRatesSnapshot) {
  return render(<BinanceRatesComponent snapshot={snapshot} />);
}

describe('BinanceRatesComponent', () => {
  it('renders live market data without fallback messaging', () => {
    renderCard(createSnapshot());

    expect(
      screen.getByRole('heading', { name: 'Binance (Mercado Digital)' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('VIVO').length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/datos de referencia de Binance P2P/i)
    ).not.toBeInTheDocument();
  });

  it('renders fallback messaging while still showing usable Binance data', () => {
    const fallbackRates = createSnapshot().rates;

    renderCard(
      createSnapshot({
        status: 'fallback',
        isFallback: true,
        message: 'Mostrando datos de referencia de Binance P2P.',
        error: 'Mostrando datos de referencia de Binance P2P.',
        rates: fallbackRates,
      })
    );

    expect(
      screen.getByText(/datos de referencia de Binance P2P/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Bs\. 105\.00/i)).toBeInTheDocument();
  });

  it('renders stale messaging for old snapshots', () => {
    renderCard(
      createSnapshot({
        status: 'stale',
        isStale: true,
        message: 'Los precios de Binance pueden estar desactualizados.',
        error: 'Los precios de Binance pueden estar desactualizados.',
      })
    );

    expect(
      screen.getByText(/pueden estar desactualizados/i)
    ).toBeInTheDocument();
  });

  it('disables manual refresh while the shared snapshot is loading', async () => {
    const user = userEvent.setup();
    const refetch = jest.fn().mockResolvedValue(undefined);

    renderCard(createSnapshot({ loading: true, refetch }));

    const refreshButton = screen.getByRole('button', {
      name: /actualizar tasas de binance/i,
    });

    expect(refreshButton).toBeDisabled();
    await user.click(refreshButton);
    expect(refetch).not.toHaveBeenCalled();
  });
});
