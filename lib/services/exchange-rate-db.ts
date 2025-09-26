import { createClient } from '@supabase/supabase-js';

interface ExchangeRateData {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;
  buy_rate: number;
  lastUpdated: string;
  source: string;
}

class ExchangeRateDatabase {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async storeExchangeRate(data: ExchangeRateData): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('exchange_rates')
        .insert({
          usd_ves: data.usd_ves,
          usdt_ves: data.usdt_ves,
          sell_rate: data.sell_rate,
          buy_rate: data.buy_rate,
          last_updated: data.lastUpdated,
          source: data.source,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing exchange rate:', error);
        return false;
      }

      console.log('Exchange rate stored successfully');
      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  async getLatestExchangeRate(): Promise<ExchangeRateData | null> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest exchange rate:', error);
        return null;
      }

      return {
        usd_ves: data.usd_ves,
        usdt_ves: data.usdt_ves,
        sell_rate: data.sell_rate,
        buy_rate: data.buy_rate,
        lastUpdated: data.last_updated,
        source: data.source
      };
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  async getExchangeRateHistory(limit: number = 100): Promise<ExchangeRateData[]> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching exchange rate history:', error);
        return [];
      }

      return data.map(rate => ({
        usd_ves: rate.usd_ves,
        usdt_ves: rate.usdt_ves,
        sell_rate: rate.sell_rate,
        buy_rate: rate.buy_rate,
        lastUpdated: rate.last_updated,
        source: rate.source
      }));
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  }
}

export default ExchangeRateDatabase;
