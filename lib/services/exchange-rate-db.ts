import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';

import { logger } from '@/lib/utils/logger';
interface ExchangeRateData {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;
  buy_rate: number;
  lastUpdated: string;
  source: string;
}

class ExchangeRateDatabase {
  private ratesHistoryRepository: SupabaseRatesHistoryRepository;

  constructor(repository?: SupabaseRatesHistoryRepository) {
    this.ratesHistoryRepository =
      repository || new SupabaseRatesHistoryRepository();
  }

  async storeExchangeRate(data: ExchangeRateData): Promise<boolean> {
    try {
      await this.ratesHistoryRepository.insertExchangeRateSnapshot({
        usdVes: data.usd_ves,
        usdtVes: data.usdt_ves,
        sellRate: data.sell_rate,
        buyRate: data.buy_rate,
        lastUpdated: data.lastUpdated,
        source: data.source,
      });

      logger.info('Exchange rate stored successfully');
      return true;
    } catch (error) {
      logger.error('Database error:', error);
      return false;
    }
  }

  async getLatestExchangeRate(): Promise<ExchangeRateData | null> {
    try {
      const data =
        await this.ratesHistoryRepository.getLatestExchangeRateSnapshot();

      if (!data) {
        // Fallback to reconstruction if snapshot table is empty
        return this.getReconstructedLatestRate();
      }

      return {
        usd_ves: data.usdVes,
        usdt_ves: data.usdtVes,
        sell_rate: data.sellRate,
        buy_rate: data.buyRate,
        lastUpdated: data.lastUpdated,
        source: data.source,
      };
    } catch (error) {
      logger.error('Database error:', error);
      return null;
    }
  }

  /**
   * Reconstructs the latest rate from individual history tables.
   * Useful when the unified snapshot is missing or stale.
   */
  async getReconstructedLatestRate(): Promise<ExchangeRateData | null> {
    try {
      const [bcv, binance] = await Promise.all([
        this.ratesHistoryRepository.getLatestBCVRate(),
        this.ratesHistoryRepository.getLatestBinanceRate(),
      ]);

      if (!bcv && !binance) {
        return null;
      }

      // Merge data, prioritizing most recent timestamp
      const lastUpdated =
        new Date(bcv?.timestamp || 0) > new Date(binance?.timestamp || 0)
          ? bcv?.timestamp
          : binance?.timestamp;

      return {
        usd_ves: bcv?.usd || binance?.usd || 0,
        usdt_ves: binance?.usd || bcv?.usd || 0,
        sell_rate: binance?.usd || 0,
        buy_rate: binance?.usd || 0,
        lastUpdated: lastUpdated || new Date().toISOString(),
        source: `Reconstructed (${bcv ? 'BCV' : ''}${bcv && binance ? '+' : ''}${binance ? 'Binance' : ''})`,
      };
    } catch (error) {
      logger.error('Database reconstruction error:', error);
      return null;
    }
  }

  async getExchangeRateHistory(
    limit: number = 100
  ): Promise<ExchangeRateData[]> {
    try {
      const data =
        await this.ratesHistoryRepository.listExchangeRateSnapshots(limit);

      return data.map((rate) => ({
        usd_ves: rate.usdVes,
        usdt_ves: rate.usdtVes,
        sell_rate: rate.sellRate,
        buy_rate: rate.buyRate,
        lastUpdated: rate.lastUpdated,
        source: rate.source,
      }));
    } catch (error) {
      logger.error('Database error:', error);
      return [];
    }
  }
}

export default ExchangeRateDatabase;
