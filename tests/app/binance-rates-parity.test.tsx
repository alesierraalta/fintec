import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

const mockSnapshot: BinanceRatesSnapshot = {
  rates: {
    usd_ves: 105,
    usdt_ves: 105,
    busd_ves: 105,
    sell_rate: { min: 104, avg: 105, max: 106 },
    buy_rate: { min: 103, avg: 104, max: 105 },
    spread: 1,
    sell_prices_used: 0,
    buy_prices_used: 0,
    prices_used: 0,
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

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(() => mockSnapshot),
}));

function AccountsBinanceSlot() {
  const snapshot = useBinanceRates();
  return <BinanceRatesComponent snapshot={snapshot} />;
}

function LandingBinanceSlot() {
  const snapshot = useBinanceRates({ enabled: true });
  return <BinanceRatesComponent snapshot={snapshot} />;
}

describe('Binance rates parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the same snapshot contract for landing and accounts when the hook output matches', () => {
    render(
      <>
        <section aria-label="accounts">
          <AccountsBinanceSlot />
        </section>
        <section aria-label="landing">
          <LandingBinanceSlot />
        </section>
      </>
    );

    const accounts = within(screen.getByRole('region', { name: 'accounts' }));
    const landing = within(screen.getByRole('region', { name: 'landing' }));

    expect(
      accounts.getByText(/datos de referencia de Binance P2P/i)
    ).toBeInTheDocument();
    expect(
      landing.getByText(/datos de referencia de Binance P2P/i)
    ).toBeInTheDocument();
    expect(accounts.getByText(/Bs\. 105\.00/i)).toBeInTheDocument();
    expect(landing.getByText(/Bs\. 105\.00/i)).toBeInTheDocument();
  });
});
