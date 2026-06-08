/**
 * Rates Bounded Context
 *
 * Groups exchange rate repositories: exchangeRates, ratesHistory, scrapeAttempts.
 * This context handles all currency rate and exchange rate operations.
 */

import type { ExchangeRatesRepository } from '@/repositories/contracts/exchange-rates-repository';
import type { RatesHistoryRepository } from '@/repositories/contracts/rates-history-repository';
import type { ScrapeAttemptsRepository } from '@/repositories/contracts/scrape-attempts-repository';

export interface RatesContext {
  exchangeRates: ExchangeRatesRepository;
  ratesHistory: RatesHistoryRepository;
  scrapeAttempts: ScrapeAttemptsRepository;
}

export interface CreateRatesContextInput {
  exchangeRates: ExchangeRatesRepository;
  ratesHistory: RatesHistoryRepository;
  scrapeAttempts: ScrapeAttemptsRepository;
}

/**
 * Factory function to create a Rates bounded context.
 *
 * @param input - Repository instances for the rates domain
 * @returns RatesContext with grouped repository access
 */
export function createRatesContext(input: CreateRatesContextInput): RatesContext {
  return {
    exchangeRates: input.exchangeRates,
    ratesHistory: input.ratesHistory,
    scrapeAttempts: input.scrapeAttempts,
  };
}
