import { ExchangeRate } from '@/types';
import { BaseRepository } from './base-repository';

export interface CreateExchangeRateDTO {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  date: string;
  provider: string;
}

export interface UpdateExchangeRateDTO extends Partial<CreateExchangeRateDTO> {
  id: string;
}

export interface ExchangeRatesRepository extends BaseRepository<ExchangeRate, CreateExchangeRateDTO, UpdateExchangeRateDTO> {
  // Exchange rate specific queries
  findByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate[]>;
  findLatestByPair(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRate | null>;
  findByDate(date: string): Promise<ExchangeRate[]>;
  findByDateRange(startDate: string, endDate: string): Promise<ExchangeRate[]>;
  findByProvider(provider: string): Promise<ExchangeRate[]>;
  
  // Rate retrieval with fallback
  getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number>;
  getRateWithFallback(baseCurrency: string, quoteCurrency: string, date?: string): Promise<{
    rate: number;
    source: 'exact' | 'latest' | 'fallback';
    date: string;
  }>;
  
  // Bulk operations
  updateRatesFromProvider(rates: CreateExchangeRateDTO[]): Promise<ExchangeRate[]>;
  
  // Cache management
  clearOldRates(olderThanDays: number): Promise<number>; // Returns count of deleted rates
  
  // Supported currencies
  getSupportedCurrencies(): Promise<string[]>;
  
  // Rate history
  getRateHistory(baseCurrency: string, quoteCurrency: string, days: number): Promise<{
    date: string;
    rate: number;
  }[]>;
}
