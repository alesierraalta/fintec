import {
  ExchangeRatesRepository,
  CreateExchangeRateDTO,
  UpdateExchangeRateDTO,
} from '@/repositories/contracts';
import { ExchangeRate, PaginationParams, PaginatedResult } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import {
  mapSupabaseExchangeRateToDomain,
  mapDomainExchangeRateToSupabase,
  mapSupabaseExchangeRateArrayToDomain,
} from './mappers';

export class SupabaseExchangeRatesRepository
  implements ExchangeRatesRepository
{
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  async findAll(): Promise<ExchangeRate[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findById(id: string): Promise<ExchangeRate | null> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch exchange rate: ${error.message}`);
    }

    return mapSupabaseExchangeRateToDomain(data);
  }

  async findByPair(
    baseCurrency: string,
    quoteCurrency: string
  ): Promise<ExchangeRate[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch exchange rates by pair: ${error.message}`
      );
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findLatestByPair(
    baseCurrency: string,
    quoteCurrency: string
  ): Promise<ExchangeRate | null> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch latest exchange rate: ${error.message}`);
    }

    return data ? mapSupabaseExchangeRateToDomain(data) : null;
  }

  async findByDate(date: string): Promise<ExchangeRate[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .eq('date', date)
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch exchange rates by date: ${error.message}`
      );
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ExchangeRate[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch exchange rates by date range: ${error.message}`
      );
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findByProvider(provider: string): Promise<ExchangeRate[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .eq('provider', provider)
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch exchange rates by provider: ${error.message}`
      );
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findPaginated(
    params: PaginationParams
  ): Promise<PaginatedResult<ExchangeRate>> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await this.client
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count exchange rates: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: mapSupabaseExchangeRateArrayToDomain(data || []),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(data: CreateExchangeRateDTO): Promise<ExchangeRate> {
    const supabaseRate = {
      base_currency: data.baseCurrency,
      quote_currency: data.quoteCurrency,
      rate: data.rate,
      date: data.date,
      provider: data.provider,
    };

    const { data: inserted, error } = await this.client
      .from('exchange_rates')
      .insert(supabaseRate)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exchange rate: ${error.message}`);
    }

    return mapSupabaseExchangeRateToDomain(inserted);
  }

  async createMany(data: CreateExchangeRateDTO[]): Promise<ExchangeRate[]> {
    const supabaseRates = data.map((d) => ({
      base_currency: d.baseCurrency,
      quote_currency: d.quoteCurrency,
      rate: d.rate,
      date: d.date,
      provider: d.provider,
    }));

    const { data: inserted, error } = await this.client
      .from('exchange_rates')
      .insert(supabaseRates)
      .select();

    if (error) {
      throw new Error(`Failed to bulk create exchange rates: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(inserted || []);
  }

  async update(
    id: string,
    updates: UpdateExchangeRateDTO
  ): Promise<ExchangeRate> {
    const supabaseUpdates: any = {};
    if (updates.baseCurrency)
      supabaseUpdates.base_currency = updates.baseCurrency;
    if (updates.quoteCurrency)
      supabaseUpdates.quote_currency = updates.quoteCurrency;
    if (updates.rate !== undefined) supabaseUpdates.rate = updates.rate;
    if (updates.date) supabaseUpdates.date = updates.date;
    if (updates.provider) supabaseUpdates.provider = updates.provider;

    const { data, error } = await this.client
      .from('exchange_rates')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update exchange rate: ${error.message}`);
    }

    return mapSupabaseExchangeRateToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('exchange_rates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete exchange rate: ${error.message}`);
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await this.client
      .from('exchange_rates')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to bulk delete exchange rates: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count exchange rates: ${error.message}`);
    }

    return count || 0;
  }

  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    return !!data && !error;
  }

  // Rate retrieval with fallback
  async getRate(
    baseCurrency: string,
    quoteCurrency: string,
    date?: string
  ): Promise<number> {
    if (baseCurrency === quoteCurrency) return 1;

    let query = this.client
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency);

    if (date) {
      query = query.eq('date', date);
    } else {
      query = query.order('date', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      // Try reverse pair
      let reverseQuery = this.client
        .from('exchange_rates')
        .select('rate')
        .eq('base_currency', quoteCurrency)
        .eq('quote_currency', baseCurrency);

      if (date) {
        reverseQuery = reverseQuery.eq('date', date);
      } else {
        reverseQuery = reverseQuery
          .order('date', { ascending: false })
          .limit(1);
      }

      const { data: revData, error: revError } =
        await reverseQuery.maybeSingle();
      if (!revError && revData && revData.rate > 0) {
        return 1 / revData.rate;
      }

      throw new Error(
        `Exchange rate not found for ${baseCurrency}/${quoteCurrency}`
      );
    }

    return data.rate;
  }

  async getRateWithFallback(
    baseCurrency: string,
    quoteCurrency: string,
    date?: string
  ): Promise<{
    rate: number;
    source: 'exact' | 'latest' | 'fallback';
    date: string;
  }> {
    if (baseCurrency === quoteCurrency) {
      return {
        rate: 1,
        source: 'exact',
        date: date || new Date().toISOString().split('T')[0],
      };
    }

    try {
      // 1. Try exact date
      if (date) {
        const rate = await this.getRate(baseCurrency, quoteCurrency, date);
        return { rate, source: 'exact', date };
      }
    } catch (e) {}

    // 2. Try latest
    try {
      const latest = await this.findLatestByPair(baseCurrency, quoteCurrency);
      if (latest) {
        return { rate: latest.rate, source: 'latest', date: latest.date };
      }
    } catch (e) {}

    // 3. Last fallback (e.g., 1 if same currency or global default)
    return {
      rate: 1,
      source: 'fallback',
      date: new Date().toISOString().split('T')[0],
    };
  }

  // Bulk operations
  async updateRatesFromProvider(
    rates: CreateExchangeRateDTO[]
  ): Promise<ExchangeRate[]> {
    const supabaseRates = rates.map((r) => ({
      base_currency: r.baseCurrency,
      quote_currency: r.quoteCurrency,
      rate: r.rate,
      date: r.date,
      provider: r.provider,
    }));

    const { data, error } = await this.client
      .from('exchange_rates')
      .upsert(supabaseRates, {
        onConflict: 'base_currency,quote_currency,date,provider',
      })
      .select();

    if (error) {
      throw new Error(`Failed to update rates from provider: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  // Cache management
  async clearOldRates(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const dateStr = cutoffDate.toISOString().split('T')[0];

    const { error, count } = await this.client
      .from('exchange_rates')
      .delete({ count: 'exact' })
      .lt('date', dateStr);

    if (error) {
      throw new Error(`Failed to clear old rates: ${error.message}`);
    }

    return count || 0;
  }

  // Supported currencies
  async getSupportedCurrencies(): Promise<string[]> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('base_currency, quote_currency');

    if (error) return [];

    const currencies = new Set<string>();
    (data || []).forEach((row) => {
      currencies.add(row.base_currency);
      currencies.add(row.quote_currency);
    });

    return Array.from(currencies).sort();
  }

  // Rate history
  async getRateHistory(
    baseCurrency: string,
    quoteCurrency: string,
    days: number
  ): Promise<
    {
      date: string;
      rate: number;
    }[]
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.client
      .from('exchange_rates')
      .select('date, rate')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) return [];

    return (data || []).map((row) => ({
      date: row.date,
      rate: row.rate,
    }));
  }
}
