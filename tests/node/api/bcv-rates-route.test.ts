const mockGetLatestExchangeRate = jest.fn();
const mockScrapeBCVRates = jest.fn();
const mockPipelineExecute = jest.fn();

jest.mock('@/lib/services/exchange-rate-db', () =>
  jest.fn().mockImplementation(() => ({
    getLatestExchangeRate: mockGetLatestExchangeRate,
  }))
);

jest.mock('@/lib/scrapers/bcv-scraper', () => ({
  scrapeBCVRates: mockScrapeBCVRates,
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the pipeline dependencies for the POST handler
jest.mock('@/lib/rates/scrape-pipeline', () => {
  const actual = jest.requireActual('@/lib/rates/scrape-pipeline');
  return {
    ...actual,
    ScrapeAndPersistRates: jest.fn().mockImplementation(() => ({
      execute: mockPipelineExecute,
    })),
  };
});

jest.mock('@/repositories/supabase/scrape-attempts-repository-impl', () => ({
  SupabaseScrapeAttemptsRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/repositories/supabase/rates-history-repository-impl', () => ({
  SupabaseRatesHistoryRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/lib/rates/bcv-rate-db-writer', () => ({
  ExchangeRateDatabaseBCVWriter: jest.fn().mockImplementation(() => ({})),
}));

describe('/api/bcv-rates', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetLatestExchangeRate.mockReset();
    mockScrapeBCVRates.mockReset();
    mockPipelineExecute.mockReset();
  });

  describe('GET', () => {
    it('returns cached database rates when available', async () => {
      mockGetLatestExchangeRate.mockResolvedValue({
        usd_ves: 151.52,
        usdt_ves: 160,
        sell_rate: 160,
        buy_rate: 158,
        lastUpdated: '2026-05-17T10:00:00.000Z',
        source: 'BCV',
      });

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        cached: true,
        fallback: false,
        data: {
          usd: 151.52,
          timestamp: '2026-05-17T10:00:00.000Z',
          source: 'BCV',
        },
      });
      expect(mockScrapeBCVRates).not.toHaveBeenCalled();
    });

    it('scrapes live BCV rates when the database is empty', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(null);
      mockScrapeBCVRates.mockResolvedValue({
        success: true,
        data: {
          usd: 151.52,
          eur: 172.42,
          lastUpdated: '2026-05-17T10:05:00.000Z',
          source: 'BCV',
        },
        executionTime: 42,
      });

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        cached: false,
        fromLiveScrape: true,
        fallback: false,
        data: {
          usd: 151.52,
          eur: 172.42,
          timestamp: '2026-05-17T10:05:00.000Z',
          source: 'BCV',
        },
      });
    });

    it('returns 503 instead of successful static fallback when DB and live scrape fail', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(null);
      mockScrapeBCVRates.mockResolvedValue({
        success: false,
        error: 'Failed to extract USD and EUR rates',
        data: {
          usd: 60.15,
          eur: 64.2,
          lastUpdated: '2026-05-17T10:06:00.000Z',
          source: 'BCV (fallback - error)',
        },
      });

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        fallback: true,
        fallbackReason: 'No database data and live BCV scrape failed',
      });
      expect(body.data.source).toContain('fallback');
    });
  });

  describe('POST', () => {
    it('returns success when pipeline executes without error', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: true,
        status: 'success',
        attemptId: 'test-attempt-123',
        result: {
          usd: 151.52,
          eur: 172.42,
          source: 'BCV',
          lastUpdated: '2026-05-27T12:00:00.000Z',
        },
      });

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        fallback: false,
        attemptId: 'test-attempt-123',
        data: {
          usd: 151.52,
          eur: 172.42,
          source: 'BCV',
          timestamp: '2026-05-27T12:00:00.000Z',
        },
      });
    });

    it('returns 503 with fallback when pipeline fails with lock contention', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: false,
        status: 'skipped_locked',
        attemptId: 'test-attempt-456',
        failureReason: 'Lock held by another process',
      });

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        fallback: true,
        attemptId: 'test-attempt-456',
        fallbackReason: 'Lock held by another process',
      });
    });

    it('returns 503 with fallback when pipeline fails with scrape error', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: false,
        status: 'failure',
        attemptId: 'test-attempt-789',
        failureStage: 'fetch',
        failureReason: 'Network timeout',
      });

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        fallback: true,
        fallbackReason: 'Network timeout',
      });
    });
  });
});
