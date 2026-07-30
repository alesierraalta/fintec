/**
 * Pure helpers for displaying and converting currency balances using a chosen
 * rate source (BCV USD, BCV EUR, or Binance P2P). No React, no hooks, no
 * module-level state — every function takes its dependencies as parameters so
 * it's trivially testable and safe to call from any layer.
 */

export type RateSource = 'binance' | 'bcv_usd' | 'bcv_eur';

/**
 * Approximate EUR→USD ratio used by the BCV EUR rate path. The BCV publishes
 * only VES-per-EUR; we need USD for the totals card, so we estimate via this
 * ratio. Update when the EUR/USD pair drifts materially. Value is a business
 * rule, not a constant derived from rates.
 */
export const EUR_USD_RATIO = 1.1;

export interface BcvLike {
  usd: number;
  eur: number;
}

export interface BinanceLike {
  usd_ves: number;
}

/** Human-readable name for a rate source. Falls back to "BCV USD". */
export function getRateName(source: RateSource): string {
  switch (source) {
    case 'binance':
      return 'Binance';
    case 'bcv_usd':
      return 'BCV USD';
    case 'bcv_eur':
      return 'BCV EUR';
    default:
      return 'BCV USD';
  }
}

/** Returns the VES-per-1-unit rate for the given source. */
export function getExchangeRate(
  source: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  switch (source) {
    case 'binance':
      return binance.usd_ves || 1;
    case 'bcv_usd':
      return bcv.usd || 1;
    case 'bcv_eur':
      return bcv.eur || 1;
    default:
      return bcv.usd || 1;
  }
}

export function getDisplayCurrency(source: RateSource): {
  code: string;
  symbol: string;
} {
  if (source === 'bcv_eur') {
    return { code: 'EUR', symbol: '€' };
  }
  return { code: 'USD', symbol: '$' };
}

/**
 * Convert a minor-unit balance to its display major-unit value using the chosen
 * rate source. Crypto balances are stored with 8 decimal places (×1e8).
 */
export function convertBalanceToDisplay(
  amountMinor: number,
  currency: string,
  accountType: string | undefined,
  useRate: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  const isDisplayEur = useRate === 'bcv_eur';

  if (currency === 'USD') {
    const usdValue = amountMinor / 100;
    return isDisplayEur ? usdValue / EUR_USD_RATIO : usdValue;
  }

  if (currency === 'EUR') {
    const eurValue = amountMinor / 100;
    return isDisplayEur ? eurValue : eurValue * EUR_USD_RATIO;
  }

  if (isCryptoCurrency(currency, accountType)) {
    return convertCryptoToDisplay(amountMinor, useRate, bcv, binance);
  }

  if (currency === 'VES') {
    return convertVesToDisplay(amountMinor, useRate, bcv, binance);
  }

  const fallbackUsdValue = amountMinor / 100;
  return isDisplayEur ? fallbackUsdValue / EUR_USD_RATIO : fallbackUsdValue;
}

function isCryptoCurrency(
  currency: string,
  accountType: string | undefined
): boolean {
  return accountType === 'CRYPTO' || currency === 'BTC' || currency === 'ETH';
}

function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

function convertCryptoToDisplay(
  amountMinor: number,
  useRate: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  const balanceMajor = amountMinor / 100000000;

  if (useRate === 'binance') {
    return balanceMajor;
  }

  const vesEquivalent = balanceMajor * (binance.usd_ves || 1);

  if (useRate === 'bcv_eur') {
    return safeDivide(vesEquivalent, bcv.eur);
  }

  return safeDivide(vesEquivalent, bcv.usd);
}

function convertVesToDisplay(
  amountMinor: number,
  useRate: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  const balanceMajor = amountMinor / 100;
  switch (useRate) {
    case 'binance':
      return safeDivide(balanceMajor, binance.usd_ves);
    case 'bcv_usd':
      return safeDivide(balanceMajor, bcv.usd);
    case 'bcv_eur':
      return safeDivide(balanceMajor, bcv.eur);
    default:
      return safeDivide(balanceMajor, bcv.usd);
  }
}
