import { render, screen, fireEvent } from '@testing-library/react';
import { BinanceRateAdvanced } from '@/components/currency/binance-rate-advanced';
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

describe('BinanceRateAdvanced (full mode)', () => {
  it('renders a side selector with BUY and SELL', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('binance-rate-side-buy')).toBeInTheDocument();
    expect(screen.getByTestId('binance-rate-side-sell')).toBeInTheDocument();
  });

  it('renders a bank dropdown with all KNOWN_BANKS', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    const select = screen.getByTestId('binance-rate-bank') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    for (const b of [
      'mercantil',
      'banesco',
      'provincial',
      'paypal',
      'zelle',
      'other',
    ]) {
      expect(options).toContain(b);
    }
  });

  it('renders an amount input', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('binance-rate-amount')).toBeInTheDocument();
  });

  it('renders the VENTA and COMPRA breakdown', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('venta-block')).toBeInTheDocument();
    expect(screen.getByTestId('compra-block')).toBeInTheDocument();
  });

  it('renders the mode toggle', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    expect(screen.getByTestId('binance-rate-mode-toggle')).toBeInTheDocument();
  });

  it('calls onModeChange("simple") when the toggle is clicked from full', () => {
    const onModeChange = jest.fn();
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={onModeChange}
      />
    );
    screen.getByTestId('binance-rate-mode-toggle').click();
    expect(onModeChange).toHaveBeenCalledWith('simple');
  });

  it('changing the bank updates the adjusted rate', () => {
    render(
      <BinanceRateAdvanced
        snapshot={mockSnapshot}
        mode="full"
        onModeChange={jest.fn()}
      />
    );
    const beforeText =
      screen.getByTestId('binance-rate-adjusted').textContent ?? '';
    const select = screen.getByTestId('binance-rate-bank') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'paypal' } });
    // After switching to paypal (largest offset, default SELL side, default amount),
    // the rendered adjusted rate should still be a non-empty string with a digit.
    const afterText =
      screen.getByTestId('binance-rate-adjusted').textContent ?? '';
    expect(afterText).toMatch(/\d/);
    expect(afterText.length).toBeGreaterThan(0);
    // Sanity: banesco (no offset) and paypal (large negative offset) render different rates.
    expect(afterText).not.toBe(beforeText);
  });
});
