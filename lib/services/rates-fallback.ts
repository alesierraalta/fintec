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
// * Last updated: 2024-12-18
export const STATIC_BCV_FALLBACK_RATES = {
  usd: 57.50,
  eur: 62.80,
} as const;

// * Static Binance P2P fallback rates - centralized to avoid hardcoded values
// * Last updated: 2024-12-18
// * These represent typical VES/USDT P2P market rates
export const STATIC_BINANCE_FALLBACK_RATES = {
  usd_ves: 57.50,
  usdt_ves: 57.50,
  busd_ves: 57.50,
  sell_rate: 58.00,
  buy_rate: 57.00,
  spread: 1.00,
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
