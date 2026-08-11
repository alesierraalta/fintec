import type { RatesHistoryRepository } from '@/repositories/contracts';
import { BCVRateWriter } from '@/repositories/contracts/bcv-rate-writer';
import { formatCaracasDayKey } from '@/lib/utils/date-key';

/**
 * Persists a scraped BCV snapshot into the BCV-specific read model
 * (bcv_rate_history). It deliberately does NOT write to the unified
 * exchange_rates snapshot: that table feeds the Binance/market reference and
 * BCV values there would masquerade as the market rate. The unified snapshot is
 * maintained by the Binance refresh and the background scraper manager.
 */
export class ExchangeRateDatabaseBCVWriter implements BCVRateWriter {
  constructor(private repository: RatesHistoryRepository) {}

  async write(data: {
    usd: number;
    eur: number;
    source: string;
    lastUpdated: string;
  }): Promise<boolean> {
    try {
      await this.repository.upsertBCVRate({
        date: formatCaracasDayKey(new Date()),
        usd: data.usd,
        eur: data.eur,
        source: data.source,
        timestamp: data.lastUpdated,
      });
      return true;
    } catch {
      return false;
    }
  }
}
