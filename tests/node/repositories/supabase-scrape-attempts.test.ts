import { SupabaseScrapeAttemptsRepository } from '@/repositories/supabase/scrape-attempts-repository-impl';
import { ScrapeStage, ScrapeAttempt } from '@/lib/rates/scrape-types';

describe('SupabaseScrapeAttemptsRepository', () => {
  let mockClient: any;
  let repo: SupabaseScrapeAttemptsRepository;

  const makeAttempt = (
    overrides: Partial<ScrapeAttempt> = {}
  ): ScrapeAttempt => ({
    attemptId: 'test-attempt-1',
    provider: 'bcv',
    trigger: 'on-demand',
    stage: ScrapeStage.PERSIST,
    status: 'success',
    startedAt: '2026-05-27T10:00:00.000Z',
    finishedAt: '2026-05-27T10:00:05.000Z',
    ...overrides,
  });

  beforeEach(() => {
    // Mock the chain: client.from('scrape_attempts').insert(...).select(...).maybeSingle()
    const mockMaybeSingle = jest.fn();
    const mockSelect = jest
      .fn()
      .mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    const mockLimit = jest.fn();
    const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = jest.fn().mockImplementation((table: string) => {
      if (table === 'scrape_attempts') {
        return {
          insert: mockInsert,
          select: jest.fn().mockReturnValue({ order: mockOrder }),
          order: mockOrder,
        };
      }
      return {};
    });

    mockClient = {
      from: mockFrom,
      _mockInsert: mockInsert,
      _mockSelect: mockSelect,
      _mockMaybeSingle: mockMaybeSingle,
      _mockOrder: mockOrder,
      _mockLimit: mockLimit,
    };

    repo = new SupabaseScrapeAttemptsRepository(mockClient);
  });

  describe('recordAttempt', () => {
    it('RED: inserts a row for a successful scrape attempt', async () => {
      // GIVEN: mock insert returns success
      mockClient._mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const attempt = makeAttempt();

      // WHEN
      await repo.recordAttempt(attempt);

      // THEN: insert was called with correct data
      expect(mockClient._mockInsert).toHaveBeenCalledWith({
        attempt_id: 'test-attempt-1',
        provider: 'bcv',
        trigger: 'on-demand',
        stage: 'persist',
        status: 'success',
        failure_reason: null,
        started_at: '2026-05-27T10:00:00.000Z',
        finished_at: '2026-05-27T10:00:05.000Z',
        extracted_currencies: null,
        metadata: null,
      });
    });

    it('RED: records failure with reason populated', async () => {
      // GIVEN: a failure attempt
      mockClient._mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const attempt = makeAttempt({
        stage: ScrapeStage.FETCH,
        status: 'failure',
        failureReason: 'Network timeout',
        finishedAt: '2026-05-27T10:00:03.000Z',
      });

      // WHEN
      await repo.recordAttempt(attempt);

      // THEN: failure_reason is populated, extracted_currencies and metadata remain null
      expect(mockClient._mockInsert).toHaveBeenCalledWith({
        attempt_id: 'test-attempt-1',
        provider: 'bcv',
        trigger: 'on-demand',
        stage: 'fetch',
        status: 'failure',
        failure_reason: 'Network timeout',
        started_at: '2026-05-27T10:00:00.000Z',
        finished_at: '2026-05-27T10:00:03.000Z',
        extracted_currencies: null,
        metadata: null,
      });
    });
  });

  describe('getLatestAttempts', () => {
    it('RED: returns attempts ordered by created_at DESC with limit', async () => {
      // GIVEN: 10 rows exist, we ask for 3
      const mockRows = Array.from({ length: 3 }, (_, i) => ({
        attempt_id: `attempt-${i}`,
        provider: 'bcv',
        trigger: 'scheduled',
        stage: 'persist',
        status: 'success',
        failure_reason: null,
        started_at: '2026-05-27T10:00:00.000Z',
        finished_at: '2026-05-27T10:00:05.000Z',
        extracted_currencies: null,
        metadata: null,
        created_at: `2026-05-27T10:0${5 - i}:00.000Z`,
      }));

      mockClient._mockLimit.mockResolvedValue({ data: mockRows, error: null });

      // WHEN
      const result = await repo.getLatestAttempts(3);

      // THEN: returns 3 results (mock data is returned as-is, mimicking Supabase DESC order)
      expect(result).toHaveLength(3);
      // Mock data: [attempt-0 (10:05), attempt-1 (10:04), attempt-2 (10:03)]
      // This matches ORDER BY created_at DESC — newest first
      expect(result[0].attemptId).toBe('attempt-0');
      expect(result[1].attemptId).toBe('attempt-1');
      expect(result[2].attemptId).toBe('attempt-2');
      expect(mockClient._mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockClient._mockLimit).toHaveBeenCalledWith(3);
    });

    it('RED: returns empty array when table is empty', async () => {
      // GIVEN: empty table
      mockClient._mockLimit.mockResolvedValue({ data: [], error: null });

      // WHEN
      const result = await repo.getLatestAttempts();

      // THEN: empty array
      expect(result).toEqual([]);
    });
  });
});
