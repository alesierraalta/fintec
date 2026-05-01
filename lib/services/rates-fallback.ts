export type BCVRateData = {
  usd: number;
  eur: number;
  lastUpdated: string;
  source: string;
};

export type BinanceRateData = {
  usd_ves: number;
  usdt_ves: number;
  busd_ves: number;
  sell_rate: number;
  buy_rate: number;
  lastUpdated: string;
  source: string;
};

// * Static BCV fallback rates should be treated as a *last resort*.
// * Keep them reasonable and centralized to avoid inconsistent hardcodes across modules.
// * Last updated: 2026-04-23
export const STATIC_BCV_FALLBACK_RATES = {
  usd: 60.15,
  eur: 64.2,
} as const;

// * Static Binance P2P fallback rates - centralized to avoid hardcoded values
// * Last updated: 2026-04-23
// * These represent typical VES/USDT P2P market rates
export const STATIC_BINANCE_FALLBACK_RATES = {
  usd_ves: 61.5,
  usdt_ves: 61.5,
  busd_ves: 61.5,
  sell_rate: 62.0,
  buy_rate: 61.0,
  spread: 1.0,
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

export function buildBinanceFallbackData(
  reason: string,
  now: Date = new Date()
): BinanceRateData {
  return {
    usd_ves: STATIC_BINANCE_FALLBACK_RATES.usd_ves,
    usdt_ves: STATIC_BINANCE_FALLBACK_RATES.usdt_ves,
    busd_ves: STATIC_BINANCE_FALLBACK_RATES.busd_ves,
    sell_rate: STATIC_BINANCE_FALLBACK_RATES.sell_rate,
    buy_rate: STATIC_BINANCE_FALLBACK_RATES.buy_rate,
    lastUpdated: now.toISOString(),
    source: `Binance P2P (fallback - ${reason})`,
  };
}

export function isFallbackSource(source: string | undefined): boolean {
  return /fallback/i.test(source ?? '');
}
