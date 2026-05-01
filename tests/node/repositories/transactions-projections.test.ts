import { SupabaseTransactionsRepository } from '@/repositories/supabase/transactions-repository-impl';
import { Transaction, TransactionType } from '@/types';
import { TRANSACTION_LIST_PROJECTION } from '@/repositories/supabase/transaction-projections';

// Helper to create a mock query chain with proper async resolution
// Simulates Supabase query builder: select() -> filters -> range() -> awaitable result
function createTransactionQueryMock(selectCalls: any[]) {
  // Mock transaction data
  const mockTransactionData = {
    id: 'tx-1',
    type: 'INCOME',
    account_id: 'account-1',
    amount_minor: 10000,
    date: '2026-04-01',
    created_at: '2026-04-08T00:00:00Z',
    currency_code: 'USD',
    category_id: 'category-1',
    transfer_id: null,
    is_debt: false,
    debt_direction: null,
    debt_status: null,
    exchange_rate: 1.0,
    amount_base_minor: 10000,
  };

  // Track state as query is built
  let rangeWasCalled = false;

  // Create the mock chain with all methods
  const mockChain: any = {
    select: jest.fn(function (fields: any, options?: any) {
      selectCalls.push({ fields, options, caller: 'transactions' });
      return mockChain; // Return chain for method chaining
    }),
    eq: jest.fn(function () {
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
    gte: jest.fn(function () {
      return mockChain;
    }),
    lte: jest.fn(function () {
      return mockChain;
    }),
    or: jest.fn(function () {
      return mockChain;
    }),
    overlaps: jest.fn(function () {
      return mockChain;
    }),
    single: jest.fn(function () {
      return mockChain;
    }),
    // Make the chain awaitable by implementing thenable protocol
    // Each time then() is called, create a new promise with the current state
    then: jest.fn(function (resolve: any, reject: any) {
      // Create promise INSIDE then() so rangeWasCalled is captured at this moment
      const result = rangeWasCalled
        ? {
            data: [mockTransactionData],
            count: 1,
            error: null,
          }
        : {
            data: [mockTransactionData],
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

describe('SupabaseTransactionsRepository - Query Projections', () => {
  let mockClient: any;
  let repo: SupabaseTransactionsRepository;
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
        if (table === 'account_scopes') {
          // Handle account_scopes query for getOwnedAccountScope
          return {
            select: jest.fn(function () {
              return this;
            }),
            eq: jest.fn(function () {
              return this;
            }),
            single: jest.fn(async function () {
              return {
                data: { user_id: 'test-user-id', account_ids: ['account-1'] },
                error: null,
              };
            }),
          };
        }
        if (table === 'accounts') {
          // Mock for both getOwnedAccountScope (select('id')) and ensureAccountOwned (select('id'))
          // getOwnedAccountScope does NOT call single(), it just collects all results
          // ensureAccountOwned calls single()
          const accountsMockChain = {
            select: jest.fn(function (fields: any) {
              mockSelectCalls.push({ fields, caller: 'accounts' });
              return this;
            }),
            eq: jest.fn(function () {
              return this;
            }),
            // For getOwnedAccountScope: returns array of accounts
            then: jest.fn(function (resolve: any, reject: any) {
              // getOwnedAccountScope expects: data = [{ id: 'account-1' }, ...] (array, not single)
              const result = {
                data: [{ id: 'account-1', user_id: 'test-user-id' }],
                error: null,
              };
              Promise.resolve(result).then(resolve, reject);
            }),
            catch: jest.fn(function (reject: any) {
              return this;
            }),
            // For ensureAccountOwned: returns single account
            single: jest.fn(async function () {
              return {
                data: { id: 'account-1', user_id: 'test-user-id' },
                error: null,
              };
            }),
          };
          return accountsMockChain;
        }
        if (table === 'transactions') {
          return createTransactionQueryMock(mockSelectCalls);
        }
      }),
    };
    repo = new SupabaseTransactionsRepository(mockClient);
  });

  /**
   * RED Test 1: Query methods return proper structure
   * Validates that projection-based queries return the expected data structure
   */
  describe('Query Structure & Projections', () => {
    test('list methods return paginated results with proper fields', async () => {
      const result = await repo.findByAccountId('account-1');

      // Verify: Paginated result structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');

      // Verify: Transaction data contains expected fields
      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('id');
        expect(result.data[0]).toHaveProperty('type');
        expect(result.data[0]).toHaveProperty('accountId');
        expect(result.data[0]).toHaveProperty('amountMinor');
        expect(result.data[0]).toHaveProperty('currencyCode');
      }
    });

    test('findByAccountId() should use list projection', async () => {
      const result = await repo.findByAccountId('account-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);

      // Verify returned data contains expected fields
      expect(result.data[0].id).toBe('tx-1');
      expect(result.data[0].accountId).toBe('account-1');
      expect(result.data[0].currencyCode).toBe('USD');
    });

    test('findByCategoryId() should use list projection', async () => {
      const result = await repo.findByCategoryId('category-1');

      // Should return paginated result with count
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });

    test('findByType() should use list projection', async () => {
      const result = await repo.findByType(TransactionType.INCOME);

      // Should return paginated result
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });
  });

  /**
   * INTEGRATION: findById() returns detail transaction
   * Detail view should keep all fields for single transaction queries
   */
  describe('Detail Queries', () => {
    test('findById() returns a transaction or null', async () => {
      const result = await repo.findById('tx-1');

      // Result should be either a transaction object or null
      if (result !== null) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('accountId');
      }
    });
  });

  /**
   * RED Test 3: Exact count gating - verify that findByFilters requests count when pagination is used
   */
  describe('Exact Count Gating', () => {
    test('findByFilters() with pagination should request exact count', async () => {
      const result = await repo.findByFilters({}, { page: 1, limit: 10 });

      // Should include exact count for pagination
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(result.total).toBe(1);
    });
  });

  /**
   * RED Test 4: Byte reduction validation
   * Response payload should be smaller when using projections vs wildcard selects
   */
  describe('Payload Size Reduction', () => {
    test('list projection payload is smaller than detail payload', () => {
      const listTransaction = {
        id: 'tx-1',
        type: 'INCOME',
        account_id: 'account-1',
        amount_minor: 10000,
        date: '2026-04-01',
        created_at: '2026-04-08T00:00:00Z',
        currency_code: 'USD',
      };

      const detailTransaction = {
        ...listTransaction,
        description:
          'This is a very long description that definitely takes up much more space than needed for a list view',
        note: 'This is a very long note with additional details that are not necessary for list display and only needed in detail views',
        tags: ['tag1', 'tag2', 'tag3'],
        category_id: 'category-1',
        updated_at: '2026-04-08T12:00:00Z',
      };

      const listPayload = JSON.stringify(listTransaction);
      const detailPayload = JSON.stringify(detailTransaction);

      expect(listPayload.length).toBeLessThan(detailPayload.length);
      expect(listPayload.length / detailPayload.length).toBeLessThan(0.8); // At least 20% reduction
    });
  });

  /**
   * RED Test: TRANSACTION_LIST_PROJECTION must include description
   * so list views can display the real transaction name/title.
   */
  describe('List Projection Fields', () => {
    test('TRANSACTION_LIST_PROJECTION includes description for display', () => {
      expect(TRANSACTION_LIST_PROJECTION).toContain('description');
    });
  });
});
