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

/**
 * Convert a minor-unit balance to its USD major-unit value using the chosen
 * rate source. Crypto balances are stored with 8 decimal places (×1e8) and use
 * a different conversion path (rate ratio when BCV is selected).
 */
export function convertBalanceToUSD(
  amountMinor: number,
  currency: string,
  accountType: string | undefined,
  useRate: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  if (currency === 'USD') {
    return amountMinor / 100;
  }

  if (isCryptoCurrency(currency, accountType)) {
    return convertCryptoToUSD(amountMinor, useRate, bcv, binance);
  }

  if (currency === 'VES') {
    return convertVesToUSD(amountMinor, useRate, bcv, binance);
  }

  return amountMinor / 100;
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

function convertCryptoToUSD(
  amountMinor: number,
  useRate: RateSource,
  bcv: BcvLike,
  binance: BinanceLike
): number {
  const balanceMajor = amountMinor / 100000000;
  if (useRate === 'bcv_usd' || useRate === 'bcv_eur') {
    const bcvRate = useRate === 'bcv_eur' ? bcv.eur : bcv.usd;
    return balanceMajor * safeDivide(binance.usd_ves, bcvRate);
  }
  return balanceMajor;
}

function convertVesToUSD(
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
      return safeDivide(balanceMajor, bcv.eur) * EUR_USD_RATIO;
    default:
      return safeDivide(balanceMajor, bcv.usd);
  }
}
