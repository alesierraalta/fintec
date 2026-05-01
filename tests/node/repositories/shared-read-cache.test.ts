import { RequestContext } from '@/lib/cache/request-context';
import { SupabaseCategoriesRepository } from '@/repositories/supabase/categories-repository-impl';
import { SupabaseExchangeRatesRepository } from '@/repositories/supabase/exchange-rates-repository-impl';

type AwaitableQueryState = {
  eqCalls: Array<[string, unknown]>;
  isCalls: Array<[string, unknown]>;
  orderCalls: Array<[string, unknown]>;
};

function createAwaitableQuery(
  resultFactory: (state: AwaitableQueryState) => any
): any {
  const state: AwaitableQueryState = {
    eqCalls: [],
    isCalls: [],
    orderCalls: [],
  };

  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn((field: string, value: unknown) => {
      state.eqCalls.push([field, value]);
      return chain;
    }),
    is: jest.fn((field: string, value: unknown) => {
      state.isCalls.push([field, value]);
      return chain;
    }),
    order: jest.fn((field: string, options?: unknown) => {
      state.orderCalls.push([field, options]);
      return chain;
    }),
    then: jest.fn(
      (resolve: (value: any) => void, reject: (reason?: unknown) => void) => {
        Promise.resolve(resultFactory(state)).then(resolve, reject);
      }
    ),
    catch: jest.fn(() => chain),
    finally: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
    single: jest.fn(async () => resultFactory(state)),
    maybeSingle: jest.fn(async () => resultFactory(state)),
    in: jest.fn(() => chain),
    ilike: jest.fn(() => chain),
    or: jest.fn(() => chain),
    range: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    limit: jest.fn(() => chain),
  };

  return chain;
}

describe('Shared read cache wave', () => {
  const originalFlag = process.env.BACKEND_SHARED_READ_CACHE;

  beforeEach(() => {
    process.env.BACKEND_SHARED_READ_CACHE = 'true';
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.BACKEND_SHARED_READ_CACHE;
      return;
    }

    process.env.BACKEND_SHARED_READ_CACHE = originalFlag;
  });

  it('caches repeated exchange-rate reads and records hit/miss profiler events', async () => {
    const dbRows = [
      {
        id: 'rate-1',
        base_currency: 'USD',
        quote_currency: 'VES',
        rate: 36.5,
        date: '2026-04-08',
        provider: 'binance',
        created_at: '2026-04-08T00:00:00Z',
      },
    ];

    const mockClient = {
      from: jest.fn(() =>
        createAwaitableQuery(() => ({
          data: dbRows,
          error: null,
        }))
      ),
    };

    const cachedRows = [
      {
        id: 'rate-1',
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: 36.5,
        date: '2026-04-08',
        provider: 'binance',
        createdAt: '2026-04-08T00:00:00Z',
      },
    ];

    const mockCache = {
      get: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cachedRows),
      set: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockReturnValue(true),
      makeKey: jest.fn((_scope: string, ...parts: string[]) =>
        ['exchange_rates', ...parts].join(':')
      ),
    };

    const requestContext = new RequestContext('user-1', 1);
    const repo = new SupabaseExchangeRatesRepository(
      mockClient as any,
      requestContext,
      mockCache as any
    );

    const first = await repo.findAll();
    const second = await repo.findAll();

    expect(first).toEqual(second);
    expect(mockClient.from).toHaveBeenCalledTimes(1);
    expect(mockCache.set).toHaveBeenCalledTimes(1);
    expect(requestContext.profiler.events.map((event) => event.name)).toEqual([
      'cache_miss_exchange_rates_findAll',
      'cache_hit_exchange_rates_findAll',
    ]);
  });

  it('invalidates exchange-rate cache after writes', async () => {
    const mockClient = {
      from: jest.fn(() =>
        createAwaitableQuery(() => ({
          data: {
            id: 'rate-1',
            base_currency: 'USD',
            quote_currency: 'VES',
            rate: 36.5,
            date: '2026-04-08',
            provider: 'binance',
            created_at: '2026-04-08T00:00:00Z',
          },
          error: null,
        }))
      ),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockReturnValue(true),
      makeKey: jest.fn((_scope: string, ...parts: string[]) =>
        ['exchange_rates', ...parts].join(':')
      ),
    };

    const repo = new SupabaseExchangeRatesRepository(
      mockClient as any,
      undefined,
      mockCache as any
    );

    await repo.create({
      baseCurrency: 'USD',
      quoteCurrency: 'VES',
      rate: 36.5,
      date: '2026-04-08',
      provider: 'binance',
    });

    expect(mockCache.invalidatePattern).toHaveBeenCalledWith(
      'exchange_rates:*'
    );
  });

  it('caches only default categories and keeps user-specific categories isolated', async () => {
    let defaultDbReads = 0;
    let userDbReads = 0;

    const defaultRows = [
      {
        id: 'default-food',
        name: 'Food',
        kind: 'EXPENSE',
        color: '#FF5733',
        icon: 'utensils',
        parent_id: null,
        active: true,
        user_id: null,
        is_default: true,
        created_at: '2026-04-08T00:00:00Z',
        updated_at: '2026-04-08T00:00:00Z',
      },
    ];

    const createCategoriesClient = (userId: string, customName: string) => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: userId } },
        }),
      },
      from: jest.fn(() =>
        createAwaitableQuery((state) => {
          const isDefaultQuery = state.eqCalls.some(
            ([field, value]) => field === 'is_default' && value === true
          );
          const isUserQuery = state.eqCalls.some(
            ([field, value]) => field === 'user_id' && value === userId
          );

          if (isDefaultQuery) {
            defaultDbReads += 1;
            return { data: defaultRows, error: null };
          }

          if (isUserQuery) {
            userDbReads += 1;
            return {
              data: [
                {
                  id: `${userId}-custom`,
                  name: customName,
                  kind: 'EXPENSE',
                  color: '#111111',
                  icon: 'tag',
                  parent_id: null,
                  active: true,
                  user_id: userId,
                  is_default: false,
                  created_at: '2026-04-08T00:00:00Z',
                  updated_at: '2026-04-08T00:00:00Z',
                },
              ],
              error: null,
            };
          }

          return { data: [], error: null };
        })
      ),
    });

    const sharedCache = {
      get: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([
          {
            id: 'default-food',
            name: 'Food',
            kind: 'EXPENSE',
            color: '#FF5733',
            icon: 'utensils',
            parentId: null,
            active: true,
            userId: null,
            isDefault: true,
            createdAt: '2026-04-08T00:00:00Z',
            updatedAt: '2026-04-08T00:00:00Z',
          },
        ]),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockReturnValue(true),
      makeKey: jest.fn((_scope: string, ...parts: string[]) =>
        ['categories', ...parts].join(':')
      ),
    };

    const repoA = new SupabaseCategoriesRepository(
      createCategoriesClient('user-a', 'A custom') as any,
      new RequestContext('user-a', 1),
      sharedCache as any
    );
    const repoB = new SupabaseCategoriesRepository(
      createCategoriesClient('user-b', 'B custom') as any,
      new RequestContext('user-b', 1),
      sharedCache as any
    );

    const userACategories = await repoA.findAll();
    const userBCategories = await repoB.findAll();

    expect(userACategories.map((category) => category.name)).toEqual([
      'Food',
      'A custom',
    ]);
    expect(userBCategories.map((category) => category.name)).toEqual([
      'Food',
      'B custom',
    ]);
    expect(defaultDbReads).toBe(1);
    expect(userDbReads).toBe(2);
  });

  it('invalidates default-category cache after default-category writes', async () => {
    const mockClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: jest.fn(() =>
        createAwaitableQuery(() => ({
          data: {
            id: 'default-food',
            name: 'Food',
            kind: 'EXPENSE',
            color: '#FF5733',
            icon: 'utensils',
            parent_id: null,
            active: true,
            user_id: null,
            is_default: true,
            created_at: '2026-04-08T00:00:00Z',
            updated_at: '2026-04-08T00:00:00Z',
          },
          error: null,
        }))
      ),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockReturnValue(true),
      makeKey: jest.fn((_scope: string, ...parts: string[]) =>
        ['categories', ...parts].join(':')
      ),
    };

    const repo = new SupabaseCategoriesRepository(
      mockClient as any,
      new RequestContext('admin-user', 1),
      mockCache as any
    );

    await repo.create({
      name: 'Food',
      kind: 'EXPENSE' as any,
      color: '#FF5733',
      icon: 'utensils',
      isDefault: true,
    });

    expect(mockCache.invalidatePattern).toHaveBeenCalledWith(
      'categories:default:*'
    );
  });

  it('invalidates default-category cache after hard deleting a default category', async () => {
    const existingDefaultCategory = {
      id: 'default-food',
      name: 'Food',
      kind: 'EXPENSE',
      color: '#FF5733',
      icon: 'utensils',
      parent_id: null,
      active: true,
      user_id: null,
      is_default: true,
      created_at: '2026-04-08T00:00:00Z',
      updated_at: '2026-04-08T00:00:00Z',
    };

    const mockClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-user' } },
        }),
      },
      from: jest
        .fn()
        .mockImplementationOnce(() =>
          createAwaitableQuery(() => ({
            data: existingDefaultCategory,
            error: null,
          }))
        )
        .mockImplementationOnce(() =>
          createAwaitableQuery(() => ({
            data: null,
            error: null,
          }))
        ),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
      isAvailable: jest.fn().mockReturnValue(true),
      makeKey: jest.fn((_scope: string, ...parts: string[]) =>
        ['categories', ...parts].join(':')
      ),
    };

    const repo = new SupabaseCategoriesRepository(
      mockClient as any,
      new RequestContext('admin-user', 1),
      mockCache as any
    );

    await repo.hardDelete('default-food');

    expect(mockCache.invalidatePattern).toHaveBeenCalledWith(
      'categories:default:*'
    );
    // Should also call delete for the individual ID key
    expect(mockCache.delete).toHaveBeenCalled();
  });
});
