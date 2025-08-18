import Dexie, { Table } from 'dexie';

export interface BCVHistoryRecord {
  id?: number;
  date: string; // YYYY-MM-DD format
  usd: number;
  eur: number;
  timestamp: string; // ISO timestamp
  source: string;
}

export interface BCVTrend {
  currency: 'usd' | 'eur';
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

class BCVHistoryDatabase extends Dexie {
  bcvHistory!: Table<BCVHistoryRecord>;

  constructor() {
    super('BCVHistoryDB');
    this.version(1).stores({
      bcvHistory: '++id, date, usd, eur, timestamp'
    });
  }
}

export class BCVHistoryService {
  private static instance: BCVHistoryService;
  private db: BCVHistoryDatabase;

  private constructor() {
    this.db = new BCVHistoryDatabase();
  }

  static getInstance(): BCVHistoryService {
    if (!BCVHistoryService.instance) {
      BCVHistoryService.instance = new BCVHistoryService();
    }
    return BCVHistoryService.instance;
  }

  // Save today's rates
  async saveRates(usd: number, eur: number, source: string = 'BCV'): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = new Date().toISOString();

    try {
      // Check if we already have rates for today
      const existingRecord = await this.db.bcvHistory
        .where('date')
        .equals(today)
        .first();

      if (existingRecord) {
        // Update existing record
        await this.db.bcvHistory.update(existingRecord.id!, {
          usd: Math.round(usd * 100) / 100, // Ensure 2 decimals
          eur: Math.round(eur * 100) / 100, // Ensure 2 decimals
          timestamp,
          source
        });
      } else {
        // Create new record
        await this.db.bcvHistory.add({
          date: today,
          usd: Math.round(usd * 100) / 100,
          eur: Math.round(eur * 100) / 100,
          timestamp,
          source
        });
      }
    } catch (error) {
      console.error('Error saving BCV rates:', error);
      throw error;
    }
  }

  // Get rates for a specific date
  async getRatesForDate(date: string): Promise<BCVHistoryRecord | null> {
    try {
      const record = await this.db.bcvHistory
        .where('date')
        .equals(date)
        .first();
      
      return record || null;
    } catch (error) {
      console.error('Error getting rates for date:', error);
      return null;
    }
  }

  // Get today's rates
  async getTodaysRates(): Promise<BCVHistoryRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getRatesForDate(today);
  }

  // Get yesterday's rates
  async getYesterdaysRates(): Promise<BCVHistoryRecord | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return this.getRatesForDate(yesterdayStr);
  }

  // Calculate trends by comparing today vs yesterday
  async calculateTrends(): Promise<{ usd: BCVTrend; eur: BCVTrend } | null> {
    try {
      const todaysRates = await this.getTodaysRates();
      const yesterdaysRates = await this.getYesterdaysRates();

      if (!todaysRates || !yesterdaysRates) {
        return null;
      }

      const usdTrend = this.calculateTrend('usd', todaysRates.usd, yesterdaysRates.usd);
      const eurTrend = this.calculateTrend('eur', todaysRates.eur, yesterdaysRates.eur);

      return {
        usd: usdTrend,
        eur: eurTrend
      };
    } catch (error) {
      console.error('Error calculating trends:', error);
      return null;
    }
  }

  private calculateTrend(currency: 'usd' | 'eur', current: number, previous: number): BCVTrend {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) < 0.1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      currency,
      current: Math.round(current * 100) / 100,
      previous: Math.round(previous * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      trend
    };
  }

  // Get historical data for charts (last N days)
  async getHistoricalRates(days: number = 30): Promise<BCVHistoryRecord[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const records = await this.db.bcvHistory
        .where('date')
        .between(startDateStr, endDateStr, true, true)
        .toArray();

      return records.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting historical rates:', error);
      return [];
    }
  }

  // Clean old records (keep only last N days)
  async cleanOldRecords(keepDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      await this.db.bcvHistory
        .where('date')
        .below(cutoffDateStr)
        .delete();
    } catch (error) {
      console.error('Error cleaning old records:', error);
    }
  }
}

export const bcvHistoryService = BCVHistoryService.getInstance();

