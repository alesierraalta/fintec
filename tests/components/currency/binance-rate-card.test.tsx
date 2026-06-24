import { render, screen } from '@testing-library/react';
import { BinanceRateCard } from '@/components/currency/binance-rate-card';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

const mockSnapshot = {
  rates: {
    usd_ves: 36.5,
    usdt_ves: 36.5,
    busd_ves: 36.5,
    sell_rate: { min: 36, avg: 36.5, max: 37 },
    buy_rate: { min: 35, avg: 35.5, max: 36 },
    spread: 1,
    sell_prices_used: 3,
    buy_prices_used: 2,
    prices_used: 5,
    price_range: {
      sell_min: 36,
      sell_max: 37,
      buy_min: 35,
      buy_max: 36,
      min: 35,
      max: 37,
    },
    lastUpdated: new Date().toISOString(),
  },
  status: 'live' as const,
  message: '',
  error: null,
  isFallback: false,
  isStale: false,
  lastUpdatedLabel: '01/01/2026, 12:00:00',
  loading: false,
  refetch: jest.fn(),
} as unknown as BinanceRatesSnapshot;

describe('BinanceRateCard (simple mode)', () => {
  it('renders the SELL avg rate as the single number', () => {
    render(
      <BinanceRateCard
        snapshot={mockSnapshot}
        mode="simple"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByText('36.50')).toBeInTheDocument();
  });

  it('renders the status chip (VIVO)', () => {
    render(
      <BinanceRateCard
        snapshot={mockSnapshot}
        mode="simple"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByText('VIVO')).toBeInTheDocument();
  });

  it('renders the mode toggle', () => {
    render(
      <BinanceRateCard
        snapshot={mockSnapshot}
        mode="simple"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('binance-rate-mode-toggle')).toBeInTheDocument();
  });

  it('calls onModeChange("full") when the toggle is clicked', () => {
    const onModeChange = jest.fn();
    render(
      <BinanceRateCard
        snapshot={mockSnapshot}
        mode="simple"
        onModeChange={onModeChange}
      />
    );
    screen.getByTestId('binance-rate-mode-toggle').click();
    expect(onModeChange).toHaveBeenCalledWith('full');
  });

  it('uses the safe fallback when snapshot is stale and out of range', () => {
    const staleSnapshot = {
      ...mockSnapshot,
      status: 'stale' as const,
      isStale: true,
      rates: {
        ...mockSnapshot.rates,
        sell_rate: { min: 3, avg: 3, max: 3 },
        buy_rate: { min: 3, avg: 3, max: 3 },
      },
    };
    render(
      <BinanceRateCard
        snapshot={staleSnapshot}
        mode="simple"
        onModeChange={jest.fn()}
      />
    );
    // 770.00 fallback
    expect(screen.getByText('770.00')).toBeInTheDocument();
  });
});
