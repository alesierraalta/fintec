export interface ExchangeRateSyncRecord {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  date: string;
  provider: string;
}

export interface ExchangeRateSyncLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface CollectExchangeRatesOptions {
  fetchImpl?: typeof fetch;
  bcvUrl: string;
  binanceUrl: string;
  runDate?: string | Date;
  logger?: ExchangeRateSyncLogger;
}

const defaultLogger: ExchangeRateSyncLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function readPayloadData(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  }

  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }

  throw new Error('Provider payload is not an object');
}

function getNumericField(
  data: Record<string, unknown>,
  field: string
): number | null {
  const value = data[field];
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export function normalizeRunDate(runDate: string | Date = new Date()): string {
  if (runDate instanceof Date) {
    return runDate.toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
    return runDate;
  }

  return new Date(runDate).toISOString().slice(0, 10);
}

export function mapBcvPayloadToRates(
  payload: unknown,
  runDate: string
): ExchangeRateSyncRecord[] {
  const data = readPayloadData(payload);
  const usdRate = getNumericField(data, 'usd');
  const eurRate = getNumericField(data, 'eur');
  const rates: ExchangeRateSyncRecord[] = [];

  if (usdRate !== null) {
    rates.push({
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      rate: usdRate,
      date: runDate,
      provider: 'BCV',
    });
  }

  if (eurRate !== null) {
    rates.push({
      baseCurrency: 'EUR',
      quoteCurrency: 'VES',
      rate: eurRate,
      date: runDate,
      provider: 'BCV',
    });
  }

  if (rates.length === 0) {
    throw new Error('BCV payload did not include valid numeric usd/eur rates');
  }

  return rates;
}

export function mapBinancePayloadToRates(
  payload: unknown,
  runDate: string
): ExchangeRateSyncRecord[] {
  const data = readPayloadData(payload);
  const pairs: Array<[string, string]> = [
    ['usd_ves', 'USD'],
    ['usdt_ves', 'USDT'],
    ['busd_ves', 'BUSD'],
  ];

  const rates = pairs
    .map(([field, baseCurrency]) => {
      const rate = getNumericField(data, field);
      if (rate === null) {
        return null;
      }

      return {
        baseCurrency,
        quoteCurrency: 'VES',
        rate,
        date: runDate,
        provider: 'BINANCE',
      } satisfies ExchangeRateSyncRecord;
    })
    .filter((value): value is ExchangeRateSyncRecord => value !== null);

  if (rates.length === 0) {
    throw new Error(
      'Binance payload did not include valid numeric usd_ves/usdt_ves/busd_ves rates'
    );
  }

  return rates;
}

async function fetchProviderRates(
  provider: 'BCV' | 'BINANCE',
  url: string,
  mapper: (payload: unknown, runDate: string) => ExchangeRateSyncRecord[],
  runDate: string,
  fetchImpl: typeof fetch,
  logger: ExchangeRateSyncLogger
): Promise<ExchangeRateSyncRecord[]> {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`${provider} endpoint responded with ${response.status}`);
  }

  const payload = await response.json();
  const rates = mapper(payload, runDate);
  logger.info('Fetched exchange-rate provider payload', {
    provider,
    count: rates.length,
    runDate,
  });
  return rates;
}

export async function collectExchangeRates(
  options: CollectExchangeRatesOptions
): Promise<{
  rates: ExchangeRateSyncRecord[];
  errors: string[];
  runDate: string;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const logger = options.logger ?? defaultLogger;
  const runDate = normalizeRunDate(options.runDate);

  const results = await Promise.allSettled([
    fetchProviderRates(
      'BCV',
      options.bcvUrl,
      mapBcvPayloadToRates,
      runDate,
      fetchImpl,
      logger
    ),
    fetchProviderRates(
      'BINANCE',
      options.binanceUrl,
      mapBinancePayloadToRates,
      runDate,
      fetchImpl,
      logger
    ),
  ]);

  const rates: ExchangeRateSyncRecord[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    const provider = index === 0 ? 'BCV' : 'BINANCE';
    if (result.status === 'fulfilled') {
      rates.push(...result.value);
      return;
    }

    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    errors.push(`${provider}: ${reason}`);
    logger.error('Exchange-rate provider sync failed', {
      provider,
      reason,
      runDate,
    });
  });

  if (rates.length === 0) {
    logger.warn('Exchange-rate sync produced no rates', { runDate, errors });
  }

  return { rates, errors, runDate };
}
