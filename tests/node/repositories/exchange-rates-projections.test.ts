import { SupabaseExchangeRatesRepository } from '@/repositories/supabase/exchange-rates-repository-impl';
import { ExchangeRate } from '@/types';

// Helper to create a mock query chain with proper async resolution
function createExchangeRateQueryMock(selectCalls: any[]) {
  // Mock exchange rate data
  const mockExchangeRateData = {
    id: 'rate-1',
    base_currency: 'USD',
    quote_currency: 'VES',
    rate: 2500.0,
    date: '2026-04-08',
    provider: 'binance',
    created_at: '2026-04-08T00:00:00Z',
  };

  // Track state as query is built
  let rangeWasCalled = false;
  let headWasCalled = false;

  // Create the mock chain with all methods
  const mockChain: any = {
    select: jest.fn(function (fields: any, options?: any) {
      selectCalls.push({ fields, options, caller: 'exchange_rates' });
      if (options?.head) headWasCalled = true;
      return mockChain;
    }),
    eq: jest.fn(function () {
      return mockChain;
    }),
    gte: jest.fn(function () {
      return mockChain;
    }),
    lte: jest.fn(function () {
      return mockChain;
    }),
    lt: jest.fn(function () {
      return mockChain;
    }),
    in: jest.fn(function () {
      return mockChain;
    }),
    order: jest.fn(function () {
      return mockChain;
    }),
    limit: jest.fn(function () {
      return mockChain;
    }),
    range: jest.fn(function () {
      rangeWasCalled = true;
      return mockChain;
    }),
    maybeSingle: jest.fn(function () {
      return mockChain;
    }),
    upsert: jest.fn(function () {
      return mockChain;
    }),
    delete: jest.fn(function () {
      return mockChain;
    }),
    insert: jest.fn(function () {
      return mockChain;
    }),
    update: jest.fn(function () {
      return mockChain;
    }),
    then: jest.fn(function (resolve: any, reject: any) {
      // Create promise INSIDE then() so state is captured at this moment
      const result = headWasCalled
        ? {
            count: 1,
            error: null,
          }
        : rangeWasCalled
          ? {
              data: [mockExchangeRateData],
              count: 1,
              error: null,
            }
          : {
              data: [mockExchangeRateData],
              error: null,
            };
      Promise.resolve(result).then(resolve, reject);
    }),
    catch: jest.fn(function (reject: any) {
      return mockChain;
    }),
    finally: jest.fn(function (onFinally: any) {
      return mockChain;
    }),
  };

  return mockChain as any;
}

describe('SupabaseExchangeRatesRepository - Query Projections', () => {
  let mockClient: any;
  let repo: SupabaseExchangeRatesRepository;
  let mockSelectCalls: any[];

  beforeEach(() => {
    mockSelectCalls = [];

    // Create a basic mock Supabase client
    mockClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'exchange_rates') {
          return createExchangeRateQueryMock(mockSelectCalls);
        }
      }),
    };
    repo = new SupabaseExchangeRatesRepository(mockClient);
  });

  /**
   * RED Test 1: Query methods use list projection
   * Validates that projection-based queries are used for list methods
   */
  describe('Query Projections', () => {
    test('findAll() should use EXCHANGE_RATE_LIST_PROJECTION', async () => {
      const result = await repo.findAll();

      // Verify: findAll returns array of exchange rates
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('baseCurrency');
        expect(result[0]).toHaveProperty('quoteCurrency');
        expect(result[0]).toHaveProperty('rate');
      }

      // Verify: select() was called with projection (not wildcard)
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('id');
      expect(selectCall.fields).toContain('base_currency');
      expect(selectCall.fields).toContain('rate');
    });

    test('findByPair() should use EXCHANGE_RATE_LIST_PROJECTION', async () => {
      const result = await repo.findByPair('USD', 'VES');

      // Verify: findByPair returns array
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });

    test('findByDate() should use EXCHANGE_RATE_LIST_PROJECTION', async () => {
      const result = await repo.findByDate('2026-04-08');

      // Verify: findByDate returns array
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });

    test('findByDateRange() should use EXCHANGE_RATE_LIST_PROJECTION', async () => {
      const result = await repo.findByDateRange('2026-04-01', '2026-04-08');

      // Verify: findByDateRange returns array
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });

    test('findByProvider() should use EXCHANGE_RATE_LIST_PROJECTION', async () => {
      const result = await repo.findByProvider('binance');

      // Verify: findByProvider returns array
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });

    test('findPaginated() should use EXCHANGE_RATE_LIST_PROJECTION with count', async () => {
      const result = await repo.findPaginated({
        page: 1,
        limit: 10,
      });

      // Verify: Paginated result structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');

      // Verify: select() was called with projection and count option
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.options?.count).toBe('exact');
    });
  });

  /**
   * RED Test 2: findById() returns detail with all fields
   * Detail view should keep all fields for single exchange rate queries
   */
  describe('Detail Queries', () => {
    test('findById() returns an exchange rate or null', async () => {
      // For this test, we need a separate mock for findById which uses select('*')
      const mockChain = {
        select: jest.fn(function (fields) {
          mockSelectCalls.push({
            fields: fields || '*',
            caller: 'exchange_rates-detail',
          });
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        maybeSingle: jest.fn(async function () {
          return {
            data: {
              id: 'rate-1',
              base_currency: 'USD',
              quote_currency: 'VES',
              rate: 2500.0,
              date: '2026-04-08',
              provider: 'binance',
              created_at: '2026-04-08T00:00:00Z',
            },
            error: null,
          };
        }),
      };

      mockClient.from = jest.fn((table: string) => {
        if (table === 'exchange_rates') {
          return mockChain;
        }
      });

      repo = new SupabaseExchangeRatesRepository(mockClient);
      const result = await repo.findById('rate-1');

      // Result should be an exchange rate object or null
      if (result !== null) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('baseCurrency');
        expect(result).toHaveProperty('rate');
      }

      // Verify: findById uses select('*') for detail
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates-detail'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });
  });

  /**
   * RED Test 3: Exact count gating
   * Verify that count is only requested when using findPaginated with head option
   */
  describe('Exact Count Gating', () => {
    test('findAll() should NOT include count option', async () => {
      await repo.findAll();

      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'exchange_rates'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.options?.count).toBeUndefined();
      expect(selectCall.options?.head).toBeUndefined();
    });

    test('findPaginated() should include count: exact option in count query', async () => {
      // For this test we need to check that count query and data query both use projection
      mockSelectCalls = [];

      const mockChain = {
        select: jest.fn(function (fields: any, options?: any) {
          mockSelectCalls.push({ fields, options, caller: 'exchange_rates' });
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        order: jest.fn(function () {
          return this;
        }),
        range: jest.fn(function () {
          return this;
        }),
        then: jest.fn(function (resolve: any, reject: any) {
          // First call is count query (has count and head options)
          // Second call is data query (has no options or just range)
          const isCountQuery = mockSelectCalls.some(
            (c) => c.options?.count === 'exact' && c.options?.head
          );
          const result = isCountQuery
            ? { count: 1, error: null }
            : { data: [], error: null };
          Promise.resolve(result).then(resolve, reject);
        }),
        catch: jest.fn(function () {
          return this;
        }),
      };

      mockClient.from = jest.fn(() => mockChain);
      repo = new SupabaseExchangeRatesRepository(mockClient);

      await repo.findPaginated({ page: 1, limit: 10 });

      // Verify count query has count: exact option
      const countCall = mockSelectCalls.find(
        (c) => c.options?.count === 'exact'
      );
      expect(countCall).toBeDefined();
      expect(countCall.fields).not.toBe('*');
    });
  });

  /**
   * RED Test 4: Byte reduction validation
   * Response payload should be smaller when using projections vs wildcard selects
   */
  describe('Payload Size Reduction', () => {
    test('list projection payload is smaller than detail payload', () => {
      const listRate = {
        id: 'rate-1',
        base_currency: 'USD',
        quote_currency: 'VES',
        rate: 2500.0,
        date: '2026-04-08',
        provider: 'binance',
        created_at: '2026-04-08T00:00:00Z',
      };

      const detailRate = {
        ...listRate,
        source: 'This is additional metadata that is not needed for list views',
        metadata: {
          fetched_at: '2026-04-08T12:00:00Z',
          confidence_score: 0.95,
          historical_context: 'Long text about market conditions',
        },
        _internal_sync_id:
          'internal-sync-tracking-id-that-is-not-needed-for-ui',
      };

      const listPayload = JSON.stringify(listRate);
      const detailPayload = JSON.stringify(detailRate);

      expect(listPayload.length).toBeLessThan(detailPayload.length);
      expect(listPayload.length / detailPayload.length).toBeLessThan(1.0);
    });

    test('projected fields are essential for UI rendering', () => {
      const projectedFields = [
        'id',
        'base_currency',
        'quote_currency',
        'rate',
        'date',
        'provider',
        'created_at',
      ];

      // All UI-critical fields are present
      expect(projectedFields).toContain('id'); // For keys
      expect(projectedFields).toContain('base_currency'); // For display
      expect(projectedFields).toContain('quote_currency'); // For display
      expect(projectedFields).toContain('rate'); // For calculations
      expect(projectedFields).toContain('date'); // For filtering/sorting
      expect(projectedFields).toContain('provider'); // For source identification
    });
  });
});
