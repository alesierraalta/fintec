import type { RatesHistoryRepository } from '@/repositories/contracts';
import { BCVRateWriter } from '@/repositories/contracts/bcv-rate-writer';

export class ExchangeRateDatabaseBCVWriter implements BCVRateWriter {
  constructor(private repository: RatesHistoryRepository) {}

  async write(data: {
    usd: number;
    eur: number;
    source: string;
    lastUpdated: string;
  }): Promise<boolean> {
    try {
      await this.repository.insertExchangeRateSnapshot({
        usdVes: data.usd,
        usdtVes: data.usd,
        sellRate: data.usd,
        buyRate: data.usd,
        lastUpdated: data.lastUpdated,
        source: data.source,
      });
      return true;
    } catch {
      return false;
    }
  }
}
