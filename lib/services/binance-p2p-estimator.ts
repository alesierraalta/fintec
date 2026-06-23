/**
 * Binance P2P Rate Estimator (frontend-only simulation).
 *
 * Units used throughout this module:
 *   - Exchange rate: integer fixed-point hundredths.
 *       790.00 VES/USDT -> 79000
 *   - Transaction amount: integer minor units (USD cents).
 *       $1,200.00 -> 120000
 *   - Percentage adjustments: basis points (1 bp = 0.01% of the rate).
 *   - Direct adjustments: integer fixed-point hundredths.
 *       -200 hundredths = -2.00 VES/USDT
 *
 * This module is pure: no I/O, no network. It consumes a cached base rate
 * already loaded elsewhere and applies deterministic, testable rules so the
 * UI can simulate how a Binance P2P rate might shift by side, payment method,
 * and amount tier.
 */

export type P2PSide = 'BUY' | 'SELL';

export type PaymentMethod = 'all' | 'mercantil' | 'banesco' | 'pago_movil';

export type AmountTier = 'low' | 'medium' | 'high';

export interface P2PEstimateInput {
  /** Base rate in fixed-point hundredths (e.g. 79000 = 790.00 VES/USDT). */
  baseRateRaw: number;
  side: P2PSide;
  paymentMethod: PaymentMethod;
  /** Transaction amount in USD cents (e.g. 120000 = $1,200.00). */
  amountUsdCents: number;
}

export interface P2PEstimateResult {
  /** Estimated rate in fixed-point hundredths. */
  estimatedRateRaw: number;
  /** Net adjustment expressed in fixed-point hundredths. */
  appliedOffsetHundredths: number;
  /** Whether the input base was stale and replaced by the safe baseline. */
  isFallbackApplied: boolean;
  /** True when the output rate was derived from the synthetic safe baseline. */
  usedSafeBaseline: boolean;
}

/** Any base rate at or below 500.00 VES/USDT is treated as stale/invalid. */
export const STALE_RATE_MAX_HUNDREDTHS = 50000;

/** Safe baseline used when the cached rate is stale. 770.00 VES/USDT. */
export const SAFE_FALLBACK_RATE_HUNDREDTHS = 77000;

/** Amount tier thresholds in USD cents. */
export const AMOUNT_TIER_THRESHOLDS: Record<AmountTier, number> = {
  low: 0,
  medium: 10000, // $100.00
  high: 100000, // $1,000.00
};

/** Re-export with the name some tests/docs may use. */
export const AMOUNT_TIER_CENTS = AMOUNT_TIER_THRESHOLDS;

const HUNDREDTHS_PER_RATE_UNIT = 100;
const HUNDREDTHS_PER_BPS = 100; // 1 bp = 0.01% of the rate = 0.0001 of the rate

/**
 * Direct fixed-point hundredths offsets per (payment method, side).
 *
 * Mercantil SELL: -200 hundredths (-2.00 VES/USDT). Other combinations
 * default to 0. The estimator applies this as a flat adjustment to the base
 * rate rather than as a percentage of it.
 */
const PAYMENT_METHOD_OFFSET_HUNDREDTHS: Record<
  PaymentMethod,
  Record<P2PSide, number>
> = {
  all: { BUY: 0, SELL: 0 },
  mercantil: { BUY: 0, SELL: -200 },
  banesco: { BUY: 0, SELL: 0 },
  pago_movil: { BUY: 0, SELL: 0 },
};

/**
 * Direction-aware rules for the high amount tier, expressed in basis points
 * of the base rate. BUY premiums the rate; SELL has no high-tier adjustment.
 */
const HIGH_TIER_OFFSET_BPS: Record<P2PSide, number> = {
  BUY: 100, // +1% of the base rate
  SELL: 0,
};

export function isStaleRate(baseRateRaw: number): boolean {
  if (!Number.isFinite(baseRateRaw)) {
    return true;
  }
  return baseRateRaw <= STALE_RATE_MAX_HUNDREDTHS;
}

export function formatRateHundredths(raw: number): string {
  const safe = Number.isFinite(raw) ? raw : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const integerPart = Math.floor(abs / HUNDREDTHS_PER_RATE_UNIT);
  const fractionPart = abs % HUNDREDTHS_PER_RATE_UNIT;
  const fractionPadded = fractionPart.toString().padStart(2, '0');
  return `${sign}${integerPart}.${fractionPadded}`;
}

/**
 * Resolve the amount tier from a USD-cents amount.
 *  - low:    [0, $100)
 *  - medium: [$100, $1,000)
 *  - high:   >= $1,000
 */
export function resolveAmountTier(amountUsdCents: number): AmountTier {
  if (amountUsdCents >= AMOUNT_TIER_THRESHOLDS.high) {
    return 'high';
  }
  if (amountUsdCents >= AMOUNT_TIER_THRESHOLDS.medium) {
    return 'medium';
  }
  return 'low';
}

/**
 * Pure estimator. Produces a deterministic adjusted rate from a cached base.
 *
 * Adjustment composition (applied in order):
 *  1. Stale-rate guard: if the cached base is at or below 500.00 VES/USDT,
 *     the safe baseline (77000) replaces it.
 *  2. Bank/side direct offset: -200 hundredths for Mercantil SELL (others: 0).
 *  3. High-tier side offset: +100 bps for BUY with amount >= 1000 USD.
 *
 * The final rate is rounded to the nearest hundredth using integer math.
 */
export function estimateP2PRate(input: P2PEstimateInput): P2PEstimateResult {
  const fallbackApplied = isStaleRate(input.baseRateRaw);
  const effectiveBase = fallbackApplied
    ? SAFE_FALLBACK_RATE_HUNDREDTHS
    : input.baseRateRaw;

  const bankOffsetHundredths =
    PAYMENT_METHOD_OFFSET_HUNDREDTHS[input.paymentMethod]?.[input.side] ?? 0;
  const tier = resolveAmountTier(input.amountUsdCents);
  const tierOffsetBps = tier === 'high' ? HIGH_TIER_OFFSET_BPS[input.side] : 0;
  const tierOffsetHundredths = Math.round(
    (effectiveBase * tierOffsetBps) / (HUNDREDTHS_PER_BPS * 100)
  );

  const totalOffsetHundredths = bankOffsetHundredths + tierOffsetHundredths;
  const estimatedRateRaw = effectiveBase + totalOffsetHundredths;

  return {
    estimatedRateRaw,
    appliedOffsetHundredths: totalOffsetHundredths,
    isFallbackApplied: fallbackApplied,
    usedSafeBaseline: fallbackApplied,
  };
}
