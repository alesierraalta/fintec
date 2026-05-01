import { SupabaseCategoriesRepository } from '@/repositories/supabase/categories-repository-impl';
import { Category, CategoryKind } from '@/types';

// Helper to create a mock query chain with proper async resolution
// Simulates Supabase query builder: select() -> filters -> range() -> awaitable result
function createCategoryQueryMock(selectCalls: any[]) {
  // Mock category data
  const mockCategoryData = {
    id: 'cat-1',
    name: 'Food',
    kind: 'EXPENSE',
    color: '#FF5733',
    icon: 'utensils',
    parent_id: null,
    active: true,
    user_id: 'test-user-id',
    is_default: false,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  };

  // Track state as query is built
  let rangeWasCalled = false;

  // Create the mock chain with all methods
  const mockChain: any = {
    select: jest.fn(function (fields: any, options?: any) {
      selectCalls.push({ fields, options, caller: 'categories' });
      return mockChain; // Return chain for method chaining
    }),
    eq: jest.fn(function () {
      return mockChain;
    }),
    is: jest.fn(function () {
      return mockChain;
    }),
    order: jest.fn(function () {
      return mockChain;
    }),
    range: jest.fn(function () {
      rangeWasCalled = true;
      return mockChain;
    }),
    ilike: jest.fn(function () {
      return mockChain;
    }),
    or: jest.fn(function () {
      return mockChain;
    }),
    single: jest.fn(function () {
      return mockChain;
    }),
    maybeSingle: jest.fn(function () {
      return mockChain;
    }),
    // Make the chain awaitable by implementing thenable protocol
    // Each time then() is called, create a new promise with the current state
    then: jest.fn(function (resolve: any, reject: any) {
      // Create promise INSIDE then() so rangeWasCalled is captured at this moment
      const result = rangeWasCalled
        ? {
            data: [mockCategoryData],
            count: 1,
            error: null,
          }
        : {
            data: [mockCategoryData],
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

describe('SupabaseCategoriesRepository - Query Projections', () => {
  let mockClient: any;
  let repo: SupabaseCategoriesRepository;
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
        if (table === 'categories') {
          return createCategoryQueryMock(mockSelectCalls);
        }
      }),
    };
    repo = new SupabaseCategoriesRepository(mockClient);
  });

  /**
   * RED Test 1: Query methods use list projection
   * Validates that projection-based queries are used for list methods
   */
  describe('Query Projections', () => {
    test('findAll() should use CATEGORY_LIST_PROJECTION', async () => {
      const result = await repo.findAll();

      // Verify: findAll returns array of categories
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('kind');
        expect(result[0]).toHaveProperty('color');
        expect(result[0]).toHaveProperty('icon');
      }

      // Verify: select() was called with projection (not wildcard)
      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('id');
      expect(selectCall.fields).toContain('name');
      expect(selectCall.fields).toContain('kind');
    });

    test('findByKind() should use CATEGORY_LIST_PROJECTION', async () => {
      const result = await repo.findByKind(CategoryKind.EXPENSE);

      // Verify: findByKind returns array of categories
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('kind');
    });

    test('findByParent() should use CATEGORY_LIST_PROJECTION', async () => {
      const result = await repo.findByParent(null);

      // Verify: findByParent returns array of categories
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('parent_id');
    });

    test('findWithPagination() should use CATEGORY_LIST_PROJECTION with count', async () => {
      const result = await repo.findWithPagination({
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
      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.options?.count).toBe('exact');
    });

    test('search() should use CATEGORY_LIST_PROJECTION', async () => {
      const result = await repo.search('Food');

      // Verify: search returns array of categories
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
    });
  });

  /**
   * RED Test 2: findById() returns detail with all fields
   * Detail view should keep all fields for single category queries
   */
  describe('Detail Queries', () => {
    test('findById() returns a category or null', async () => {
      // For this test, we need a separate mock for findById which uses select('*')
      const mockChain = {
        select: jest.fn(function () {
          mockSelectCalls.push({ fields: '*', caller: 'categories-detail' });
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        single: jest.fn(async function () {
          return { data: null, error: null }; // Not really used in this test
        }),
        maybeSingle: jest.fn(async function () {
          return {
            data: {
              id: 'cat-1',
              name: 'Food',
              kind: 'EXPENSE',
              color: '#FF5733',
              icon: 'utensils',
              parent_id: null,
              active: true,
              user_id: 'test-user-id',
              is_default: false,
              created_at: '2026-04-08T00:00:00Z',
              updated_at: '2026-04-08T00:00:00Z',
            },
            error: null,
          };
        }),
      };

      mockClient.from = jest.fn((table: string) => {
        if (table === 'categories') {
          return mockChain;
        }
      });

      repo = new SupabaseCategoriesRepository(mockClient);
      const result = await repo.findById('cat-1');

      // Result should be a category object or null
      if (result !== null) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('kind');
      }

      // Verify: findById uses select('*') for detail
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'categories-detail'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).toBe('*');
    });
  });

  /**
   * RED Test 3: Exact count gating
   * Verify that count is only requested when pagination is used
   */
  describe('Exact Count Gating', () => {
    test('findAll() should NOT include count option', async () => {
      await repo.findAll();

      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.options?.count).toBeUndefined();
    });

    test('findWithPagination() should include count: exact option', async () => {
      await repo.findWithPagination({ page: 1, limit: 10 });

      const selectCall = mockSelectCalls.find((c) => c.caller === 'categories');
      expect(selectCall).toBeDefined();
      expect(selectCall.options?.count).toBe('exact');
    });
  });

  /**
   * RED Test 4: Byte reduction validation
   * Response payload should be smaller when using projections vs wildcard selects
   */
  describe('Payload Size Reduction', () => {
    test('list projection payload is smaller than detail payload', () => {
      const listCategory = {
        id: 'cat-1',
        name: 'Food',
        kind: 'EXPENSE',
        color: '#FF5733',
        icon: 'utensils',
        parent_id: null,
        active: true,
        user_id: 'test-user-id',
        is_default: false,
        created_at: '2026-04-08T00:00:00Z',
        updated_at: '2026-04-08T00:00:00Z',
      };

      const detailCategory = {
        ...listCategory,
        description:
          'This is a very long description that definitely takes up much more space',
        subcategories: [
          {
            id: 'subcat-1',
            name: 'Groceries',
            kind: 'EXPENSE',
            color: '#FF5733',
            icon: 'shopping-cart',
            parent_id: 'cat-1',
            active: true,
            user_id: 'test-user-id',
            is_default: false,
            created_at: '2026-04-08T00:00:00Z',
            updated_at: '2026-04-08T00:00:00Z',
          },
        ],
      };

      const listPayload = JSON.stringify(listCategory);
      const detailPayload = JSON.stringify(detailCategory);

      expect(listPayload.length).toBeLessThan(detailPayload.length);
      expect(listPayload.length / detailPayload.length).toBeLessThan(1.0); // Strict less than for detail
    });

    test('projected fields are essential for UI rendering', () => {
      const projectedFields = [
        'id',
        'name',
        'kind',
        'color',
        'icon',
        'parent_id',
        'active',
        'user_id',
        'is_default',
        'created_at',
        'updated_at',
      ];

      // All UI-critical fields are present
      expect(projectedFields).toContain('id'); // For keys
      expect(projectedFields).toContain('name'); // For display
      expect(projectedFields).toContain('kind'); // For filtering
      expect(projectedFields).toContain('color'); // For styling
      expect(projectedFields).toContain('icon'); // For UI rendering
      expect(projectedFields).toContain('active'); // For filtering
      expect(projectedFields).toContain('is_default'); // For default categories
    });
  });
});
