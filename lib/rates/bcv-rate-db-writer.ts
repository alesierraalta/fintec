import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { BCVRateWriter } from '@/repositories/contracts/bcv-rate-writer';

export class ExchangeRateDatabaseBCVWriter implements BCVRateWriter {
  constructor(private db: ExchangeRateDatabase) {}

  async write(data: {
    usd: number;
    eur: number;
    source: string;
    lastUpdated: string;
  }): Promise<boolean> {
    return this.db.storeExchangeRate({
      usd_ves: data.usd,
      usdt_ves: data.usd,
      sell_rate: data.usd,
      buy_rate: data.usd,
      lastUpdated: data.lastUpdated,
      source: data.source,
    });
  }
}
