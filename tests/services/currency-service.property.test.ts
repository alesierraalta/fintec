import fc from 'fast-check';
import { currencyService } from '@/lib/services/currency-service';
import { BCVRates, BinanceRates } from '@/lib/services/currency-service';

// Define constant locally since it's not exported from rate-comparison
const USD_TO_EUR_RATE = 0.92; // 1 USD = 0.92 EUR approx

// Mock the external currency service dependencies to ensure deterministic tests
jest.mock('@/lib/services/bcv-history-service', () => ({
  bcvHistoryService: {
    // Mock any methods used by CurrencyService if necessary
  },
}));

jest.mock('@/lib/services/binance-history-service', () => ({
  binanceHistoryService: {
    // Mock any methods used by CurrencyService if necessary
  },
}));

describe('CurrencyService property-based tests', () => {
  beforeEach(() => {
    // Reset internal state
    (currencyService as any).bcvRates = null;
    (currencyService as any).binanceRates = null;
    (currencyService as any).cryptoPrices = new Map();
    (currencyService as any).exchangeRates = new Map();
  });

  // Arbitrary for a positive amount
  const amountArbitrary = fc.double({ min: 0.01, max: 1000000, noNaN: true, noInfinity: true });

  // Arbitrary for supported currencies (USD, EUR, VES, BUSD)
  const currencyArbitrary = fc.oneof(
    fc.constant('USD'),
    fc.constant('EUR'),
    fc.constant('VES'),
    fc.constant('BUSD')
  );

  // Helper to set mock rates for the service
  const setMockRates = (bcvUsd: number, bcvEur: number, binanceUsd: number) => {
    (currencyService as any).bcvRates = {
      usd: bcvUsd,
      eur: bcvEur,
      lastUpdated: new Date().toISOString(),
      source: 'Mock BCV',
    } as BCVRates;

    (currencyService as any).binanceRates = {
      usd_ves: binanceUsd,
      usdt_ves: binanceUsd,
      busd_ves: binanceUsd,
      sell_rate: { min: binanceUsd - 1, avg: binanceUsd, max: binanceUsd + 1 },
      buy_rate: { min: binanceUsd - 1, avg: binanceUsd, max: binanceUsd + 1 },
      spread: 0,
      sell_prices_used: 1,
      buy_prices_used: 1,
      prices_used: 2,
      price_range: { min: binanceUsd - 1, max: binanceUsd + 1, sell_min: binanceUsd - 1, sell_max: binanceUsd + 1, buy_min: binanceUsd - 1, buy_max: binanceUsd + 1},
      lastUpdated: new Date().toISOString(),
      source: 'Mock Binance',
    } as BinanceRates;

    // Populate internal exchangeRates map for convertCurrency
    currencyService.fetchExchangeRates = jest.fn(async (baseCurrency: string = 'USD') => {
      return []; // logic simulated below manually
    });

    (currencyService as any).exchangeRates.set('VES', { currency: 'VES', rate: bcvUsd, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('USD', { currency: 'USD', rate: 1, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('EUR', { currency: 'EUR', rate: bcvUsd / USD_TO_EUR_RATE, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('BUSD', { currency: 'BUSD', rate: binanceUsd, lastUpdated: new Date().toISOString(), source: 'Mock Binance' });

    (currencyService as any).cryptoPrices.set('USDT', { symbol: 'USDT', name: 'Tether', price: 1, change24h: 0, lastUpdated: new Date().toISOString() });
    (currencyService as any).cryptoPrices.set('BUSD', { symbol: 'BUSD', name: 'Binance USD', price: 1, change24h: 0, lastUpdated: new Date().toISOString() });
    (currencyService as any).cryptoPrices.set('BTC', { symbol: 'BTC', name: 'Bitcoin', price: 65000, change24h: 0, lastUpdated: new Date().toISOString() });
  };

  it('should maintain bidirectional conversion consistency (A -> B -> A) within epsilon', () => {
    const mockBcvUsd = 36.5;
    const mockBcvEur = 38.0;
    const mockBinanceUsd = 37.0;

    setMockRates(mockBcvUsd, mockBcvEur, mockBinanceUsd);

    fc.assert(
      fc.property(
        amountArbitrary,
        currencyArbitrary,
        currencyArbitrary,
        (initialAmount, fromCurrency, toCurrency) => {
          // Manually reset exchange rates map for each run because convertCurrency relies on it
          // and fast-check runs multiple times.
          setMockRates(mockBcvUsd, mockBcvEur, mockBinanceUsd);

          const amountInB = currencyService.convertCurrency(initialAmount, fromCurrency, toCurrency);
          const amountBackToA = currencyService.convertCurrency(amountInB, toCurrency, fromCurrency);

          expect(amountBackToA).toBeCloseTo(initialAmount, 6);
        }
      )
    );
  });

  it('should format currency correctly without crashing for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000000, max: 1000000, noNaN: true, noInfinity: true }),
        currencyArbitrary,
        // Replace fc.char() with something valid
        fc.string({ minLength: 2, maxLength: 5 }).filter(s => /^[a-zA-Z]+$/.test(s)),
        (amount, currency, locale) => {
          const formatted = currencyService.formatCurrency(amount, currency, locale);
          expect(typeof formatted).toBe('string');
        }
      )
    );
  });
});

describe('CurrencyService edge cases and error handling', () => {
  beforeEach(() => {
    (currencyService as any).bcvRates = null;
    (currencyService as any).binanceRates = null;
    (currencyService as any).cryptoPrices = new Map();
    (currencyService as any).exchangeRates = new Map();
  });

  const setupMockRatesForErrorTests = (bcvUsd: number = 100, bcvEur: number = 110, binanceUsd: number = 105) => {
    (currencyService as any).bcvRates = { usd: bcvUsd, eur: bcvEur, lastUpdated: new Date().toISOString(), source: 'Mock BCV' };
    (currencyService as any).binanceRates = { usd_ves: binanceUsd, usdt_ves: binanceUsd, busd_ves: binanceUsd, sell_rate: { min: 1, avg: 1, max: 1 }, buy_rate: { min: 1, avg: 1, max: 1 }, spread: 0, sell_prices_used: 1, buy_prices_used: 1, prices_used: 2, price_range: { min: 1, max: 1, sell_min: 1, sell_max: 1, buy_min: 1, buy_max: 1}, lastUpdated: new Date().toISOString(), source: 'Mock Binance' };
    
    (currencyService as any).exchangeRates.set('VES', { currency: 'VES', rate: bcvUsd, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('USD', { currency: 'USD', rate: 1, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('EUR', { currency: 'EUR', rate: bcvUsd / USD_TO_EUR_RATE, lastUpdated: new Date().toISOString(), source: 'Mock BCV' });
    (currencyService as any).exchangeRates.set('BUSD', { currency: 'BUSD', rate: binanceUsd, lastUpdated: new Date().toISOString(), source: 'Mock Binance' });
  };

  it('should throw error for NaN amount in convertCurrency', () => {
    setupMockRatesForErrorTests();
    expect(() => currencyService.convertCurrency(NaN, 'USD', 'VES')).toThrow('Invalid amount for conversion: NaN');
  });

  it('should throw error for Infinity amount in convertCurrency', () => {
    setupMockRatesForErrorTests();
    expect(() => currencyService.convertCurrency(Infinity, 'USD', 'VES')).toThrow('Invalid amount for conversion: Infinity');
    expect(() => currencyService.convertCurrency(-Infinity, 'USD', 'VES')).toThrow('Invalid amount for conversion: -Infinity');
  });

  it('should throw error for unknown currency in convertCurrency', () => {
    setupMockRatesForErrorTests();
    expect(() => currencyService.convertCurrency(100, 'XYZ' as any, 'VES')).toThrow('Exchange rate not found for XYZ or VES');
    expect(() => currencyService.convertCurrency(100, 'USD', 'XYZ' as any)).toThrow('Exchange rate not found for USD or XYZ');
  });

  it('should handle NaN amount in formatCurrency by returning a default formatted string', () => {
    const formatted = currencyService.formatCurrency(NaN, 'USD');
    expect(formatted).toMatch(/\$NaN|NaN/);
  });

  it('should handle Infinity amount in formatCurrency by returning a default formatted string', () => {
    const formatted = currencyService.formatCurrency(Infinity, 'USD');
    expect(formatted).toMatch(/\$∞|Infinity/);
  });

  it('should format correctly for known crypto currencies with specific precision', () => {
    (currencyService as any).cryptoPrices.set('BTC', { symbol: 'BTC', name: 'Bitcoin', price: 65000, change24h: 0, lastUpdated: new Date().toISOString() });
    const formatted = currencyService.formatCurrency(123.456789, 'BTC');
    expect(formatted).toBe('123.45678900 BTC');
  });

  it('should handle unknown currencies in formatCurrency gracefully', () => {
    const formatted = currencyService.formatCurrency(100, 'XYZ');
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('XYZ');
  });
});