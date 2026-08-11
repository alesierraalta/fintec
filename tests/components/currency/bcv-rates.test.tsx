import React from 'react';
import { render, screen } from '@testing-library/react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import type { BCVRates as BCVRatesData } from '@/types/rates';

const mockUseBinanceRates = useBinanceRates as jest.MockedFunction<
  typeof useBinanceRates
>;
const mockFetchBCVRates = jest.fn();
const mockGetBCVTrends = jest.fn();

jest.mock('framer-motion', () => {
  const passthrough =
    (Element: 'div' | 'button' | 'a') =>
    ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      variants: _variants,
      exit: _exit,
      ...rest
    }: Record<string, unknown>) => {
      const Tag = Element as unknown as React.ElementType;
      return <Tag {...rest}>{children as React.ReactNode}</Tag>;
    };

  return {
    motion: {
      div: passthrough('div'),
      button: passthrough('button'),
      a: passthrough('a'),
    },
  };
});

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(),
}));

jest.mock('@/lib/services/currency-service', () => ({
  currencyService: {
    fetchBCVRates: (...args: unknown[]) => mockFetchBCVRates(...args),
    getBCVTrends: (...args: unknown[]) => mockGetBCVTrends(...args),
  },
}));

const BCV_RATES: BCVRatesData = {
  usd: 757.54,
  eur: 875.22,
  lastUpdated: new Date().toISOString(),
  source: 'BCV',
  cached: true,
  cacheAge: 3600,
};

function createBinanceSnapshot(
  avg: number,
  isFallback: boolean,
  pricesUsed = 1
): BinanceRatesSnapshot {
  return {
    rates: {
      usd_ves: avg,
      usdt_ves: avg,
      busd_ves: avg,
      sell_rate: { min: avg, avg, max: avg },
      buy_rate: { min: avg, avg, max: avg },
      spread: 0,
      sell_prices_used: pricesUsed,
      buy_prices_used: pricesUsed,
      prices_used: pricesUsed,
      price_range: {
        sell_min: avg,
        sell_max: avg,
        buy_min: avg,
        buy_max: avg,
        min: avg,
        max: avg,
      },
      lastUpdated: new Date().toISOString(),
      source: 'Binance P2P',
      fallback: isFallback,
    },
    status: isFallback ? 'fallback' : 'live',
    message: null,
    error: null,
    isFallback,
    isStale: false,
    lastUpdatedLabel: '',
    loading: false,
    refetch: jest.fn(),
  };
}

describe('BCVRates mini vs Binance chip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchBCVRates.mockResolvedValue(BCV_RATES);
    mockGetBCVTrends.mockResolvedValue(null);
  });

  it('renders a positive signed percentage when BCV is above the live Binance reference', async () => {
    mockUseBinanceRates.mockReturnValue(createBinanceSnapshot(800, false));
    mockFetchBCVRates.mockResolvedValue({ ...BCV_RATES, usd: 1000 });

    render(<BCVRates />);

    const chip = await screen.findByTestId('bcv-usd-vs-binance');
    expect(chip.textContent).toContain('vs Binance');
    expect(chip.textContent).toContain('+25.0%');
    expect(chip.className).toContain('text-success-600');
    expect(chip).toHaveAttribute(
      'aria-label',
      expect.stringContaining('mayor')
    );
  });

  it('renders a negative signed percentage when BCV is below the live Binance reference', async () => {
    mockUseBinanceRates.mockReturnValue(createBinanceSnapshot(1000, false));
    mockFetchBCVRates.mockResolvedValue({ ...BCV_RATES, usd: 800 });

    render(<BCVRates />);

    const chip = await screen.findByTestId('bcv-usd-vs-binance');
    expect(chip.textContent).toContain('vs Binance');
    expect(chip.textContent).toContain('-25.0%');
    expect(chip.className).toContain('text-warning-600');
    expect(chip).toHaveAttribute(
      'aria-label',
      expect.stringContaining('menor')
    );
  });

  it('renders a signed percentage for production-shaped live data with zero offer counts', async () => {
    mockUseBinanceRates.mockReturnValue(createBinanceSnapshot(800, false, 0));
    mockFetchBCVRates.mockResolvedValue({ ...BCV_RATES, usd: 1000 });

    render(<BCVRates />);

    const chip = await screen.findByTestId('bcv-usd-vs-binance');
    expect(chip.textContent).toContain('vs Binance');
    expect(chip.textContent).toContain('+25.0%');
    expect(chip.textContent).not.toContain('no disponible');
  });

  it('shows a compact unavailable state instead of a fake percentage when Binance is fallback', async () => {
    mockUseBinanceRates.mockReturnValue(createBinanceSnapshot(800, true));

    render(<BCVRates />);

    const chip = await screen.findByTestId('bcv-usd-vs-binance');
    expect(chip.textContent).toContain('vs Binance no disponible');
    expect(chip.textContent).not.toMatch(/[+-]\d+\.\d/);
    expect(chip).toHaveAttribute(
      'aria-label',
      expect.stringContaining('no disponible')
    );
  });

  it('renders a non-zero percentage from distinct BCV and Binance rates (proof fixture)', async () => {
    mockUseBinanceRates.mockReturnValue(createBinanceSnapshot(800, false));
    mockFetchBCVRates.mockResolvedValue({ ...BCV_RATES, usd: 757.54 });

    render(<BCVRates />);

    const chip = await screen.findByTestId('bcv-usd-vs-binance');
    expect(chip.textContent).toContain('vs Binance');
    expect(chip.textContent).not.toContain('-0.0%');
    expect(chip.textContent).not.toContain('+0.0%');
    expect(chip.textContent).toMatch(/[+-]\d+\.\d%/);
  });
});
