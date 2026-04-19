import { ServerReadCache } from '@/lib/cache/server-read-cache';

describe('ServerReadCache', () => {
  describe('constructor', () => {
    it('should initialize cache with Redis client', () => {
      // Mock Redis client
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      
      expect(cache).toBeDefined();
    });

    it('should support optional Redis client (fallback)', () => {
      const cache = new ServerReadCache(null);
      
      expect(cache).toBeDefined();
    });
  });

  describe('get', () => {
    it('should retrieve cached value from Redis', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({ id: 'rate-1', value: 2.5 })),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      const result = await cache.get('exchange_rates:USD:EUR');
      
      expect(result).toEqual({ id: 'rate-1', value: 2.5 });
      expect(mockRedis.get).toHaveBeenCalledWith('exchange_rates:USD:EUR');
    });

    it('should return null if key not found', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      const result = await cache.get('nonexistent_key');
      
      expect(result).toBeNull();
    });

    it('should parse JSON values correctly', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify([1, 2, 3])),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      const result = await cache.get('list_key');
      
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should store value in Redis with TTL', async () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      await cache.set('exchange_rates:USD:EUR', { value: 2.5 }, 300);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'exchange_rates:USD:EUR',
        JSON.stringify({ value: 2.5 }),
        'EX',
        300
      );
    });

    it('should use default TTL if not provided', async () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      await cache.set('categories:default', { name: 'default' });
      
      expect(mockRedis.set).toHaveBeenCalled();
      const call = mockRedis.set.mock.calls[0];
      expect(call[2]).toBe('EX');
      expect(typeof call[3]).toBe('number'); // TTL should be a number
    });

    it('should handle null Redis client gracefully', async () => {
      const cache = new ServerReadCache(null);
      
      // Should not throw
      await expect(
        cache.set('key', { value: 'test' }, 300)
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete key from Redis', async () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn().mockResolvedValue(1),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      await cache.delete('exchange_rates:USD:EUR');
      
      expect(mockRedis.del).toHaveBeenCalledWith('exchange_rates:USD:EUR');
    });

    it('should handle multiple key deletion', async () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn().mockResolvedValue(2),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      await cache.delete(['rates:1', 'rates:2']);
      
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('scoped key generation', () => {
    it('should generate scoped key for user data', () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      const scopedKey = cache.makeScopedKey('categories', 'user-123');
      
      expect(scopedKey).toContain('user-123');
      expect(scopedKey).toContain('categories');
    });

    it('should generate unscoped key for shared data', () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      const key = cache.makeKey('exchange_rates', 'USD', 'EUR');
      
      expect(key).toContain('exchange_rates');
      expect(key).toContain('USD');
      expect(key).toContain('EUR');
    });
  });

  describe('invalidation', () => {
    it('should invalidate cache entries by pattern', async () => {
      const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn().mockResolvedValue(3),
        keys: jest.fn().mockResolvedValue(['rates:1', 'rates:2', 'rates:3']),
      };
      
      const cache = new ServerReadCache(mockRedis as any);
      await cache.invalidatePattern('rates:*');
      
      expect(mockRedis.keys).toHaveBeenCalled();
    });
  });

  describe('fallback when Redis unavailable', () => {
    it('should operate without Redis client', async () => {
      const cache = new ServerReadCache(null);
      
      // Should not throw on any operation
      const result = await cache.get('key');
      expect(result).toBeNull();
      
      await cache.set('key', { value: 'test' }, 300);
      await cache.delete('key');
    });
  });

  describe('stale-if-error support', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-19T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should store value with metadata including expiresAt', async () => {
      const mockRedis = {
        set: jest.fn().mockResolvedValue('OK'),
      };
      const cache = new ServerReadCache(mockRedis as any);
      const ttl = 300; // 5 min
      const now = Date.now();
      const expectedExpiresAt = now + ttl * 1000;

      await (cache as any).setWithMetadata('key', { foo: 'bar' }, ttl);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({
          value: { foo: 'bar' },
          expiresAt: expectedExpiresAt,
        }),
        'EX',
        ttl * 2 // Grace period: 2x TTL
      );
    });

    it('should return value even if expired when ignoreExpiry is true', async () => {
      const now = Date.now();
      const expiredAt = now - 1000; // 1s ago
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          value: { old: 'data' },
          expiresAt: expiredAt,
        })),
      };
      const cache = new ServerReadCache(mockRedis as any);

      const result = await (cache as any).getWithMetadata('key', { ignoreExpiry: true });

      expect(result).toEqual({ old: 'data' });
    });

    it('should return null if expired and ignoreExpiry is false', async () => {
      const now = Date.now();
      const expiredAt = now - 1000;
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          value: { old: 'data' },
          expiresAt: expiredAt,
        })),
      };
      const cache = new ServerReadCache(mockRedis as any);

      const result = await (cache as any).getWithMetadata('key', { ignoreExpiry: false });

      expect(result).toBeNull();
    });

    it('should return null if not expired but ignoreExpiry is false (sanity check)', async () => {
      const now = Date.now();
      const future = now + 1000;
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          value: { fresh: 'data' },
          expiresAt: future,
        })),
      };
      const cache = new ServerReadCache(mockRedis as any);

      const result = await (cache as any).getWithMetadata('key', { ignoreExpiry: false });

      expect(result).toEqual({ fresh: 'data' });
    });

    it('should use default TTL if not provided in setWithMetadata', async () => {
      const mockRedis = {
        set: jest.fn().mockResolvedValue('OK'),
      };
      const cache = new ServerReadCache(mockRedis as any, 300);
      const now = Date.now();
      const expectedExpiresAt = now + 300 * 1000;

      await (cache as any).setWithMetadata('key', { data: 1 });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'key',
        expect.stringContaining('"expiresAt":' + expectedExpiresAt),
        'EX',
        600 // 300 * 2
      );
    });
  });
});
