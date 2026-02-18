export interface BCVRateHistoryEntry {
  date: string;
  usd: number;
  eur: number;
  source: string;
  timestamp: string;
}

export interface BinanceRateHistoryEntry {
  date: string;
  usd: number;
  source: string;
  timestamp: string;
}

export interface ExchangeRateSnapshot {
  usdVes: number;
  usdtVes: number;
  sellRate: number;
  buyRate: number;
  lastUpdated: string;
  source: string;
}

export interface RatesHistoryRepository {
  upsertBCVRate(entry: BCVRateHistoryEntry): Promise<void>;
  listBCVRatesSince(date: string): Promise<BCVRateHistoryEntry[]>;
  upsertBinanceRate(entry: BinanceRateHistoryEntry): Promise<void>;
  listBinanceRatesSince(date: string): Promise<BinanceRateHistoryEntry[]>;
  insertExchangeRateSnapshot(snapshot: ExchangeRateSnapshot): Promise<void>;
  getLatestExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null>;
  listExchangeRateSnapshots(limit: number): Promise<ExchangeRateSnapshot[]>;
}
