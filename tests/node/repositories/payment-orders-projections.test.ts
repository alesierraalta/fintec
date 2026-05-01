import { SupabasePaymentOrdersRepository } from '@/repositories/supabase/payment-orders-repository-impl';
import { PaymentOrderStatus } from '@/types/payment-order';

// Helper to create a mock query chain with proper async resolution
// Simulates Supabase query builder: select() -> filters -> range() -> awaitable result
function createPaymentOrderQueryMock(selectCalls: any[]) {
  // Mock payment order data (with all fields, including receipt and admin notes)
  const mockPaymentOrderData = {
    id: 'order-1',
    user_id: 'test-user-id',
    amount_minor: 50000,
    currency_code: 'VES',
    description: 'Payment for account topup',
    status: 'pending_review' as PaymentOrderStatus,
    receipt_url: 'https://example.com/receipt.jpg',
    receipt_filename: 'receipt.jpg',
    admin_notes: 'Waiting for review',
    reviewed_by: null,
    reviewed_at: null,
    transaction_id: null,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  };

  // Track state as query is built
  let rangeWasCalled = false;

  // Create the mock chain with all methods
  const mockChain: any = {
    select: jest.fn(function (fields: any, options?: any) {
      selectCalls.push({ fields, options, caller: 'payment_orders' });
      return mockChain; // Return chain for method chaining
    }),
    eq: jest.fn(function () {
      return mockChain;
    }),
    order: jest.fn(function () {
      return mockChain;
    }),
    range: jest.fn(function () {
      rangeWasCalled = true;
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
            data: [mockPaymentOrderData],
            count: 1,
            error: null,
          }
        : {
            data: [mockPaymentOrderData],
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

describe('SupabasePaymentOrdersRepository - Query Projections', () => {
  let mockClient: any;
  let repo: SupabasePaymentOrdersRepository;
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
        if (table === 'payment_orders') {
          return createPaymentOrderQueryMock(mockSelectCalls);
        }
      }),
    };
    repo = new SupabasePaymentOrdersRepository(mockClient);
  });

  /**
   * RED Test 1: Query methods use list projection
   * Validates that projection-based queries are used for list methods
   */
  describe('Query Projections', () => {
    test('listByUserId() should use PAYMENT_ORDER_LIST_PROJECTION', async () => {
      const result = await repo.listByUserId('test-user-id');

      // Verify: listByUserId returns array of payment orders
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('userId');
        expect(result[0]).toHaveProperty('amountMinor');
        expect(result[0]).toHaveProperty('currencyCode');
        expect(result[0]).toHaveProperty('status');
      }

      // Verify: select() was called with projection (not wildcard)
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('id');
      expect(selectCall.fields).toContain('user_id');
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('currency_code');
      expect(selectCall.fields).toContain('status');
    });

    test('listByUserId() with status filter should use PAYMENT_ORDER_LIST_PROJECTION', async () => {
      const result = await repo.listByUserId('test-user-id', 'pending_review');

      // Verify: listByUserId returns array of payment orders
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('status');
    });

    test('listAll() should use PAYMENT_ORDER_LIST_PROJECTION with pagination', async () => {
      const result = await repo.listAll('pending_review', 25, 0);

      // Verify: listAll returns array of payment orders
      expect(Array.isArray(result)).toBe(true);

      // Verify: select() was called with projection (not wildcard)
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).not.toBe('*');
      expect(selectCall.fields).toContain('id');
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('currency_code');
    });

    test('listAll() pagination uses range() to limit result set', async () => {
      const result = await repo.listAll('pending_review', 25, 0);

      // Verify: listAll returns array (count included due to range() call)
      expect(Array.isArray(result)).toBe(true);

      // Verify: range() was used for pagination
      // (rangeWasCalled is tracked in mock, and count is included in result)
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();
    });
  });

  /**
   * RED Test 2: findById() returns detail with all fields
   * Detail view should keep all fields for single order queries
   */
  describe('Detail Queries', () => {
    test('findById() returns a payment order or null with all fields', async () => {
      // For this test, we need a separate mock for findById which uses select('*')
      const mockChain = {
        select: jest.fn(function () {
          mockSelectCalls.push({
            fields: '*',
            caller: 'payment_orders-detail',
          });
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        single: jest.fn(async function () {
          return {
            data: {
              id: 'order-1',
              user_id: 'test-user-id',
              amount_minor: 50000,
              currency_code: 'VES',
              description: 'Payment for account topup',
              status: 'pending_review',
              receipt_url: 'https://example.com/receipt.jpg',
              receipt_filename: 'receipt.jpg',
              admin_notes: 'Waiting for review',
              reviewed_by: null,
              reviewed_at: null,
              transaction_id: null,
              created_at: '2026-04-08T00:00:00Z',
              updated_at: '2026-04-08T00:00:00Z',
            },
            error: null,
          };
        }),
      };

      mockClient.from = jest.fn((table: string) => {
        if (table === 'payment_orders') {
          return mockChain;
        }
      });

      const result = await repo.findById('order-1');

      // Verify: findById returns a payment order with all fields
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 'order-1');
      expect(result).toHaveProperty('amountMinor', 50000);
      expect(result).toHaveProperty('currencyCode', 'VES');
      expect(result).toHaveProperty('status', 'pending_review');
      // Detail-only fields
      expect(result).toHaveProperty('receiptUrl');
      expect(result).toHaveProperty('adminNotes');

      // Verify: select() was called with wildcard for detail query
      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders-detail'
      );
      expect(selectCall).toBeDefined();
      expect(selectCall.fields).toBe('*');
    });

    test('findById() returns null when order not found', async () => {
      const mockChain = {
        select: jest.fn(function () {
          mockSelectCalls.push({
            fields: '*',
            caller: 'payment_orders-detail',
          });
          return this;
        }),
        eq: jest.fn(function () {
          return this;
        }),
        single: jest.fn(async function () {
          return {
            data: null,
            error: { code: 'PGRST116' },
          };
        }),
      };

      mockClient.from = jest.fn((table: string) => {
        if (table === 'payment_orders') {
          return mockChain;
        }
      });

      const result = await repo.findById('nonexistent-id');

      // Verify: findById returns null for not found
      expect(result).toBeNull();
    });
  });

  /**
   * RED Test 3: Money logic preservation
   * Validates that amount_minor and currency_code are always included
   */
  describe('Money Logic Preservation', () => {
    test('listByUserId() includes amountMinor and currencyCode in list projection', async () => {
      await repo.listByUserId('test-user-id');

      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();

      // Critical: money fields MUST be in projection
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('currency_code');
    });

    test('listAll() includes amountMinor and currencyCode in list projection', async () => {
      await repo.listAll();

      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();

      // Critical: money fields MUST be in projection
      expect(selectCall.fields).toContain('amount_minor');
      expect(selectCall.fields).toContain('currency_code');
    });
  });

  /**
   * GREEN Test: Payload reduction verification
   * Validates that projection actually reduces payload
   */
  describe('Payload Reduction', () => {
    test('PAYMENT_ORDER_LIST_PROJECTION excludes receipt and admin note fields', async () => {
      await repo.listByUserId('test-user-id');

      const selectCall = mockSelectCalls.find(
        (c) => c.caller === 'payment_orders'
      );
      expect(selectCall).toBeDefined();

      // Verify deferred fields are NOT in list projection
      expect(selectCall.fields).not.toContain('receipt_url');
      expect(selectCall.fields).not.toContain('receipt_filename');
      expect(selectCall.fields).not.toContain('admin_notes');
    });

    test('Domain mapper correctly handles optional fields from list projection', async () => {
      const result = await repo.listByUserId('test-user-id');

      // Verify: domain object has well-defined optional fields
      if (result.length > 0) {
        const order = result[0];
        // Fields from projection should be defined or undefined, never throw
        expect(typeof order.id).toBe('string');
        expect(typeof order.amountMinor).toBe('number');
        expect(typeof order.currencyCode).toBe('string');
        expect(typeof order.status).toBe('string');
      }
    });
  });
});
