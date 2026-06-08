/**
 * Task 3.2: Rates Bounded Context
 *
 * Tests for RatesContext interface and createRatesContext factory.
 * Groups: exchangeRates, ratesHistory, scrapeAttempts repositories.
 */

import type { RatesContext } from '@/repositories/contexts/rates';

// ─── Task 3.2: RatesContext Interface Tests ───────────────────────────────────

describe('RatesContext interface', () => {
  it('should export RatesContext type from the context file', async () => {
    const mod = await import('@/repositories/contexts/rates');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('should have createRatesContext factory function', async () => {
    const mod = await import('@/repositories/contexts/rates');
    expect(typeof mod.createRatesContext).toBe('function');
  });
});

// ─── Task 3.2: RatesContext Implementation Tests ──────────────────────────────

describe('createRatesContext', () => {
  let createRatesContext: typeof import('@/repositories/contexts/rates').createRatesContext;

  beforeAll(async () => {
    const mod = await import('@/repositories/contexts/rates');
    createRatesContext = mod.createRatesContext;
  });

  const mockExchangeRatesRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByPair: jest.fn(),
    findLatestByPair: jest.fn(),
    findByDate: jest.fn(),
    findByDateRange: jest.fn(),
    findByProvider: jest.fn(),
    getRate: jest.fn(),
    getRateWithFallback: jest.fn(),
    updateRatesFromProvider: jest.fn(),
    clearOldRates: jest.fn(),
    getSupportedCurrencies: jest.fn(),
    getRateHistory: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findPaginated: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };

  const mockRatesHistoryRepo = {
    upsertBCVRate: jest.fn(),
    listBCVRatesSince: jest.fn(),
    upsertBinanceRate: jest.fn(),
    listBinanceRatesSince: jest.fn(),
    insertExchangeRateSnapshot: jest.fn(),
    getLatestExchangeRateSnapshot: jest.fn(),
    getLatestBCVRate: jest.fn(),
    getLatestBinanceRate: jest.fn(),
    listExchangeRateSnapshots: jest.fn(),
  };

  const mockScrapeAttemptsRepo = {
    recordAttempt: jest.fn(),
    getLatestAttempts: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a rates context with all required repositories', () => {
    const context = createRatesContext({
      exchangeRates: mockExchangeRatesRepo as never,
      ratesHistory: mockRatesHistoryRepo as never,
      scrapeAttempts: mockScrapeAttemptsRepo as never,
    });

    expect(context).toBeDefined();
    expect(context.exchangeRates).toBe(mockExchangeRatesRepo);
    expect(context.ratesHistory).toBe(mockRatesHistoryRepo);
    expect(context.scrapeAttempts).toBe(mockScrapeAttemptsRepo);
  });

  it('should expose exchange rates repository with correct interface', () => {
    const context = createRatesContext({
      exchangeRates: mockExchangeRatesRepo as never,
      ratesHistory: mockRatesHistoryRepo as never,
      scrapeAttempts: mockScrapeAttemptsRepo as never,
    });

    expect(typeof context.exchangeRates.findByPair).toBe('function');
    expect(typeof context.exchangeRates.findLatestByPair).toBe('function');
    expect(typeof context.exchangeRates.getRate).toBe('function');
    expect(typeof context.exchangeRates.updateRatesFromProvider).toBe('function');
  });

  it('should expose rates history repository with correct interface', () => {
    const context = createRatesContext({
      exchangeRates: mockExchangeRatesRepo as never,
      ratesHistory: mockRatesHistoryRepo as never,
      scrapeAttempts: mockScrapeAttemptsRepo as never,
    });

    expect(typeof context.ratesHistory.upsertBCVRate).toBe('function');
    expect(typeof context.ratesHistory.upsertBinanceRate).toBe('function');
    expect(typeof context.ratesHistory.getLatestExchangeRateSnapshot).toBe('function');
  });

  it('should expose scrape attempts repository with correct interface', () => {
    const context = createRatesContext({
      exchangeRates: mockExchangeRatesRepo as never,
      ratesHistory: mockRatesHistoryRepo as never,
      scrapeAttempts: mockScrapeAttemptsRepo as never,
    });

    expect(typeof context.scrapeAttempts.recordAttempt).toBe('function');
    expect(typeof context.scrapeAttempts.getLatestAttempts).toBe('function');
  });
});
