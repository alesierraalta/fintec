import {
  estimateP2PRate,
  formatRateHundredths,
  isStaleRate,
  SAFE_FALLBACK_RATE_HUNDREDTHS,
  type P2PEstimateInput,
} from '@/lib/services/binance-p2p-estimator';

describe('binance-p2p-estimator', () => {
  describe('isStaleRate', () => {
    it('flags any base rate at or below 500.00 VES/USDT (50000 hundredths) as stale', () => {
      expect(isStaleRate(50000)).toBe(true);
      expect(isStaleRate(30000)).toBe(true);
      expect(isStaleRate(0)).toBe(true);
    });

    it('accepts base rates above 500.00 VES/USDT', () => {
      expect(isStaleRate(50001)).toBe(false);
      expect(isStaleRate(79000)).toBe(false);
    });
  });

  describe('formatRateHundredths', () => {
    it('formats integer hundredths to exactly two decimal places', () => {
      expect(formatRateHundredths(77000)).toBe('770.00');
      expect(formatRateHundredths(78800)).toBe('788.00');
      expect(formatRateHundredths(79790)).toBe('797.90');
    });

    it('formats values that need padding', () => {
      expect(formatRateHundredths(7)).toBe('0.07');
      expect(formatRateHundredths(0)).toBe('0.00');
    });

    it('formats fractional hundredths without losing precision', () => {
      expect(formatRateHundredths(1001)).toBe('10.01');
    });
  });

  describe('estimateP2PRate', () => {
    it('Mercantil SELL: applies a direct -200 hundredths offset (79000 -> 78800)', () => {
      const input: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'SELL',
        paymentMethod: 'mercantil',
        amountUsdCents: 50000,
      };

      const result = estimateP2PRate(input);

      expect(result.estimatedRateRaw).toBe(78800);
      expect(result.isFallbackApplied).toBe(false);
    });

    it('BUY with amount >= 1000 USD applies +100 bps (79000 -> 79790)', () => {
      const input: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'BUY',
        paymentMethod: 'all',
        amountUsdCents: 120000,
      };

      const result = estimateP2PRate(input);

      expect(result.estimatedRateRaw).toBe(79790);
    });

    it('BUY vs SELL with the same bank produce different adjustments', () => {
      const buyInput: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'BUY',
        paymentMethod: 'mercantil',
        amountUsdCents: 50000,
      };
      const sellInput: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'SELL',
        paymentMethod: 'mercantil',
        amountUsdCents: 50000,
      };

      const buy = estimateP2PRate(buyInput);
      const sell = estimateP2PRate(sellInput);

      expect(buy.estimatedRateRaw).not.toBe(sell.estimatedRateRaw);
      expect(sell.estimatedRateRaw).toBe(78800);
    });

    it('falls back to the safe 77000 base when input rate is stale (30000)', () => {
      const input: P2PEstimateInput = {
        baseRateRaw: 30000,
        side: 'SELL',
        paymentMethod: 'all',
        amountUsdCents: 0,
      };

      const result = estimateP2PRate(input);

      expect(result.isFallbackApplied).toBe(true);
      expect(result.estimatedRateRaw).toBe(SAFE_FALLBACK_RATE_HUNDREDTHS);
    });

    it('falls back when base rate is exactly at the stale threshold (50000)', () => {
      const result = estimateP2PRate({
        baseRateRaw: 50000,
        side: 'BUY',
        paymentMethod: 'all',
        amountUsdCents: 0,
      });
      expect(result.isFallbackApplied).toBe(true);
    });

    it('does not modify the input object (pure function)', () => {
      const input: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'SELL',
        paymentMethod: 'mercantil',
        amountUsdCents: 50000,
      };
      const snapshot = JSON.stringify(input);
      estimateP2PRate(input);
      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('is deterministic across repeated invocations', () => {
      const input: P2PEstimateInput = {
        baseRateRaw: 79000,
        side: 'BUY',
        paymentMethod: 'banesco',
        amountUsdCents: 120000,
      };
      const first = estimateP2PRate(input);
      const second = estimateP2PRate(input);
      const third = estimateP2PRate(input);
      expect(first.estimatedRateRaw).toBe(second.estimatedRateRaw);
      expect(second.estimatedRateRaw).toBe(third.estimatedRateRaw);
    });

    it('uses no network resources (no fetch, no XMLHttpRequest)', () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      estimateP2PRate({
        baseRateRaw: 79000,
        side: 'SELL',
        paymentMethod: 'all',
        amountUsdCents: 0,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
