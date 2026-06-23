import { renderHook, act } from '@testing-library/react';
import { useBinanceP2PEstimate } from '@/hooks/use-binance-p2p-estimate';

describe('useBinanceP2PEstimate', () => {
  it('initializes with the spec defaults (SELL / all / 0 cents) when no default tier is provided', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    expect(result.current.state.side).toBe('SELL');
    expect(result.current.state.paymentMethod).toBe('all');
    expect(result.current.state.amountUsdCents).toBe(0);
  });

  it('changing side on a payment-method with side-dependent rule recomputes the estimate', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    act(() => {
      result.current.setPaymentMethod('mercantil');
    });
    const sellEstimate = result.current.estimate.estimatedRateRaw;

    act(() => {
      result.current.setSide('BUY');
    });
    const buyEstimate = result.current.estimate.estimatedRateRaw;

    expect(result.current.state.side).toBe('BUY');
    expect(buyEstimate).not.toBe(sellEstimate);
  });

  it('changing payment method updates the estimate', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    act(() => {
      result.current.setPaymentMethod('mercantil');
    });

    expect(result.current.state.paymentMethod).toBe('mercantil');
    expect(result.current.estimate.estimatedRateRaw).toBe(78800);
  });

  it('stores amount in transaction minor units (USD cents)', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    act(() => {
      result.current.setAmountUsdCents(120000);
    });

    expect(result.current.state.amountUsdCents).toBe(120000);
  });

  it('changing amount to >= 100000 cents (1000 USD) bumps BUY estimate by +100 bps', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    act(() => {
      result.current.setSide('BUY');
    });
    act(() => {
      result.current.setAmountUsdCents(120000);
    });

    expect(result.current.estimate.estimatedRateRaw).toBe(79790);
  });

  it('applies stale-rate fallback when baseRateRaw is at or below the threshold', () => {
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 30000 })
    );

    expect(result.current.estimate.isFallbackApplied).toBe(true);
    expect(result.current.estimate.estimatedRateRaw).toBe(77000);
  });

  it('does not perform any network requests', () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const { result } = renderHook(() =>
      useBinanceP2PEstimate({ baseRateRaw: 79000 })
    );

    act(() => {
      result.current.setSide('BUY');
    });
    act(() => {
      result.current.setPaymentMethod('mercantil');
    });
    act(() => {
      result.current.setAmountUsdCents(150000);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
