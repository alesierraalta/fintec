/**
 * Unit tests for lib/money.ts covering:
 *   - `toMinorUnits` decimal-aware correctness (regression + non-2-decimal
 *     currencies — these were ACTIVELY wrong under the old
 *     `Math.round(amount * 100)` pattern still used at resolvers.ts).
 *   - `toBaseMinor` — a thin named wrapper over `toMinorUnits` that
 *     parameterizes on the caller's BASE currency, unifying the FUNCTION
 *     used by resolvers.ts call sites without unifying the CURRENCY
 *     argument (account currency vs. base currency stay distinct).
 */

import { toMinorUnits, toBaseMinor } from '@/lib/money';

describe('lib/money — toMinorUnits (decimal-aware)', () => {
  it('converts a 0-decimal currency (COP) without the *100 defect', () => {
    expect(toMinorUnits(1500, 'COP')).toBe(1500);
  });

  it('converts a 0-decimal currency (CLP) without the *100 defect', () => {
    expect(toMinorUnits(1500, 'CLP')).toBe(1500);
  });

  it('converts an 8-decimal currency (BTC) without rounding to zero', () => {
    expect(toMinorUnits(0.00123456, 'BTC')).toBe(123456);
  });

  it('keeps existing 2-decimal (USD) behavior regression-safe', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
  });
});

describe('lib/money — toBaseMinor', () => {
  it('converts using the base currency supplied via ctx.baseCurrencyCode', () => {
    expect(toBaseMinor(1500, { baseCurrencyCode: 'COP' })).toBe(1500);
    expect(toBaseMinor(19.99, { baseCurrencyCode: 'USD' })).toBe(1999);
  });

  it('delegates to the same toMinorUnits arithmetic, not a second path', () => {
    expect(toBaseMinor(0.00123456, { baseCurrencyCode: 'BTC' })).toBe(
      toMinorUnits(0.00123456, 'BTC')
    );
  });
});
