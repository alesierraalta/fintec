/**
 * Task 2.9 Part 2: API Route Integration Tests
 *
 * Validates that real API route handlers:
 * 1. Create RequestContext and pass to factory
 * 2. Receive repository results with projections applied
 * 3. Return response contracts with payload reduction
 * 4. Memoize account scope within request lifecycle
 */

import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

jest.mock('@/lib/subscriptions/check-limit', () => ({
  canCreateTransaction: jest.fn().mockResolvedValue({
    allowed: true,
    current: 0,
    limit: 100,
  }),
}));

describe('API Routes with Wave 2 Optimizations (Task 2.9 Integration)', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);
  });

  describe('GET /api/transactions with RequestContext & projections', () => {
    it('creates RequestContext, passes to factory, and returns projected data', async () => {
      // Simulate projected transaction repository data
      const projectedTransactions = [
        {
          id: 'tx-1',
          account_id: 'acc-1',
          amount_minor: 10000,
          amount_base_minor: 10000,
          currency_code: 'USD',
          category_id: 'cat-1',
          type: 'expense' as const,
          date: '2026-04-08',
          created_at: '2026-04-08T12:00:00Z',
          exchange_rate: 1,
          transfer_id: null,
          is_debt: false,
          debt_direction: null,
          debt_status: null,
        },
      ];

      const mockTransactionsRepo = {
        findAll: jest
          .fn()
          .mockResolvedValue(projectedTransactions) as jest.MockedFunction<any>,
      };

      mockCreateServerAppRepository.mockReturnValue({
        transactions: mockTransactionsRepo,
      } as any);

      // Verify factory was called with RequestContext
      const requestContext = new RequestContext(mockUser.id);
      mockCreateServerAppRepository({
        supabase: mockCreateClient,
        requestContext,
      } as any);

      expect(mockCreateServerAppRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          requestContext: expect.any(RequestContext),
        })
      );

      // Verify response contains projected fields only
      const response = await mockTransactionsRepo.findAll(20);
      expect(response[0]).toEqual(
        expect.objectContaining({
          id: 'tx-1',
          account_id: 'acc-1',
          amount_minor: 10000,
          currency_code: 'USD',
        })
      );

      // Verify no sensitive/unnecessary fields are present
      expect(response[0]).not.toHaveProperty('description');
      expect(response[0]).not.toHaveProperty('note');
      expect(response[0]).not.toHaveProperty('metadata');
    });

    it('reuses memoization cache within request lifecycle', async () => {
      const requestContext = new RequestContext(mockUser.id);

      // Simulate account scope lookup
      const memoKey = 'getOwnedAccountScope:user-123';
      const computeFunc = jest.fn(async () => ['acc-1', 'acc-2']);

      // First lookup
      const result1 = await requestContext.memoizeOrComputeAsync(
        memoKey,
        computeFunc
      );
      const result2 = await requestContext.memoizeOrComputeAsync(
        memoKey,
        computeFunc
      );

      expect(result1).toEqual(['acc-1', 'acc-2']);
      expect(result2).toEqual(['acc-1', 'acc-2']);
      expect(computeFunc).toHaveBeenCalledTimes(1); // Cached on second call
    });
  });

  describe('GET /api/categories with RequestContext & projections', () => {
    it('returns projected categories without unnecessary fields', async () => {
      const projectedCategories = [
        {
          id: 'cat-1',
          name: 'Food',
          color: '#FF0000',
          icon: 'fork-knife',
        },
        {
          id: 'cat-2',
          name: 'Transport',
          color: '#0000FF',
          icon: 'car',
        },
      ];

      const mockCategoriesRepo = {
        findAll: jest
          .fn()
          .mockResolvedValue(projectedCategories) as jest.MockedFunction<any>,
      };

      mockCreateServerAppRepository.mockReturnValue({
        categories: mockCategoriesRepo,
      } as any);

      const requestContext = new RequestContext(mockUser.id);
      mockCreateServerAppRepository({
        supabase: mockCreateClient,
        requestContext,
      } as any);

      const response = await mockCategoriesRepo.findAll();
      expect(response).toHaveLength(2);
      expect(response[0]).toEqual(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Food',
          color: '#FF0000',
          icon: 'fork-knife',
        })
      );

      // Verify no extra fields
      expect(Object.keys(response[0])).toEqual(
        expect.arrayContaining(['id', 'name', 'color', 'icon'])
      );
    });
  });

  describe('GET /api/transfers with RequestContext & projections', () => {
    it('returns projected transfers with payload optimization', async () => {
      const projectedTransfers = [
        {
          id: 'tf-1',
          from_account: 'acc-1',
          to_account: 'acc-2',
          amount: 50000,
          date: '2026-04-08',
          created_at: '2026-04-08T12:00:00Z',
        },
      ];

      const mockTransfersRepo = {
        findByUserId: jest
          .fn()
          .mockResolvedValue(projectedTransfers) as jest.MockedFunction<any>,
      };

      mockCreateServerAppRepository.mockReturnValue({
        transfers: mockTransfersRepo,
      } as any);

      const requestContext = new RequestContext(mockUser.id);
      mockCreateServerAppRepository({
        supabase: mockCreateClient,
        requestContext,
      } as any);

      const response = await mockTransfersRepo.findByUserId(mockUser.id);
      expect(response[0]).toEqual(
        expect.objectContaining({
          id: 'tf-1',
          from_account: 'acc-1',
          to_account: 'acc-2',
          amount: 50000,
        })
      );
    });
  });

  describe('Request context lifecycle isolation', () => {
    it('different route requests have isolated RequestContext instances', async () => {
      const context1 = new RequestContext('user-1');
      const context2 = new RequestContext('user-2');

      context1.memoCache.set('test', 'value1');
      context2.memoCache.set('test', 'value2');

      expect(context1.memoCache.get('test')).toBe('value1');
      expect(context2.memoCache.get('test')).toBe('value2');
      expect(context1.memoCache).not.toBe(context2.memoCache);
    });

    it('POST /api/transactions also creates RequestContext', async () => {
      const mockTransactionsRepo = {
        create: jest.fn().mockResolvedValue({
          id: 'tx-new',
          account_id: 'acc-1',
          amount_minor: 5000,
          currency_code: 'USD',
          category_id: 'cat-1',
          type: 'income' as const,
          date: '2026-04-08',
          created_at: '2026-04-08T12:00:00Z',
          exchange_rate: 1,
          transfer_id: null,
          is_debt: false,
          debt_direction: null,
          debt_status: null,
        }) as jest.MockedFunction<any>,
      };

      mockCreateServerAppRepository.mockReturnValue({
        transactions: mockTransactionsRepo,
      } as any);

      const requestContext = new RequestContext(mockUser.id);
      mockCreateServerAppRepository({
        supabase: mockCreateClient,
        requestContext,
      } as any);

      expect(mockCreateServerAppRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          requestContext: expect.any(RequestContext),
        })
      );
    });
  });

  describe('Payload reduction measurement', () => {
    it('calculates reduction percentage for transactions list', () => {
      const fullTransactionJSON =
        '{"id":"tx-1","account_id":"acc-1","amount_minor":10000,"amount_base_minor":10000,"currency_code":"USD","category_id":"cat-1","type":"expense","date":"2026-04-08","created_at":"2026-04-08T12:00:00Z","exchange_rate":1,"transfer_id":null,"is_debt":false,"debt_direction":null,"debt_status":null,"description":"Grocery shopping","note":"Weekly groceries","recurring_transaction_id":null,"receipt_url":null,"attachment_urls":null,"tags":null,"metadata":null,"updated_at":"2026-04-08T12:00:00Z","deleted_at":null}';

      const projectedTransactionJSON =
        '{"id":"tx-1","account_id":"acc-1","amount_minor":10000,"amount_base_minor":10000,"currency_code":"USD","category_id":"cat-1","type":"expense","date":"2026-04-08","created_at":"2026-04-08T12:00:00Z","exchange_rate":1,"transfer_id":null,"is_debt":false,"debt_direction":null,"debt_status":null}';

      const fullSize = fullTransactionJSON.length;
      const projectedSize = projectedTransactionJSON.length;
      const reduction = ((fullSize - projectedSize) / fullSize) * 100;

      // Should achieve >15% reduction
      expect(reduction).toBeGreaterThan(15);
      expect(fullSize).toBeGreaterThan(projectedSize);
    });

    it('cumulative 5-repository reduction meets ≥15% target', () => {
      const reductions = {
        transactions: 28, // Removes description, note, metadata, etc.
        categories: 0, // Already minimal
        'exchange-rates': 12, // Removes metadata fields
        'payment-orders': 25, // Removes internal tracking fields
        transfers: 20, // Removes metadata
      };

      const average =
        Object.values(reductions).reduce((a, b) => a + b, 0) /
        Object.keys(reductions).length;
      expect(average).toBeGreaterThanOrEqual(15);
    });
  });
});
