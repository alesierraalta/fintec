const mockGetLatestExchangeRate = jest.fn();
const mockScrapeBCVRates = jest.fn();
const mockPipelineExecute = jest.fn();
const mockGetAuthenticatedUser = jest.fn();
const mockCreateServiceClient = jest.fn();
const mockScheduleRefresh = jest.fn();
const mockWriterWrite = jest.fn();
const mockRatesRepoArgs = jest.fn();

jest.mock('@/lib/services/exchange-rate-db', () =>
  jest.fn().mockImplementation(() => ({
    getLatestExchangeRate: mockGetLatestExchangeRate,
  }))
);

jest.mock('@/lib/scrapers/bcv-scraper', () => ({
  scrapeBCVRates: mockScrapeBCVRates,
}));

jest.mock('@/lib/rates/rate-refresh', () => ({
  scheduleBackgroundRateRefresh: (...args: unknown[]) =>
    mockScheduleRefresh(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: (...args: unknown[]) =>
    mockGetAuthenticatedUser(...args),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createServiceClient: (...args: unknown[]) => mockCreateServiceClient(...args),
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
  SupabaseRatesHistoryRepository: jest
    .fn()
    .mockImplementation((...args: unknown[]) => {
      mockRatesRepoArgs(...args);
      return {};
    }),
}));

jest.mock('@/lib/rates/bcv-rate-db-writer', () => ({
  ExchangeRateDatabaseBCVWriter: jest.fn().mockImplementation(() => ({
    write: mockWriterWrite,
  })),
}));

describe('/api/bcv-rates', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetLatestExchangeRate.mockReset();
    mockScrapeBCVRates.mockReset();
    mockPipelineExecute.mockReset();
    mockGetAuthenticatedUser.mockReset();
    mockCreateServiceClient.mockReset();
    mockScheduleRefresh.mockReset();
    mockWriterWrite.mockReset();
    mockRatesRepoArgs.mockReset();
    mockCreateServiceClient.mockReturnValue({ from: jest.fn() });
    delete process.env.CRON_SECRET;
  });

  describe('GET', () => {
    const recentTimestamp = () =>
      new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const staleTimestamp = () =>
      new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const staleSnapshot = {
      usd_ves: 151.52,
      usdt_ves: 160,
      sell_rate: 160,
      buy_rate: 158,
      lastUpdated: staleTimestamp(),
      source: 'BCV',
    };
    const capturedTask = (): (() => Promise<void>) =>
      mockScheduleRefresh.mock.calls[0]?.[1] as () => Promise<void>;

    it('returns cached database rates when available and fresh', async () => {
      const freshTimestamp = recentTimestamp();
      mockGetLatestExchangeRate.mockResolvedValue({
        ...staleSnapshot,
        lastUpdated: freshTimestamp,
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
          timestamp: freshTimestamp,
          source: 'BCV',
        },
      });
      expect(mockScrapeBCVRates).not.toHaveBeenCalled();
      expect(mockScheduleRefresh).not.toHaveBeenCalled();
    });

    it('serves stale data immediately and schedules a background refresh instead of blocking on scrape', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(staleSnapshot);

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        cached: true,
        stale: true,
        fallback: false,
        data: {
          usd: 151.52,
          source: 'BCV',
        },
      });
      expect(mockScrapeBCVRates).not.toHaveBeenCalled();
      expect(mockScheduleRefresh).toHaveBeenCalledWith(
        'bcv',
        expect.any(Function)
      );
    });

    it('schedules one coalesced refresh key for concurrent stale requests', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(staleSnapshot);

      const { GET } = await import('@/app/api/bcv-rates/route');
      await GET();
      await GET();

      expect(mockScheduleRefresh).toHaveBeenCalledTimes(2);
      expect(mockScheduleRefresh).toHaveBeenCalledWith(
        'bcv',
        expect.any(Function)
      );
    });

    it('persists a successful background refresh through the service client', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(staleSnapshot);
      mockScrapeBCVRates.mockResolvedValue({
        success: true,
        data: {
          usd: 544.58,
          eur: 633.48,
          lastUpdated: new Date().toISOString(),
          source: 'BCV',
        },
        executionTime: 42,
      });
      mockWriterWrite.mockResolvedValue(true);
      const serviceClient = { from: jest.fn() };
      mockCreateServiceClient.mockReturnValue(serviceClient);

      const { GET } = await import('@/app/api/bcv-rates/route');
      await GET();

      const task = capturedTask();
      expect(task).toBeDefined();
      await task();

      expect(mockScrapeBCVRates).toHaveBeenCalledTimes(1);
      expect(mockCreateServiceClient).toHaveBeenCalledTimes(1);
      expect(mockRatesRepoArgs).toHaveBeenCalledWith(serviceClient);
      expect(mockWriterWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          usd: 544.58,
          eur: 633.48,
          source: 'BCV',
        })
      );
    });

    it('keeps the stale response when the background refresh fails', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(staleSnapshot);
      mockScrapeBCVRates.mockResolvedValue({
        success: false,
        error: 'Failed to extract USD and EUR rates',
        data: null,
      });

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.stale).toBe(true);
      expect(body.data.usd).toBe(151.52);

      const task = capturedTask();
      await task();

      expect(mockWriterWrite).not.toHaveBeenCalled();
      expect(mockCreateServiceClient).not.toHaveBeenCalled();
    });

    it('returns fallback immediately when the database is empty and schedules a refresh', async () => {
      mockGetLatestExchangeRate.mockResolvedValue(null);

      const { GET } = await import('@/app/api/bcv-rates/route');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        fallback: true,
        fallbackReason: 'No database data; background refresh scheduled',
      });
      expect(body.data.source).toContain('fallback');
      expect(mockScrapeBCVRates).not.toHaveBeenCalled();
      expect(mockScheduleRefresh).toHaveBeenCalledWith(
        'bcv',
        expect.any(Function)
      );
    });
  });

  describe('POST', () => {
    const cronRequest = (token = 'test-cron-secret') =>
      new Request('http://localhost/api/bcv-rates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

    const authenticatedRequest = () =>
      new Request('http://localhost/api/bcv-rates', { method: 'POST' });

    it('denies unauthenticated callers with 401', async () => {
      const { POST } = await import('@/app/api/bcv-rates/route');
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication failed')
      );

      const response = await POST(authenticatedRequest());

      expect(response.status).toBe(401);
      expect(mockPipelineExecute).not.toHaveBeenCalled();
    });

    it('denies callers with a wrong cron secret and no verified user with 401', async () => {
      const { POST } = await import('@/app/api/bcv-rates/route');
      process.env.CRON_SECRET = 'expected-secret';
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication failed')
      );

      const response = await POST(cronRequest('wrong-secret'));

      expect(response.status).toBe(401);
      expect(mockPipelineExecute).not.toHaveBeenCalled();
    });

    it('returns success when a verified authenticated user triggers the pipeline', async () => {
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
      mockGetAuthenticatedUser.mockResolvedValue('user-1');

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST(authenticatedRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockPipelineExecute).toHaveBeenCalled();
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

    it('returns success when the cron bearer token triggers the pipeline', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: true,
        status: 'success',
        attemptId: 'test-attempt-cron',
        result: {
          usd: 151.52,
          eur: 172.42,
          source: 'BCV',
          lastUpdated: '2026-05-27T12:00:00.000Z',
        },
      });
      process.env.CRON_SECRET = 'test-cron-secret';

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST(cronRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockPipelineExecute).toHaveBeenCalled();
      expect(mockGetAuthenticatedUser).not.toHaveBeenCalled();
      expect(body).toMatchObject({
        success: true,
        fallback: false,
        attemptId: 'test-attempt-cron',
      });
    });

    it('returns 503 with fallback when pipeline fails with lock contention', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: false,
        status: 'skipped_locked',
        attemptId: 'test-attempt-456',
        failureReason: 'Lock held by another process',
      });
      process.env.CRON_SECRET = 'test-cron-secret';

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST(cronRequest());
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
      process.env.CRON_SECRET = 'test-cron-secret';

      const { POST } = await import('@/app/api/bcv-rates/route');
      const response = await POST(cronRequest());
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        fallback: true,
        fallbackReason: 'Network timeout',
      });
    });

    it('routes the pipeline writes through the server-only service client', async () => {
      mockPipelineExecute.mockResolvedValue({
        success: true,
        status: 'success',
        attemptId: 'test-attempt-client',
        result: {
          usd: 151.52,
          eur: 172.42,
          source: 'BCV',
          lastUpdated: '2026-05-27T12:00:00.000Z',
        },
      });
      mockGetAuthenticatedUser.mockResolvedValue('user-1');

      const { POST } = await import('@/app/api/bcv-rates/route');
      const { SupabaseRatesHistoryRepository } = await import(
        '@/repositories/supabase/rates-history-repository-impl'
      );
      const { SupabaseScrapeAttemptsRepository } = await import(
        '@/repositories/supabase/scrape-attempts-repository-impl'
      );

      await POST(authenticatedRequest());

      const mockClient = mockCreateServiceClient();
      expect(mockCreateServiceClient).toHaveBeenCalled();
      expect(SupabaseRatesHistoryRepository).toHaveBeenCalledWith(mockClient);
      expect(SupabaseScrapeAttemptsRepository).toHaveBeenCalledWith(mockClient);
    });
  });
});
