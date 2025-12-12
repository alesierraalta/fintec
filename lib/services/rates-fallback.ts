export type BCVRateData = {
  usd: number;
  eur: number;
  lastUpdated: string;
  source: string;
};

// Static BCV fallback rates should be treated as a *last resort*.
// Keep them reasonable and centralized to avoid inconsistent hardcodes across modules.
export const STATIC_BCV_FALLBACK_RATES = {
  usd: 267.75,
  eur: 314.38,
} as const;

export function buildBCVFallbackData(
  reason: string,
  now: Date = new Date()
): BCVRateData {
  return {
    usd: STATIC_BCV_FALLBACK_RATES.usd,
    eur: STATIC_BCV_FALLBACK_RATES.eur,
    lastUpdated: now.toISOString(),
    source: `BCV (fallback - ${reason})`,
  };
}

export function isFallbackSource(source: string | undefined): boolean {
  return /fallback/i.test(source ?? '');
}

