import Dexie, { Table } from 'dexie';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { formatCaracasDayKey } from '@/lib/utils/date-key';
import { logger } from '@/lib/utils/logger';

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

interface SupabaseBCVRecord {
  id: string;
  date: string;
  usd: number;
  eur: number;
  timestamp: string;
  source: string;
  created_at: string;
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
  private supabase: SupabaseClient | null = null;
  private syncInProgress = false;

  private constructor() {
    this.db = new BCVHistoryDatabase();
    this.initSupabase();
  }

  private initSupabase(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  static getInstance(): BCVHistoryService {
    if (!BCVHistoryService.instance) {
      BCVHistoryService.instance = new BCVHistoryService();
    }
    return BCVHistoryService.instance;
  }

  // Sync a single rate to Supabase (non-blocking)
  private async syncToSupabase(date: string, usd: number, eur: number, source: string, timestamp: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('bcv_rate_history')
        .upsert({
          date,
          usd,
          eur,
          source,
          timestamp
        }, { onConflict: 'date' });

      if (error) {
        logger.warn('[BCVHistoryService] Failed to sync to Supabase:', error.message);
      }
    } catch (error) {
      // Non-blocking - don't throw, just log
      logger.warn('[BCVHistoryService] Supabase sync error:', error);
    }
  }

  // Load historical data from Supabase to local IndexedDB
  async loadFromSupabase(days: number = 30): Promise<void> {
    if (!this.supabase || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateStr = formatCaracasDayKey(cutoffDate);

      const { data, error } = await this.supabase
        .from('bcv_rate_history')
        .select('*')
        .gte('date', cutoffDateStr)
        .order('date', { ascending: false });

      if (error) {
        logger.warn('[BCVHistoryService] Failed to load from Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Bulk insert to local database
        for (const record of data as SupabaseBCVRecord[]) {
          const existing = await this.db.bcvHistory.where('date').equals(record.date).first();
          if (!existing) {
            await this.db.bcvHistory.add({
              date: record.date,
              usd: Number(record.usd),
              eur: Number(record.eur),
              timestamp: record.timestamp,
              source: record.source
            });
          }
        }
        logger.info(`[BCVHistoryService] Synced ${data.length} records from Supabase`);
      }
    } catch (error) {
      logger.error('[BCVHistoryService] Error loading from Supabase:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Save today's rates
  async saveRates(usd: number, eur: number, source: string = 'BCV'): Promise<void> {
    const now = new Date();
    const today = formatCaracasDayKey(now); // YYYY-MM-DD (America/Caracas)
    const todayUtc = now.toISOString().split('T')[0];
    const timestamp = now.toISOString();
    const incomingIsFallback = source.toLowerCase().includes('fallback');

    try {
      // Check if we already have rates for today
      const existingRecord =
        (await this.db.bcvHistory.where('date').equals(today).first()) ??
        // Backward-compat: migrate UTC-keyed record if present
        (todayUtc !== today
          ? await this.db.bcvHistory.where('date').equals(todayUtc).first()
          : null);

      if (existingRecord) {
        const existingIsFallback = existingRecord.source
          .toLowerCase()
          .includes('fallback');

        // Do not overwrite a good record with fallback data
        if (!existingIsFallback && incomingIsFallback) {
          return;
        }

        // Update existing record
        await this.db.bcvHistory.update(existingRecord.id!, {
          date: today,
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

      // Sync to Supabase (non-blocking)
      this.syncToSupabase(
        today,
        Math.round(usd * 100) / 100,
        Math.round(eur * 100) / 100,
        source,
        timestamp
      ).catch(() => { }); // Ignore sync errors

      // Keep history bounded
      await this.cleanOldRecords(365);
    } catch (error) {
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
      return null;
    }
  }

  // Get today's rates
  async getTodaysRates(): Promise<BCVHistoryRecord | null> {
    const now = new Date();
    const today = formatCaracasDayKey(now);
    const record = await this.getRatesForDate(today);
    if (record) return record;

    const todayUtc = now.toISOString().split('T')[0];
    if (todayUtc !== today) {
      return this.getRatesForDate(todayUtc);
    }

    return null;
  }

  // Get yesterday's rates
  async getYesterdaysRates(): Promise<BCVHistoryRecord | null> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const yesterdayStr = formatCaracasDayKey(yesterday);
    const record = await this.getRatesForDate(yesterdayStr);
    if (record) return record;

    const yesterdayUtc = yesterday.toISOString().split('T')[0];
    if (yesterdayUtc !== yesterdayStr) {
      return this.getRatesForDate(yesterdayUtc);
    }

    return null;
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
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const startDateStr = formatCaracasDayKey(startDate);
      const endDateStr = formatCaracasDayKey(endDate);

      let records = await this.db.bcvHistory
        .where('date')
        .between(startDateStr, endDateStr, true, true)
        .toArray();

      // If local is empty or has few records, try to load from Supabase
      if (records.length < 2) {
        await this.loadFromSupabase(days);
        // Re-fetch after sync
        records = await this.db.bcvHistory
          .where('date')
          .between(startDateStr, endDateStr, true, true)
          .toArray();
      }

      return records.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      return [];
    }
  }

  // Get latest available rate record (by timestamp)
  async getLatestRate(): Promise<BCVHistoryRecord | null> {
    try {
      return (
        (await this.db.bcvHistory.orderBy('timestamp').reverse().first()) || null
      );
    } catch (error) {
      return null;
    }
  }

  // Clean old records (keep only last N days)
  async cleanOldRecords(keepDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      const cutoffDateStr = formatCaracasDayKey(cutoffDate);

      await this.db.bcvHistory
        .where('date')
        .below(cutoffDateStr)
        .delete();
    } catch (error) {
    }
  }
}

export const bcvHistoryService = BCVHistoryService.getInstance();
