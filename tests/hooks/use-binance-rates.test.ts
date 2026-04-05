import { renderHook, waitFor, act } from '@testing-library/react';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { currencyService } from '@/lib/services/currency-service';
import type { BinanceRates } from '@/types/rates';

jest.mock('@/lib/services/currency-service', () => ({
  currencyService: {
    getBinanceRates: jest.fn(),
    fetchBinanceRates: jest.fn(),
  },
}));

function createLiveRates(overrides: Partial<BinanceRates> = {}): BinanceRates {
  return {
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
    ...overrides,
  };
}

describe('useBinanceRates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('exposes fallback snapshot immediately and transitions to live data after a successful fetch', async () => {
    const liveRates = createLiveRates();

    (currencyService.getBinanceRates as jest.Mock).mockReturnValue(null);
    (currencyService.fetchBinanceRates as jest.Mock).mockResolvedValue(
      liveRates
    );

    const { result } = renderHook(() => useBinanceRates());

    expect(result.current.status).toBe('fallback');
    expect(result.current.isFallback).toBe(true);
    expect(result.current.rates.prices_used).toBe(0);

    await waitFor(() => {
      expect(result.current.status).toBe('live');
    });

    expect(result.current.isFallback).toBe(false);
    expect(result.current.rates).toEqual(liveRates);
  });

  it('refreshes on visibility changes only after the throttle window elapses', async () => {
    const firstLiveRates = createLiveRates();
    const secondLiveRates = createLiveRates({ usd_ves: 109, usdt_ves: 109 });

    (currencyService.getBinanceRates as jest.Mock).mockReturnValue(null);
    (currencyService.fetchBinanceRates as jest.Mock)
      .mockResolvedValueOnce(firstLiveRates)
      .mockResolvedValueOnce(secondLiveRates);

    const { result } = renderHook(() => useBinanceRates());

    await waitFor(() => {
      expect(result.current.status).toBe('live');
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(currencyService.fetchBinanceRates).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(10_001);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(result.current.rates.usd_ves).toBe(109);
    });

    expect(currencyService.fetchBinanceRates).toHaveBeenCalledTimes(2);
  });

  it('keeps fallback data instead of exposing a null snapshot when the fetch fails', async () => {
    (currencyService.getBinanceRates as jest.Mock).mockReturnValue(null);
    (currencyService.fetchBinanceRates as jest.Mock).mockRejectedValue(
      new Error('boom')
    );

    const { result } = renderHook(() => useBinanceRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('fallback');
    expect(result.current.isFallback).toBe(true);
    expect(result.current.rates).not.toBeNull();
    expect(result.current.message).toMatch(/fallback|referencia/i);
  });
});
