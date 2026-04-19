import type { Redis } from 'ioredis';

/**
 * ServerReadCache wraps a Redis client for safe, scoped read-path caching.
 * Provides TTL management, scoped key generation, and graceful fallback when Redis is unavailable.
 */
export class ServerReadCache {
  private client: Redis | null;
  private defaultTTLSeconds: number = 300; // 5 minutes

  constructor(client: Redis | null, defaultTTLSeconds: number = 300) {
    this.client = client;
    this.defaultTTLSeconds = defaultTTLSeconds;
  }

  /**
   * Retrieve a cached value from Redis
   * Returns null if not found or if Redis is unavailable
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      // Log but don't throw; cache is optional
      console.error('[ServerReadCache.get] Error retrieving cache:', error);
      return null;
    }
  }

  /**
   * Store a value in Redis with TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    if (!this.client) {
      return; // No-op if Redis unavailable
    }

    try {
      const ttl = ttlSeconds ?? this.defaultTTLSeconds;
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      // Log but don't throw; cache is optional
      console.error('[ServerReadCache.set] Error setting cache:', error);
    }
  }

  /**
   * Delete a key or multiple keys from Redis
   */
  async delete(keys: string | string[]): Promise<void> {
    if (!this.client) {
      return; // No-op if Redis unavailable
    }

    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      if (keyArray.length > 0) {
        await this.client.del(...keyArray);
      }
    } catch (error) {
      // Log but don't throw; cache is optional
      console.error('[ServerReadCache.delete] Error deleting cache:', error);
    }
  }

  /**
   * Generate a scoped cache key for user-specific data
   * Format: scope:userId:...rest
   */
  makeScopedKey(scope: string, userId: string, ...rest: string[]): string {
    return `${scope}:${userId}${rest.length > 0 ? ':' + rest.join(':') : ''}`;
  }

  /**
   * Generate an unscoped cache key for shared data
   * Format: scope:...args
   */
  makeKey(scope: string, ...args: string[]): string {
    return `${scope}${args.length > 0 ? ':' + args.join(':') : ''}`;
  }

  /**
   * Invalidate all cache entries matching a pattern
   * WARNING: This uses KEYS which is O(N); only use during migrations or rare events
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Use KEYS to find matching keys (careful with large datasets)
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('[ServerReadCache.invalidatePattern] Error:', error);
    }
  }

  /**
   * Check if Redis is connected and available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Retrieve cached value with metadata (for stale-if-error)
   */
  async getWithMetadata<T = any>(
    key: string,
    options: { ignoreExpiry?: boolean } = {}
  ): Promise<T | null> {
    if (!this.client) return null;

    try {
      const raw = await this.client.get(key);
      if (!raw) return null;

      const data = JSON.parse(raw) as { value: T; expiresAt: number };
      
      // If we don't care about expiry (stale-if-error), return value
      if (options.ignoreExpiry) {
        return data.value;
      }

      // Check if actually expired
      if (Date.now() > data.expiresAt) {
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('[ServerReadCache.getWithMetadata] Error:', error);
      return null;
    }
  }

  /**
   * Store value with metadata (for stale-if-error)
   * Redis TTL is set to 2x requested TTL to allow for grace period
   */
  async setWithMetadata<T = any>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    if (!this.client) return;

    try {
      const ttl = ttlSeconds ?? this.defaultTTLSeconds;
      const expiresAt = Date.now() + ttl * 1000;
      
      const data = {
        value,
        expiresAt,
      };

      // Set physical TTL in Redis to 2x logical TTL for grace period
      await this.client.set(key, JSON.stringify(data), 'EX', ttl * 2);
    } catch (error) {
      console.error('[ServerReadCache.setWithMetadata] Error:', error);
    }
  }

  /**
   * Helper to set physical TTL to 2x logical TTL for any key
   * Use this to upgrade existing cache entries or manually manage grace periods
   */
  async setWithGrace<T = any>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    return this.setWithMetadata(key, value, ttlSeconds);
  }
}
