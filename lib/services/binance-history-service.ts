import Dexie, { Table } from 'dexie';

import { logger } from '@/lib/utils/logger';
import { formatCaracasDayKey } from '@/lib/utils/date-key';

export interface BinanceHistoryRecord {
  id?: number;
  date: string;
  timestamp: string;
  usd: number;
  source: 'Binance';
}

export interface BinanceTrend {
  percentage: number;
  direction: 'up' | 'down' | 'stable';
  period: string;
}

class BinanceHistoryDatabase extends Dexie {
  binanceRates!: Table<BinanceHistoryRecord>;

  constructor() {
    super('BinanceHistoryDB');
    this.version(1).stores({
      binanceRates: '++id, date, timestamp, usd, source'
    });
  }
}

class BinanceHistoryService {
  private static instance: BinanceHistoryService;
  private db: BinanceHistoryDatabase;

  private constructor() {
    this.db = new BinanceHistoryDatabase();
  }

  static getInstance(): BinanceHistoryService {
    if (!BinanceHistoryService.instance) {
      BinanceHistoryService.instance = new BinanceHistoryService();
    }
    return BinanceHistoryService.instance;
  }

  async saveRates(usd: number): Promise<void> {
    try {
      const now = new Date();
      const dateStr = formatCaracasDayKey(now);
      const timestamp = now.toISOString();

      // Verificar si ya existe un registro para hoy
      const existingRecord = await this.db.binanceRates
        .where('date')
        .equals(dateStr)
        .first();

      if (existingRecord) {
        // Actualizar el registro existente
        await this.db.binanceRates.update(existingRecord.id!, {
          usd,
          timestamp
        });
      } else {
        // Crear nuevo registro
        await this.db.binanceRates.add({
          date: dateStr,
          timestamp,
          usd,
          source: 'Binance'
        });
      }

      // Limpiar registros antiguos (mantener solo últimos 90 días)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoffDateStr = formatCaracasDayKey(cutoffDate);

      await this.db.binanceRates
        .where('date')
        .below(cutoffDateStr)
        .delete();

    } catch (error) {
      logger.error('Error saving Binance rates to history:', error);
    }
  }

  async getRatesForDate(date: string): Promise<BinanceHistoryRecord | null> {
    try {
      return await this.db.binanceRates
        .where('date')
        .equals(date)
        .first() || null;
    } catch (error) {
      logger.error('Error getting Binance rates for date:', error);
      return null;
    }
  }

  async getHistoricalRates(days: number = 30): Promise<BinanceHistoryRecord[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = formatCaracasDayKey(cutoffDate);

      return await this.db.binanceRates
        .where('date')
        .aboveOrEqual(cutoffDateStr)
        .toArray();
    } catch (error) {
      logger.error('Error getting historical Binance rates:', error);
      return [];
    }
  }

  async calculateTrends(days: number = 7): Promise<BinanceTrend> {
    try {
      const rates = await this.getHistoricalRates(days + 1);
      
      if (rates.length < 2) {
        return {
          percentage: 0,
          direction: 'stable',
          period: `${days}d`
        };
      }

      // Ordenar por fecha (más antigua primero)
      rates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const oldestRate = rates[0];
      const newestRate = rates[rates.length - 1];
      
      const percentage = ((newestRate.usd - oldestRate.usd) / oldestRate.usd) * 100;
      
      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentage) > 0.1) { // Umbral del 0.1%
        direction = percentage > 0 ? 'up' : 'down';
      }

      return {
        percentage: Math.abs(percentage),
        direction,
        period: `${days}d`
      };
    } catch (error) {
      logger.error('Error calculating Binance trends:', error);
      return {
        percentage: 0,
        direction: 'stable',
        period: `${days}d`
      };
    }
  }

  async getLatestRate(): Promise<BinanceHistoryRecord | null> {
    try {
      return await this.db.binanceRates
        .orderBy('timestamp')
        .reverse()
        .first() || null;
    } catch (error) {
      logger.error('Error getting latest Binance rate:', error);
      return null;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await this.db.binanceRates.clear();
    } catch (error) {
      logger.error('Error clearing Binance history:', error);
    }
  }

  async getAverageRate(days: number = 7): Promise<number> {
    try {
      const rates = await this.getHistoricalRates(days);
      
      if (rates.length === 0) return 0;
      
      const sum = rates.reduce((acc, rate) => acc + rate.usd, 0);
      return sum / rates.length;
    } catch (error) {
      logger.error('Error calculating average Binance rate:', error);
      return 0;
    }
  }
}

export const binanceHistoryService = BinanceHistoryService.getInstance();
