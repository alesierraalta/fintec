import { ExchangeRate, PaginatedResult, PaginationParams } from '@/types';
import { 
  ExchangeRatesRepository, 
  CreateExchangeRateDTO, 
  UpdateExchangeRateDTO 
} from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';
import { getCurrentDate, formatDate } from '@/lib/dates';

export class LocalExchangeRatesRepository implements ExchangeRatesRepository {
  async findById(id: string): Promise<ExchangeRate | null> {
    return (await db.exchangeRates.get(id)) || null;
  }

  async findAll(): Promise<ExchangeRate[]> {
    return db.exchangeRates.orderBy('date').reverse().toArray();
  }

  async create(data: CreateExchangeRateDTO): Promise<ExchangeRate> {
    const exchangeRate: ExchangeRate = {
      id: generateId('rate'),
      baseCurrency: data.baseCurrency,
      quoteCurrency: data.quoteCurrency,
      rate: data.rate,
      date: data.date,
      provider: data.provider,
      createdAt: new Date().toISOString(),
    };

    await db.exchangeRates.add(exchangeRate);
    return exchangeRate;
  }

  async update(id: string, data: UpdateExchangeRateDTO): Promise<ExchangeRate> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Exchange rate with id ${id} not found`);
    }

    const updated: ExchangeRate = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
    };

    await db.exchangeRates.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.exchangeRates.delete(id);
  }

  async createMany(data: CreateExchangeRateDTO[]): Promise<ExchangeRate[]> {
    const exchangeRates: ExchangeRate[] = data.map(item => ({
      id: generateId('rate'),
      baseCurrency: item.baseCurrency,
      quoteCurrency: item.quoteCurrency,
      rate: item.rate,
      date: item.date,
      provider: item.provider,
      createdAt: new Date().toISOString(),
    }));

    await db.exchangeRates.bulkAdd(exchangeRates);
    return exchangeRates;
  }

  async deleteMany(ids: string[]): Promise<void> {
    await db.exchangeRates.bulkDelete(ids);
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<ExchangeRate>> {
    const { page, limit, sortBy = 'date', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = db.exchangeRates.orderBy(sortBy as keyof ExchangeRate);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.exchangeRates.count();
    const data = await query.offset(offset).limit(limit).toArray();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async count(): Promise<number> {
    return db.exchangeRates.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.exchangeRates.get(id)) !== undefined;
  }

  // Exchange rate specific methods
  async findByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate[]> {
    return db.exchangeRates
      .where('baseCurrency').equals(baseCurrency)
      .and(rate => rate.quoteCurrency === quoteCurrency)
      .reverse()
      .sortBy('date');
  }

  async findLatestByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate | null> {
    const rates = await this.findByPair(baseCurrency, quoteCurrency);
    return rates.length > 0 ? rates[0] : null;
  }

  async findByDate(date: string): Promise<ExchangeRate[]> {
    return db.exchangeRates.where('date').equals(date).toArray();
  }

  async findByDateRange(startDate: string, endDate: string): Promise<ExchangeRate[]> {
    return db.exchangeRates
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async findByProvider(provider: string): Promise<ExchangeRate[]> {
    return db.exchangeRates.where('provider').equals(provider).toArray();
  }

  async getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number> {
    // Same currency
    if (baseCurrency === quoteCurrency) {
      return 1;
    }

    const targetDate = date || getCurrentDate();
    
    // Try to find exact rate for the date
    const exactRate = await db.exchangeRates
      .where('baseCurrency').equals(baseCurrency)
      .and(rate => rate.quoteCurrency === quoteCurrency && rate.date === targetDate)
      .first();

    if (exactRate) {
      return exactRate.rate;
    }

    // Try to find the latest rate before or on the target date
    const latestRate = await db.exchangeRates
      .where('baseCurrency').equals(baseCurrency)
      .and(rate => rate.quoteCurrency === quoteCurrency && rate.date <= targetDate)
      .reverse()
      .sortBy('date');

    if (latestRate.length > 0) {
      return latestRate[0].rate;
    }

    // Try inverse rate (quote/base)
    const inverseRate = await db.exchangeRates
      .where('baseCurrency').equals(quoteCurrency)
      .and(rate => rate.quoteCurrency === baseCurrency && rate.date <= targetDate)
      .reverse()
      .sortBy('date');

    if (inverseRate.length > 0) {
      return 1 / inverseRate[0].rate;
    }

    // Default to 1 if no rate found (should ideally throw error or fetch from external API)
    console.warn(`No exchange rate found for ${baseCurrency}/${quoteCurrency} on ${targetDate}`);
    return 1;
  }

  async getRateWithFallback(baseCurrency: string, quoteCurrency: string, date?: string): Promise<{
    rate: number;
    source: 'exact' | 'latest' | 'fallback';
    date: string;
  }> {
    // Same currency
    if (baseCurrency === quoteCurrency) {
      return {
        rate: 1,
        source: 'exact',
        date: date || getCurrentDate(),
      };
    }

    const targetDate = date || getCurrentDate();
    
    // Try to find exact rate for the date
    const exactRate = await db.exchangeRates
      .where('baseCurrency').equals(baseCurrency)
      .and(rate => rate.quoteCurrency === quoteCurrency && rate.date === targetDate)
      .first();

    if (exactRate) {
      return {
        rate: exactRate.rate,
        source: 'exact',
        date: exactRate.date,
      };
    }

    // Try to find the latest rate
    const latestRate = await this.findLatestByPair(baseCurrency, quoteCurrency);
    if (latestRate) {
      return {
        rate: latestRate.rate,
        source: 'latest',
        date: latestRate.date,
      };
    }

    // Try inverse rate
    const inverseRate = await this.findLatestByPair(quoteCurrency, baseCurrency);
    if (inverseRate) {
      return {
        rate: 1 / inverseRate.rate,
        source: 'latest',
        date: inverseRate.date,
      };
    }

    // Fallback to 1
    return {
      rate: 1,
      source: 'fallback',
      date: targetDate,
    };
  }

  async updateRatesFromProvider(rates: CreateExchangeRateDTO[]): Promise<ExchangeRate[]> {
    // Remove old rates for the same date and pairs to avoid duplicates
    for (const rateData of rates) {
      await db.exchangeRates
        .where('baseCurrency').equals(rateData.baseCurrency)
        .and(rate => 
          rate.quoteCurrency === rateData.quoteCurrency && 
          rate.date === rateData.date &&
          rate.provider === rateData.provider
        )
        .delete();
    }

    return this.createMany(rates);
  }

  async clearOldRates(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffDateStr = formatDate(cutoffDate, 'ISO');

    const oldRates = await db.exchangeRates
      .where('date')
      .below(cutoffDateStr)
      .toArray();

    await db.exchangeRates
      .where('date')
      .below(cutoffDateStr)
      .delete();

    return oldRates.length;
  }

  async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.findAll();
    const currencies = new Set<string>();

    for (const rate of rates) {
      currencies.add(rate.baseCurrency);
      currencies.add(rate.quoteCurrency);
    }

    return Array.from(currencies).sort();
  }

  async getRateHistory(baseCurrency: string, quoteCurrency: string, days: number): Promise<{
    date: string;
    rate: number;
  }[]> {
    const endDate = getCurrentDate();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = formatDate(startDate, 'ISO');

    const rates = await db.exchangeRates
      .where('baseCurrency').equals(baseCurrency)
      .and(rate => 
        rate.quoteCurrency === quoteCurrency && 
        rate.date >= startDateStr && 
        rate.date <= endDate
      )
      .sortBy('date');

    return rates.map(rate => ({
      date: rate.date,
      rate: rate.rate,
    }));
  }
}
