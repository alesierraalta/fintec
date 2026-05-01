import { SupabaseTransfersRepository } from '@/repositories/supabase/transfers-repository-impl';

// Mock the account scope module
jest.mock('@/repositories/supabase/account-scope', () => ({
  getOwnedAccountScope: jest.fn().mockResolvedValue({
    accountIds: ['acc-1', 'acc-2'],
  }),
  hasOwnedAccounts: jest.fn(
    (scope) => scope && scope.accountIds && scope.accountIds.length > 0
  ),
}));

// Helper function to create transfer query mock
function createTransferQueryMock(selectCalls: any[]) {
  // Mock transfer transaction data (TRANSFER_OUT)
  const mockTransferOutData = {
    id: 'txn-out-1',
    type: 'TRANSFER_OUT',
    account_id: 'acc-1',
    category_id: null,
    currency_code: 'VES',
    amount_minor: 100000,
    amount_base_minor: 50000,
    exchange_rate: 0.5,
    date: '2026-04-08',
    description: 'Transfer to savings',
    transfer_id: 'transfer-1',
    pending: false,
    is_debt: false,
    counterparty_name: null,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
    account: { name: 'Checking' },
  };

  // Mock transfer transaction data (TRANSFER_IN)
  const mockTransferInData = {
    id: 'txn-in-1',
    type: 'TRANSFER_IN',
    account_id: 'acc-2',
    category_id: null,
    currency_code: 'VES',
    amount_minor: 100000,
    amount_base_minor: 50000,
    exchange_rate: 0.5,
    date: '2026-04-08',
    description: 'Transfer to savings',
    transfer_id: 'transfer-1',
    pending: false,
    is_debt: false,
    counterparty_name: null,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
    account: { name: 'Savings' },
  };

  // Create the mock chain with all methods
  const mockChain: any = {
    select: jest.fn(function (fields: any, options?: any) {
      selectCalls.push({ fields, options, caller: 'transfers' });
      return mockChain; // Return chain for method chaining
    }),
    in: jest.fn(function () {
      return mockChain;
    }),
    not: jest.fn(function () {
      return mockChain;
    }),
    order: jest.fn(function () {
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
    limit: jest.fn(function () {
      return mockChain;
    }),
    // Make the chain awaitable by implementing thenable protocol
    then: jest.fn(function (resolve: any, reject: any) {
      const result = {
        data: [mockTransferOutData, mockTransferInData],
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

describe('SupabaseTransfersRepository - Query Projections', () => {
  let mockClient: any;
  let repo: SupabaseTransfersRepository;
  let mockSelectCalls: any[];

  beforeEach(() => {
    mockSelectCalls = [];

    // Create a basic mock Supabase client
    mockClient = {
      from: jest.fn((table: string) => {
        if (table === 'transactions') {
          return createTransferQueryMock(mockSelectCalls);
        }
      }),
    };
    repo = new SupabaseTransfersRepository(mockClient);
  });

  /**
   * RED Test 1: Query methods use list projection
   * Validates that projection-based queries are used for list methods
   */
  describe('Query Projections', () => {
    test('listByUserId() should use TRANSFER_TRANSACTION_LIST_PROJECTION', async () => {
      const result = await repo.listByUserId('test-user-id');

      // Verify: listByUserId returns array of transfer records
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('fromTransaction');
        expect(result[0]).toHaveProperty('toTransaction');
        expect(result[0]).toHaveProperty('amountMinor');
      }

      // Verify: select() was called with projection (not wildcard)
      const selectCall = mockSelectCalls.find((c) => c.caller === 'transfers');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toMatch(/^\*/); // Should not start with *
      expect(selectCall.fields).toContain('id');
      expect(selectCall.fields).toContain('type');
      expect(selectCall.fields).toContain('currency_code');
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('transfer_id');
    });

    test('listByUserId() with filters should use TRANSFER_TRANSACTION_LIST_PROJECTION', async () => {
      const result = await repo.listByUserId('test-user-id', {
        accountId: 'acc-1',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        limit: 50,
      });

      // Verify: listByUserId returns array of transfer records
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find((c) => c.caller === 'transfers');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toMatch(/^\*/);
      expect(selectCall.fields).toContain('amount_base_minor');
      expect(selectCall.fields).toContain('exchange_rate');
    });

    test('listByUserId() includes account name projection', async () => {
      const result = await repo.listByUserId('test-user-id');

      // Verify: select() includes nested account projection
      const selectCall = mockSelectCalls.find((c) => c.caller === 'transfers');
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).toContain('account');
      expect(selectCall.fields).toContain('name'); // From account projection
    });
  });

  /**
   * RED Test 2: Money logic preservation
   * Validates that amount_minor, amount_base_minor, currency_code, and exchange_rate are always included
   */
  describe('Money Logic Preservation', () => {
    test('listByUserId() includes all money-related fields in projection', async () => {
      await repo.listByUserId('test-user-id');

      const selectCall = mockSelectCalls.find((c) => c.caller === 'transfers');
      expect(selectCall).toBeDefined();

      // Critical: money fields MUST be in projection
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('amount_base_minor');
      expect(selectCall.fields).toContain('currency_code');
      expect(selectCall.fields).toContain('exchange_rate');
    });

    test('listByUserId() preserves transfer metadata for domain mapping', async () => {
      const result = await repo.listByUserId('test-user-id');

      // Verify: transfer records contain mapped domain objects
      if (result.length > 0) {
        const transfer = result[0];
        // Check that money-related fields are present in mapped domain objects
        if (transfer.fromTransaction) {
          expect(typeof transfer.fromTransaction.amountMinor).toBe('number');
          expect(typeof transfer.fromTransaction.currencyCode).toBe('string');
        }
        if (transfer.toTransaction) {
          expect(typeof transfer.toTransaction.amountMinor).toBe('number');
          expect(typeof transfer.toTransaction.currencyCode).toBe('string');
        }
      }
    });
  });

  /**
   * RED Test 3: Delete operation uses minimal projection
   * Validates that delete query only fetches transaction IDs
   */
  describe('Delete Operations', () => {
    test('delete() should use TRANSFER_TRANSACTION_DELETE_PROJECTION', async () => {
      // Mock delete operation
      const mockChainDelete = {
        select: jest.fn(function (fields: any) {
          mockSelectCalls.push({ fields, caller: 'transfers-delete' });
          return this;
        }),
        in: jest.fn(function () {
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        then: jest.fn(function (resolve: any) {
          const result = {
            data: [{ id: 'txn-out-1' }, { id: 'txn-in-1' }],
            error: null,
          };
          Promise.resolve(result).then(resolve);
        }),
        catch: jest.fn(function () {
          return this;
        }),
      };

      mockClient.from = jest.fn((table: string) => {
        if (table === 'transactions') {
          return mockChainDelete;
        }
      });

      // Mock the RPC call for deletion
      (mockClient as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      await repo.delete('test-user-id', 'transfer-1');

      // Verify: select() was called with minimal projection (only id)
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'transfers-delete'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).toBe('id');
      expect(selectCall.fields).not.toContain('amount_minor');
      expect(selectCall.fields).not.toContain('currency_code');
    });
  });

  /**
   * GREEN Test: Payload reduction verification
   * Validates that projection excludes unnecessary fields for list queries
   */
  describe('Payload Reduction', () => {
    test('TRANSFER_TRANSACTION_LIST_PROJECTION excludes detailed fields', async () => {
      await repo.listByUserId('test-user-id');

      const selectCall = mockSelectCalls.find((c) => c.caller === 'transfers');
      expect(selectCall).toBeDefined();

      // Verify deferred fields are NOT in list projection
      // (These would be in select('*') but not in our projection)
      expect(selectCall.fields).not.toContain('tags'); // Not queried
      expect(selectCall.fields).not.toContain('note');
      expect(selectCall.fields).not.toContain('settled_at');
      expect(selectCall.fields).not.toContain('debt_direction');
      expect(selectCall.fields).not.toContain('debt_status');
    });
  });
});
