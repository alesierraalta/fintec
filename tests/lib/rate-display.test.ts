import {
  getRateName,
  getExchangeRate,
  convertBalanceToUSD,
  type RateSource,
} from '@/lib/rate-display';

const mockBcv = { usd: 36.5, eur: 40.0 };
const mockBinance = { usd_ves: 37.0 };

describe('getRateName', () => {
  it('returns "Binance" for binance', () => {
    expect(getRateName('binance')).toBe('Binance');
  });
  it('returns "BCV USD" for bcv_usd', () => {
    expect(getRateName('bcv_usd')).toBe('BCV USD');
  });
  it('returns "BCV EUR" for bcv_eur', () => {
    expect(getRateName('bcv_eur')).toBe('BCV EUR');
  });
  it('falls back to "BCV USD" for unknown source', () => {
    expect(getRateName('unknown' as RateSource)).toBe('BCV USD');
  });
});

describe('getExchangeRate', () => {
  it('returns binance.usd_ves for binance', () => {
    expect(getExchangeRate('binance', mockBcv, mockBinance)).toBe(37.0);
  });
  it('returns bcv.usd for bcv_usd', () => {
    expect(getExchangeRate('bcv_usd', mockBcv, mockBinance)).toBe(36.5);
  });
  it('returns bcv.eur for bcv_eur', () => {
    expect(getExchangeRate('bcv_eur', mockBcv, mockBinance)).toBe(40.0);
  });
  it('falls back to bcv.usd for unknown source', () => {
    expect(getExchangeRate('unknown' as RateSource, mockBcv, mockBinance)).toBe(
      36.5
    );
  });
});

describe('convertBalanceToUSD', () => {
  it('USD is a passthrough', () => {
    expect(
      convertBalanceToUSD(50000, 'USD', 'BANK', 'bcv_usd', mockBcv, mockBinance)
    ).toBe(500);
  });

  it('VES at bcv_usd divides by bcv.usd', () => {
    // 12345.67 VES / 36.5 = 338.237...
    const result = convertBalanceToUSD(
      1234567,
      'VES',
      'BANK',
      'bcv_usd',
      mockBcv,
      mockBinance
    );
    expect(result).toBeCloseTo(338.237, 2);
  });

  it('VES at bcv_eur divides by bcv.eur then × 1.1', () => {
    // 12345.67 / 40.0 * 1.1 = 339.506
    const result = convertBalanceToUSD(
      1234567,
      'VES',
      'BANK',
      'bcv_eur',
      mockBcv,
      mockBinance
    );
    expect(result).toBeCloseTo(339.506, 2);
  });

  it('VES at binance divides by binance.usd_ves', () => {
    // 12345.67 / 37.0 = 333.666...
    const result = convertBalanceToUSD(
      1234567,
      'VES',
      'BANK',
      'binance',
      mockBcv,
      mockBinance
    );
    expect(result).toBeCloseTo(333.666, 2);
  });

  it('BTC at binance returns base value (BTC / 1e8)', () => {
    // 100000000 / 1e8 = 1.0
    const result = convertBalanceToUSD(
      100000000,
      'BTC',
      'CRYPTO',
      'binance',
      mockBcv,
      mockBinance
    );
    expect(result).toBe(1.0);
  });

  it('BTC at bcv_usd uses rate ratio (binance/bcv)', () => {
    // 1.0 * (37.0/36.5) = 1.01369...
    const result = convertBalanceToUSD(
      100000000,
      'BTC',
      'CRYPTO',
      'bcv_usd',
      mockBcv,
      mockBinance
    );
    expect(result).toBeCloseTo(1.0137, 3);
  });

  it('BTC at bcv_eur uses rate ratio', () => {
    // 1.0 * (37.0/40.0) = 0.925
    const result = convertBalanceToUSD(
      100000000,
      'BTC',
      'CRYPTO',
      'bcv_eur',
      mockBcv,
      mockBinance
    );
    expect(result).toBeCloseTo(0.925, 3);
  });

  it('zero balance returns zero', () => {
    expect(
      convertBalanceToUSD(0, 'VES', 'BANK', 'bcv_usd', mockBcv, mockBinance)
    ).toBe(0);
  });

  it('VES divides by zero gracefully when rate is 0 (no Infinity)', () => {
    const zeroBcv = { usd: 0, eur: 0 };
    const zeroBinance = { usd_ves: 0 };
    expect(
      convertBalanceToUSD(
        1234567,
        'VES',
        'BANK',
        'bcv_usd',
        zeroBcv,
        zeroBinance
      )
    ).toBe(0);
    expect(
      convertBalanceToUSD(
        1234567,
        'VES',
        'BANK',
        'binance',
        zeroBcv,
        zeroBinance
      )
    ).toBe(0);
    expect(
      convertBalanceToUSD(
        1234567,
        'VES',
        'BANK',
        'bcv_eur',
        zeroBcv,
        zeroBinance
      )
    ).toBe(0);
  });

  it('BTC at binance with zero rates returns the base value (no rate lookup needed)', () => {
    // At `binance` source, BTC is reported in its base USD value
    // (1 BTC = 1 unit of stored USD-ish value). No division by rate.
    const zeroBcv = { usd: 0, eur: 0 };
    const zeroBinance = { usd_ves: 0 };
    expect(
      convertBalanceToUSD(
        100000000,
        'BTC',
        'CRYPTO',
        'binance',
        zeroBcv,
        zeroBinance
      )
    ).toBe(1);
  });

  it('BTC at bcv_usd with zero rates returns 0 (no NaN)', () => {
    // 0/0 = NaN previously. We guard so result is 0.
    const zeroBcv = { usd: 0, eur: 0 };
    const zeroBinance = { usd_ves: 0 };
    const result = convertBalanceToUSD(
      100000000,
      'BTC',
      'CRYPTO',
      'bcv_usd',
      zeroBcv,
      zeroBinance
    );
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
  });

  it('negative amountMinor returns negative USD (no Math.abs side effect)', () => {
    expect(
      convertBalanceToUSD(
        -1234567,
        'VES',
        'BANK',
        'bcv_usd',
        mockBcv,
        mockBinance
      )
    ).toBeLessThan(0);
  });

  it('USDT falls through to the default branch (passthrough)', () => {
    expect(
      convertBalanceToUSD(
        50000,
        'USDT',
        'BANK',
        'bcv_usd',
        mockBcv,
        mockBinance
      )
    ).toBe(500);
  });

  it('ETH at binance returns base value (ETH / 1e8)', () => {
    // 250000000 / 1e8 = 2.5
    const result = convertBalanceToUSD(
      250000000,
      'ETH',
      'CRYPTO',
      'binance',
      mockBcv,
      mockBinance
    );
    expect(result).toBe(2.5);
  });
});
