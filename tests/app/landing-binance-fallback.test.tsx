import React, { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
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

function LandingLazyBinanceHarness() {
  const [shouldLoadLiveRates, setShouldLoadLiveRates] = useState(false);
  const snapshot = useBinanceRates({ enabled: shouldLoadLiveRates });

  useEffect(() => {
    setShouldLoadLiveRates(true);
  }, []);

  if (!shouldLoadLiveRates) {
    return <div data-testid="rates-skeleton">loading</div>;
  }

  return <BinanceRatesComponent snapshot={snapshot} />;
}

describe('Landing Binance fallback regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fallback Binance data after the landing card lazy-load gate opens', async () => {
    render(<LandingLazyBinanceHarness />);

    expect(
      await screen.findByRole('heading', { name: 'Binance (Mercado Digital)' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/datos de referencia de Binance P2P/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Bs\. 105\.00/i)).toBeInTheDocument();
  });
});
