import type {
  CreateExchangeRateDTO,
  ExchangeRatesRepository,
} from '@/repositories/contracts';
import {
  collectExchangeRates,
  type CollectExchangeRatesOptions,
  type ExchangeRateSyncLogger,
} from '@/supabase/functions/sync-exchange-rates/shared';

export interface ExchangeRateSyncJobResult {
  savedCount: number;
  errorCount: number;
  errors: string[];
  runDate: string;
}

export interface ExchangeRateSyncJobOptions
  extends Omit<CollectExchangeRatesOptions, 'logger'> {
  logger?: ExchangeRateSyncLogger;
}

export async function runExchangeRateSyncJob(
  repository: ExchangeRatesRepository,
  options: ExchangeRateSyncJobOptions
): Promise<ExchangeRateSyncJobResult> {
  const { rates, errors, runDate } = await collectExchangeRates(options);

  if (rates.length === 0) {
    throw new Error(
      `Exchange-rate sync failed: ${errors.join('; ') || 'no provider returned rates'}`
    );
  }

  const saved = await repository.updateRatesFromProvider(
    rates as CreateExchangeRateDTO[]
  );

  options.logger?.info('Exchange-rate sync persisted provider rates', {
    runDate,
    savedCount: saved.length,
    errorCount: errors.length,
  });

  return {
    savedCount: saved.length,
    errorCount: errors.length,
    errors,
    runDate,
  };
}
