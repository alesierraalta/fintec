/**
 * Pure adjustment engine for Binance P2P rate simulation.
 * Per sdd/binance-p2p-rate-filters/spec: zero live API calls, integer math.
 */

export type BankId =
  | 'mercantil'
  | 'banesco'
  | 'provincial'
  | 'paypal'
  | 'zelle'
  | 'other';
export type Side = 'BUY' | 'SELL';
export type AmountTier = 'small' | 'medium' | 'large';

export const KNOWN_BANKS: readonly BankId[] = [
  'mercantil',
  'banesco',
  'provincial',
  'paypal',
  'zelle',
  'other',
] as const;

export const SAFE_FALLBACK_RATE = 77000;
export const TIER_SMALL_MAX = 50000;
export const TIER_MEDIUM_MAX = 200000;

const BANK_OFFSETS_BP: Record<BankId, { buy: number; sell: number }> = {
  mercantil: { buy: 100, sell: -100 },
  banesco: { buy: 0, sell: 0 },
  provincial: { buy: 50, sell: -50 },
  paypal: { buy: 200, sell: -200 },
  zelle: { buy: 150, sell: -150 },
  other: { buy: 0, sell: 0 },
};

const TIER_OFFSETS_BP: Record<AmountTier, number> = {
  small: 0,
  medium: 25,
  large: 50,
};

export function getBankOffset(bank: BankId, side: Side): number {
  const offsets = BANK_OFFSETS_BP[bank];
  if (!offsets) return 0;
  return side === 'BUY' ? offsets.buy : offsets.sell;
}

export function getAmountTier(amountMinor: number): AmountTier {
  if (amountMinor <= TIER_SMALL_MAX) return 'small';
  if (amountMinor <= TIER_MEDIUM_MAX) return 'medium';
  return 'large';
}

export function calculateAdjustedRate(
  baseRateMinor: number,
  side: Side,
  bank: BankId,
  amountMinor: number
): number {
  if (baseRateMinor <= 0) return 0;
  const bankOffset = getBankOffset(bank, side);
  const tier = getAmountTier(amountMinor);
  const totalBp = bankOffset + TIER_OFFSETS_BP[tier];
  const scaled = baseRateMinor * (10000 + totalBp);
  return Math.max(0, Math.round(scaled / 10000));
}

export function withSafeFallback(rateMinor: number, isStale: boolean): number {
  if (!isStale) return rateMinor;
  if (rateMinor >= 70000 && rateMinor <= 90000) return rateMinor;
  return SAFE_FALLBACK_RATE;
}
