import { InMemoryLock } from '@/lib/rates/simple-lock';
import { ScrapeAttemptsRepository } from '@/repositories/contracts/scrape-attempts-repository';
import {
  ScrapeAndPersistRates,
  mapScraperResultToStage,
} from '@/lib/rates/scrape-pipeline';
import { ScrapeStage, ScrapeAttempt } from '@/lib/rates/scrape-types';
import { ScraperErrorCategory } from '@/lib/scrapers/types';

class InMemoryScrapeAttemptsRepo implements ScrapeAttemptsRepository {
  attempts: ScrapeAttempt[] = [];
  async recordAttempt(attempt: ScrapeAttempt): Promise<void> {
    this.attempts.push(attempt);
  }
  async getLatestAttempts(limit: number = 10): Promise<ScrapeAttempt[]> {
    return this.attempts.slice(-limit).reverse();
  }
  clear(): void {
    this.attempts = [];
  }
}

const mockScrapeBCVRates = jest.fn();
const mockWrite = jest.fn();

jest.mock('@/lib/scrapers/bcv-scraper', () => ({
  scrapeBCVRates: () => mockScrapeBCVRates(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('InMemoryLock', () => {
  let lock: InMemoryLock;

  beforeEach(() => {
    lock = new InMemoryLock();
  });

  it('acquires a lock that is not held', async () => {
    const acquired = await lock.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });

  it('rejects concurrent acquire for the same key', async () => {
    await lock.acquire('test-key', 1000);
    const acquired = await lock.acquire('test-key', 1000);
    expect(acquired).toBe(false);
  });

  it('releases a lock allowing re-acquire', async () => {
    await lock.acquire('test-key', 1000);
    await lock.release('test-key');
    const acquired = await lock.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });

  it('expires lock after TTL', async () => {
    await lock.acquire('test-key', 10);
    await new Promise((r) => setTimeout(r, 20));
    const acquired = await lock.acquire('test-key', 1000);
    expect(acquired).toBe(true);
  });

  it('allows different keys independently', async () => {
    await lock.acquire('key-a', 1000);
    const acquiredB = await lock.acquire('key-b', 1000);
    expect(acquiredB).toBe(true);
  });
});

describe('ScrapeAndPersistRates', () => {
  let lock: InMemoryLock;
  let repo: InMemoryScrapeAttemptsRepo;
  let pipeline: ScrapeAndPersistRates;
  const mockWriter = { write: mockWrite };

  beforeEach(() => {
    lock = new InMemoryLock();
    repo = new InMemoryScrapeAttemptsRepo();
    pipeline = new ScrapeAndPersistRates(lock, repo, mockWriter);
    mockScrapeBCVRates.mockReset();
    mockWrite.mockReset();
    mockWrite.mockResolvedValue(true);
  });

  it('returns success with scraped rates on happy path', async () => {
    mockScrapeBCVRates.mockResolvedValue({
      success: true,
      data: {
        usd: 151.52,
        eur: 172.42,
        source: 'BCV',
        lastUpdated: '2026-05-22T12:00:00.000Z',
      },
    });

    const result = await pipeline.execute();

    expect(result.success).toBe(true);
    expect(result.status).toBe('success');
    expect(result.result).toMatchObject({ usd: 151.52, eur: 172.42 });
    expect(mockWrite).toHaveBeenCalledWith({
      usd: 151.52,
      eur: 172.42,
      source: 'BCV',
      lastUpdated: expect.any(String),
    });
  });

  it('returns skipped_locked when lock is held', async () => {
    await lock.acquire('scrape:bcv', 30_000);

    const result = await pipeline.execute();

    expect(result.status).toBe('skipped_locked');
    expect(result.success).toBe(false);
    expect(mockScrapeBCVRates).not.toHaveBeenCalled();
  });

  it('records failure with fetch stage on scraper network error', async () => {
    mockScrapeBCVRates.mockResolvedValue({
      success: false,
      error: 'Request timeout (5000ms)',
      errorCategory: ScraperErrorCategory.TIMEOUT,
      data: {
        usd: 60,
        eur: 64,
        lastUpdated: '',
        source: 'BCV (fallback - error)',
      },
    });

    const result = await pipeline.execute();

    expect(result.success).toBe(false);
    expect(result.status).toBe('failure');
    expect(result.failureStage).toBe(ScrapeStage.FETCH);
  });

  it('records failure with validate stage on partial extraction', async () => {
    mockScrapeBCVRates.mockResolvedValue({
      success: false,
      error: 'Failed to extract complete BCV USD and EUR rates',
      errorCategory: ScraperErrorCategory.VALIDATION,
      data: {
        usd: 60,
        eur: 64,
        lastUpdated: '',
        source: 'BCV (fallback - error)',
      },
    });

    const result = await pipeline.execute();

    expect(result.success).toBe(false);
    expect(result.failureStage).toBe(ScrapeStage.VALIDATE);
  });

  it('records failure with persist stage when DB write fails', async () => {
    mockScrapeBCVRates.mockResolvedValue({
      success: true,
      data: {
        usd: 151.52,
        eur: 172.42,
        source: 'BCV',
        lastUpdated: '2026-05-22T12:00:00.000Z',
      },
    });
    mockWrite.mockResolvedValue(false);

    const result = await pipeline.execute();

    expect(result.success).toBe(false);
    expect(result.failureStage).toBe(ScrapeStage.PERSIST);
  });

  it('records attempt in repository for every outcome', async () => {
    mockScrapeBCVRates.mockResolvedValue({
      success: true,
      data: {
        usd: 151.52,
        eur: 172.42,
        source: 'BCV',
        lastUpdated: '2026-05-22T12:00:00.000Z',
      },
    });

    await pipeline.execute();

    const attempts = await repo.getLatestAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('success');
  });
});

describe('mapScraperResultToStage', () => {
  it('maps TIMEOUT category to FETCH', () => {
    const stage = mapScraperResultToStage({
      success: false,
      error: 'timeout',
      errorCategory: ScraperErrorCategory.TIMEOUT,
      data: null as never,
    });
    expect(stage).toBe(ScrapeStage.FETCH);
  });

  it('maps VALIDATION category to VALIDATE', () => {
    const stage = mapScraperResultToStage({
      success: false,
      error: 'validation failed',
      errorCategory: ScraperErrorCategory.VALIDATION,
      data: null as never,
    });
    expect(stage).toBe(ScrapeStage.VALIDATE);
  });

  it('maps PARSING category to PARSE', () => {
    const stage = mapScraperResultToStage({
      success: false,
      error: 'parse error',
      errorCategory: ScraperErrorCategory.PARSING,
      data: null as never,
    });
    expect(stage).toBe(ScrapeStage.PARSE);
  });

  it('infers CIRCUIT_BREAKER from error text when no category', () => {
    const stage = mapScraperResultToStage({
      success: false,
      error: 'Circuit breaker is OPEN for bcv',
      data: null as never,
    });
    expect(stage).toBe(ScrapeStage.CIRCUIT_BREAKER);
  });

  it('returns UNKNOWN for empty error', () => {
    const stage = mapScraperResultToStage({
      success: false,
      data: null as never,
    });
    expect(stage).toBe(ScrapeStage.UNKNOWN);
  });
});
