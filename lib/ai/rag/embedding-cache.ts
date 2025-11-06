/**
 * Embedding Cache - Caché de embeddings para reducir llamadas a OpenAI API
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const inMemoryCache = new Map<string, CacheEntry<number[]>>();

setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  for (const [key, entry] of inMemoryCache.entries()) {
    if (now >= entry.expiresAt) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => inMemoryCache.delete(key));
  if (keysToDelete.length > 0) {
    logger.debug(`[embedding-cache] Cleaned up ${keysToDelete.length} expired entries`);
  }
}, 60 * 60 * 1000);

const EMBEDDING_CACHE_TTL_SEC = 24 * 60 * 60;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function hashQuery(normalizedQuery: string): string {
  return createHash('sha256').update(normalizedQuery).digest('hex');
}

export async function getCachedEmbedding(query: string): Promise<number[] | null> {
  const normalizedQuery = normalizeQuery(query);
  const queryHash = hashQuery(normalizedQuery);
  const key = `cache:embedding:${queryHash}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const cached = await client.get(key);
        if (cached) {
          try {
            const data = JSON.parse(cached) as number[];
            logger.debug(`[embedding-cache] Cache HIT for query: "${normalizedQuery.substring(0, 50)}..."`);
            return data;
          } catch {
            logger.warn(`[embedding-cache] Failed to parse cached embedding for query hash: ${queryHash}`);
            return null;
          }
        }
      }
    } catch (error) {
      logger.error('[embedding-cache] Error retrieving embedding from Redis', error);
    }
  }

  return getFromInMemoryCache(key);
}

export async function setCachedEmbedding(
  query: string,
  embedding: number[],
  ttlSeconds: number = EMBEDDING_CACHE_TTL_SEC
): Promise<void> {
  const normalizedQuery = normalizeQuery(query);
  const queryHash = hashQuery(normalizedQuery);
  const key = `cache:embedding:${queryHash}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(embedding);
        await client.setex(key, ttlSeconds, serialized);
        logger.debug(`[embedding-cache] Cache WRITE for query: "${normalizedQuery.substring(0, 50)}..."`);
        return;
      }
    } catch (error) {
      logger.error('[embedding-cache] Error saving embedding to Redis', error);
    }
  }

  setToInMemoryCache(key, embedding, ttlSeconds);
}

export async function invalidateEmbeddingCache(query: string): Promise<void> {
  const normalizedQuery = normalizeQuery(query);
  const queryHash = hashQuery(normalizedQuery);
  const key = `cache:embedding:${queryHash}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.del(key);
        logger.debug(`[embedding-cache] Cache INVALIDATE for query: "${normalizedQuery.substring(0, 50)}..."`);
      }
    } catch (error) {
      logger.error('[embedding-cache] Error invalidating embedding in Redis', error);
    }
  }

  inMemoryCache.delete(key);
}

function getFromInMemoryCache(key: string): number[] | null {
  const entry = inMemoryCache.get(key) as CacheEntry<number[]> | undefined;
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    inMemoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setToInMemoryCache(key: string, data: number[], ttlSeconds: number): void {
  inMemoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
