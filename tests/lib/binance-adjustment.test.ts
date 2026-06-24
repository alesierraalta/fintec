import {
  KNOWN_BANKS,
  SAFE_FALLBACK_RATE,
  getBankOffset,
  getAmountTier,
  calculateAdjustedRate,
  withSafeFallback,
  type BankId,
  type Side,
} from '@/lib/binance-adjustment';

describe('KNOWN_BANKS', () => {
  it('exposes 6 banks', () => {
    expect(KNOWN_BANKS.length).toBe(6);
  });
  it('includes the expected banks', () => {
    for (const b of [
      'mercantil',
      'banesco',
      'provincial',
      'paypal',
      'zelle',
      'other',
    ] as const) {
      expect(KNOWN_BANKS).toContain(b);
    }
  });
});

describe('getBankOffset', () => {
  it('mercantil BUY is positive', () => {
    expect(getBankOffset('mercantil', 'BUY')).toBeGreaterThan(0);
  });
  it('mercantil SELL is negative', () => {
    expect(getBankOffset('mercantil', 'SELL')).toBeLessThan(0);
  });
  it('banesco BUY is zero (baseline)', () => {
    expect(getBankOffset('banesco', 'BUY')).toBe(0);
  });
  it('banesco SELL is zero (baseline)', () => {
    expect(getBankOffset('banesco', 'SELL')).toBe(0);
  });
  it('paypal has the largest magnitude', () => {
    expect(Math.abs(getBankOffset('paypal', 'BUY'))).toBeGreaterThan(
      Math.abs(getBankOffset('mercantil', 'BUY'))
    );
  });
  it('unknown bank returns zero', () => {
    expect(getBankOffset('nope' as unknown as BankId, 'BUY')).toBe(0);
  });
});

describe('getAmountTier', () => {
  it('0 is small', () => {
    expect(getAmountTier(0)).toBe('small');
  });
  it('500 USD (50000) is small', () => {
    expect(getAmountTier(50000)).toBe('small');
  });
  it('just over 500 USD is medium', () => {
    expect(getAmountTier(50001)).toBe('medium');
  });
  it('2000 USD (200000) is medium', () => {
    expect(getAmountTier(200000)).toBe('medium');
  });
  it('just over 2000 USD is large', () => {
    expect(getAmountTier(200001)).toBe('large');
  });
  it('huge amount is large', () => {
    expect(getAmountTier(999999999)).toBe('large');
  });
});

describe('calculateAdjustedRate', () => {
  it('returns integer', () => {
    const r = calculateAdjustedRate(79000, 'BUY', 'mercantil', 50000);
    expect(Number.isInteger(r)).toBe(true);
  });
  it('is deterministic across calls', () => {
    const a = calculateAdjustedRate(79000, 'BUY', 'mercantil', 50000);
    const b = calculateAdjustedRate(79000, 'BUY', 'mercantil', 50000);
    expect(a).toBe(b);
  });
  it('zero base rate returns zero', () => {
    expect(calculateAdjustedRate(0, 'BUY', 'mercantil', 50000)).toBe(0);
  });
  it('zero amount falls through to small tier', () => {
    const a = calculateAdjustedRate(79000, 'BUY', 'mercantil', 0);
    const b = calculateAdjustedRate(79000, 'BUY', 'mercantil', 1);
    expect(a).toBe(b);
  });
  it('BUY with mercantil is higher than SELL with mercantil', () => {
    const buy = calculateAdjustedRate(79000, 'BUY', 'mercantil', 50000);
    const sell = calculateAdjustedRate(79000, 'SELL', 'mercantil', 50000);
    expect(buy).toBeGreaterThan(sell);
  });
  it('banesco is the baseline (no offset)', () => {
    const base = calculateAdjustedRate(79000, 'BUY', 'banesco', 50000);
    expect(base).toBe(79000);
  });
  it('large tier adds more than small tier', () => {
    const small = calculateAdjustedRate(79000, 'BUY', 'banesco', 1000);
    const large = calculateAdjustedRate(79000, 'BUY', 'banesco', 300000);
    expect(large).toBeGreaterThan(small);
  });
  it('paypal BUY on large amount is the highest of the matrix', () => {
    const r = calculateAdjustedRate(79000, 'BUY', 'paypal', 300000);
    expect(r).toBeGreaterThan(
      calculateAdjustedRate(79000, 'BUY', 'banesco', 1000)
    );
  });
  it('paypal SELL on large amount is the lowest of the matrix', () => {
    const r = calculateAdjustedRate(79000, 'SELL', 'paypal', 300000);
    expect(r).toBeLessThan(
      calculateAdjustedRate(79000, 'SELL', 'banesco', 1000)
    );
  });
});

describe('withSafeFallback', () => {
  it('not stale: passthrough', () => {
    expect(withSafeFallback(79000, false)).toBe(79000);
  });
  it('stale + out of range low: fallback', () => {
    expect(withSafeFallback(30000, true)).toBe(SAFE_FALLBACK_RATE);
  });
  it('stale + in range: passthrough', () => {
    expect(withSafeFallback(79000, true)).toBe(79000);
  });
  it('stale + out of range high: fallback', () => {
    expect(withSafeFallback(500000, true)).toBe(SAFE_FALLBACK_RATE);
  });
});
