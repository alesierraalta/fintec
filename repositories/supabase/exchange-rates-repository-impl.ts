import { ExchangeRatesRepository } from '@/repositories/contracts';
import { ExchangeRate, PaginationParams, PaginatedResult } from '@/types';
import { supabase } from './client';
import { 
  mapSupabaseExchangeRateToDomain, 
  mapDomainExchangeRateToSupabase,
  mapSupabaseExchangeRateArrayToDomain 
} from './mappers';

export class SupabaseExchangeRatesRepository implements ExchangeRatesRepository {
  async findAll(): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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

  async findByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch exchange rates by pair: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findLatestByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate | null> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch latest exchange rate: ${error.message}`);
    }

    return mapSupabaseExchangeRateToDomain(data);
  }

  async findByDate(date: string): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('date', date)
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exchange rates by date: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exchange rates by date range: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findByProvider(provider: string): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('provider', provider)
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exchange rates by provider: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findByCurrency(currency: string): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .or(`base_currency.eq.${currency},quote_currency.eq.${currency}`)
      .order('date', { ascending: false })
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exchange rates by currency: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async findWithPagination(params: PaginationParams): Promise<PaginatedResult<ExchangeRate>> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count exchange rates: ${countError.message}`);
    }

    // Get paginated data
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .order('base_currency', { ascending: true }) // Secondary sort
      .order('quote_currency', { ascending: true }) // Tertiary sort
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

  async create(exchangeRate: Omit<ExchangeRate, 'id' | 'createdAt'>): Promise<ExchangeRate> {
    const supabaseExchangeRate = mapDomainExchangeRateToSupabase(exchangeRate);

    const { data, error } = await supabase
      .from('exchange_rates')
      .insert(supabaseExchangeRate)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create exchange rate: ${error.message}`);
    }

    return mapSupabaseExchangeRateToDomain(data);
  }

  async update(id: string, updates: Partial<ExchangeRate>): Promise<ExchangeRate> {
    const supabaseUpdates = mapDomainExchangeRateToSupabase(updates);

    const { data, error } = await supabase
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
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete exchange rate: ${error.message}`);
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('exchange_rates')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count exchange rates: ${error.message}`);
    }

    return count || 0;
  }

  async upsert(exchangeRate: Omit<ExchangeRate, 'id' | 'createdAt'>): Promise<ExchangeRate> {
    // Try to find existing rate for the same pair, date, and provider
    const existing = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('base_currency', exchangeRate.baseCurrency)
      .eq('quote_currency', exchangeRate.quoteCurrency)
      .eq('date', exchangeRate.date)
      .eq('provider', exchangeRate.provider)
      .single();

    if (existing.data && !existing.error) {
      // Update existing rate
      return this.update(existing.data.id, exchangeRate);
    } else {
      // Create new rate
      return this.create(exchangeRate);
    }
  }

  async bulkCreate(exchangeRates: Omit<ExchangeRate, 'id' | 'createdAt'>[]): Promise<ExchangeRate[]> {
    const supabaseExchangeRates = exchangeRates.map(rate => 
      mapDomainExchangeRateToSupabase(rate)
    );

    const { data, error } = await supabase
      .from('exchange_rates')
      .insert(supabaseExchangeRates)
      .select();

    if (error) {
      throw new Error(`Failed to bulk create exchange rates: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async bulkUpsert(exchangeRates: Omit<ExchangeRate, 'id' | 'createdAt'>[]): Promise<ExchangeRate[]> {
    const supabaseExchangeRates = exchangeRates.map(rate => 
      mapDomainExchangeRateToSupabase(rate)
    );

    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert(supabaseExchangeRates, {
        onConflict: 'base_currency,quote_currency,date,provider'
      })
      .select();

    if (error) {
      throw new Error(`Failed to bulk upsert exchange rates: ${error.message}`);
    }

    return mapSupabaseExchangeRateArrayToDomain(data || []);
  }

  async deleteByDateRange(startDate: string, endDate: string): Promise<void> {
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      throw new Error(`Failed to delete exchange rates by date range: ${error.message}`);
    }
  }

  async deleteByProvider(provider: string): Promise<void> {
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('provider', provider);

    if (error) {
      throw new Error(`Failed to delete exchange rates by provider: ${error.message}`);
    }
  }

  async getAvailableCurrencyPairs(): Promise<{ baseCurrency: string; quoteCurrency: string }[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('base_currency, quote_currency')
      .order('base_currency', { ascending: true })
      .order('quote_currency', { ascending: true });

    if (error) {
      throw new Error(`Failed to get available currency pairs: ${error.message}`);
    }

    // Remove duplicates
    const pairs = new Set<string>();
    const result: { baseCurrency: string; quoteCurrency: string }[] = [];

    (data || []).forEach(item => {
      const key = `${item.base_currency}-${item.quote_currency}`;
      if (!pairs.has(key)) {
        pairs.add(key);
        result.push({
          baseCurrency: item.base_currency,
          quoteCurrency: item.quote_currency,
        });
      }
    });

    return result;
  }

  async getLatestRates(baseCurrency?: string): Promise<ExchangeRate[]> {
    let query = supabase
      .from('exchange_rates')
      .select('*');

    if (baseCurrency) {
      query = query.eq('base_currency', baseCurrency);
    }

    // Get the latest rate for each currency pair
    const { data, error } = await query
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get latest rates: ${error.message}`);
    }

    // Group by currency pair and get the latest for each
    const latestRates = new Map<string, any>();
    (data || []).forEach(rate => {
      const key = `${rate.base_currency}-${rate.quote_currency}`;
      if (!latestRates.has(key)) {
        latestRates.set(key, rate);
      }
    });

    return mapSupabaseExchangeRateArrayToDomain(Array.from(latestRates.values()));
  }
}
