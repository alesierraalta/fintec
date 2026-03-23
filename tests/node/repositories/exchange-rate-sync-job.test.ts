import { runExchangeRateSyncJob } from '@/lib/services/exchange-rate-sync-job';
import {
  mapBcvPayloadToRates,
  mapBinancePayloadToRates,
} from '@/supabase/functions/sync-exchange-rates/shared';

describe('exchange-rate sync job', () => {
  it('maps BCV and Binance provider payloads into upsertable rates', () => {
    expect(
      mapBcvPayloadToRates({ data: { usd: 36.5, eur: 39.1 } }, '2026-03-23')
    ).toEqual([
      {
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: 36.5,
        date: '2026-03-23',
        provider: 'BCV',
      },
      {
        baseCurrency: 'EUR',
        quoteCurrency: 'VES',
        rate: 39.1,
        date: '2026-03-23',
        provider: 'BCV',
      },
    ]);

    expect(
      mapBinancePayloadToRates(
        { data: { usd_ves: 37.2, usdt_ves: 37.1, busd_ves: 37.05 } },
        '2026-03-23'
      )
    ).toHaveLength(3);
  });

  it('upserts collected provider rates and surfaces partial provider failures', async () => {
    const repository = {
      updateRatesFromProvider: jest
        .fn()
        .mockResolvedValue(new Array(5).fill({})),
    };
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('bcv')) {
        return {
          ok: true,
          json: async () => ({ data: { usd: 36.5, eur: 39.1 } }),
        } as Response;
      }

      return {
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response;
    });

    const result = await runExchangeRateSyncJob(repository as any, {
      bcvUrl: 'https://example.com/bcv',
      binanceUrl: 'https://example.com/binance',
      runDate: '2026-03-23',
      fetchImpl,
      logger,
    });

    expect(repository.updateRatesFromProvider).toHaveBeenCalledWith([
      {
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: 36.5,
        date: '2026-03-23',
        provider: 'BCV',
      },
      {
        baseCurrency: 'EUR',
        quoteCurrency: 'VES',
        rate: 39.1,
        date: '2026-03-23',
        provider: 'BCV',
      },
    ]);
    expect(result).toEqual({
      savedCount: 5,
      errorCount: 1,
      errors: ['BINANCE: BINANCE endpoint responded with 503'],
      runDate: '2026-03-23',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
