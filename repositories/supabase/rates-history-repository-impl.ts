import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type {
  BCVRateHistoryEntry,
  BinanceRateHistoryEntry,
  ExchangeRateSnapshot,
  RatesHistoryRepository,
} from '@/repositories/contracts';

function createDefaultClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

export class SupabaseRatesHistoryRepository implements RatesHistoryRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createDefaultClient();
  }

  async upsertBCVRate(entry: BCVRateHistoryEntry): Promise<void> {
    const { error } = await this.client.from('bcv_rate_history').upsert(
      {
        date: entry.date,
        usd: entry.usd,
        eur: entry.eur,
        source: entry.source,
        timestamp: entry.timestamp,
      },
      { onConflict: 'date' }
    );

    if (error) {
      throw new Error(`Failed to sync BCV rate: ${error.message}`);
    }
  }

  async listBCVRatesSince(date: string): Promise<BCVRateHistoryEntry[]> {
    const { data, error } = await this.client
      .from('bcv_rate_history')
      .select('*')
      .gte('date', date)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to load BCV rates: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      date: row.date,
      usd: Number(row.usd),
      eur: Number(row.eur),
      source: row.source,
      timestamp: row.timestamp,
    }));
  }

  async upsertBinanceRate(entry: BinanceRateHistoryEntry): Promise<void> {
    const { error } = await this.client.from('binance_rate_history').upsert(
      {
        date: entry.date,
        usd: entry.usd,
        source: entry.source,
        timestamp: entry.timestamp,
      },
      { onConflict: 'date' }
    );

    if (error) {
      throw new Error(`Failed to sync Binance rate: ${error.message}`);
    }
  }

  async listBinanceRatesSince(
    date: string
  ): Promise<BinanceRateHistoryEntry[]> {
    const { data, error } = await this.client
      .from('binance_rate_history')
      .select('*')
      .gte('date', date)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to load Binance rates: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      date: row.date,
      usd: Number(row.usd),
      source: row.source,
      timestamp: row.timestamp,
    }));
  }

  async insertExchangeRateSnapshot(
    snapshot: ExchangeRateSnapshot
  ): Promise<void> {
    const { error } = await this.client.from('exchange_rates').insert({
      usd_ves: snapshot.usdVes,
      usdt_ves: snapshot.usdtVes,
      sell_rate: snapshot.sellRate,
      buy_rate: snapshot.buyRate,
      last_updated: snapshot.lastUpdated,
      source: snapshot.source,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(
        `Failed to store exchange rate snapshot: ${error.message}`
      );
    }
  }

  async getLatestExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch latest exchange rate: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      usdVes: data.usd_ves,
      usdtVes: data.usdt_ves,
      sellRate: data.sell_rate,
      buyRate: data.buy_rate,
      lastUpdated: data.last_updated,
      source: data.source,
    };
  }

  async listExchangeRateSnapshots(
    limit: number
  ): Promise<ExchangeRateSnapshot[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(
        `Failed to fetch exchange rate history: ${error.message}`
      );
    }

    return (data || []).map((row: any) => ({
      usdVes: row.usd_ves,
      usdtVes: row.usdt_ves,
      sellRate: row.sell_rate,
      buyRate: row.buy_rate,
      lastUpdated: row.last_updated,
      source: row.source,
    }));
  }
}
