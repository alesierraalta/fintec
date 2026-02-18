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
  private ratesHistoryRepository = new SupabaseRatesHistoryRepository();

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
        return null;
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
