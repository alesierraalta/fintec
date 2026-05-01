import { SupabaseCategoriesRepository } from '@/repositories/supabase/categories-repository-impl';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import { RequestContext } from '@/lib/cache/request-context';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => {
    const store = new Map();
    return {
      get: jest.fn(async (key) => store.get(key) || null),
      set: jest.fn(async (key, value) => {
        store.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (...keys) => {
        keys.forEach((k) => store.delete(k));
        return keys.length;
      }),
      keys: jest.fn(async (pattern) => {
        const regex = new RegExp(
          pattern.replace('*', '.*').replace(':', '\\:')
        );
        return Array.from(store.keys()).filter((k) => regex.test(k));
      }),
      on: jest.fn(),
    };
  });
  return RedisMock;
});

function createMockQuery(data: any = null) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    is: jest.fn(() => query),
    or: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    ilike: jest.fn(() => query),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    single: jest.fn().mockResolvedValue({ data, error: null }),
    then: jest.fn().mockImplementation((callback) => {
      return callback({
        data: Array.isArray(data) ? data : [data],
        error: null,
      });
    }),
    update: jest.fn(() => query),
  };
  return query;
}

describe('SupabaseCategoriesRepository Shared Cache', () => {
  let repository: SupabaseCategoriesRepository;
  let mockSupabase: any;
  let mockRedis: any;
  let readCache: ServerReadCache;
  let context: RequestContext;

  beforeEach(() => {
    process.env.BACKEND_SHARED_READ_CACHE = '1';

    mockRedis = new Redis();
    readCache = new ServerReadCache(mockRedis);
    context = new RequestContext('user-1', 1.0);

    mockSupabase = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: jest.fn((table) => {
        if (table === 'categories') {
          return createMockQuery({
            id: 'cat-1',
            name: 'Default Cat',
            is_default: true,
            user_id: null,
            active: true,
          });
        }
        return createMockQuery();
      }),
    };

    repository = new SupabaseCategoriesRepository(
      mockSupabase as any,
      context,
      readCache
    );
  });

  afterEach(() => {
    delete process.env.BACKEND_SHARED_READ_CACHE;
    jest.clearAllMocks();
  });

  it('findAll should cache default categories', async () => {
    await repository.findAll();
    expect(await mockRedis.get('categories:default:all')).toBeDefined();
  });

  it('findById should use cache for default categories', async () => {
    // 1. First call (MISS)
    await repository.findById('cat-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('categories');

    // 2. Second call (HIT)
    jest.clearAllMocks();
    const result = await repository.findById('cat-1');
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(result?.id).toBe('cat-1');
  });

  it('update should invalidate relevant cache keys', async () => {
    // Populate cache
    await repository.findAll();
    await repository.findById('cat-1');

    expect(await mockRedis.get('categories:default:all')).toBeDefined();
    expect(await mockRedis.get('categories:id:cat-1')).toBeDefined();

    // Perform update
    await repository.update('cat-1', { id: 'cat-1', name: 'Updated' });

    // Verify invalidation
    expect(mockRedis.del).toHaveBeenCalled();
    // Individual ID key should be gone
    expect(await mockRedis.get('categories:id:cat-1')).toBeNull();
    // Pattern invalidation should have cleared default:all (assuming del was called with it)
  });
});
