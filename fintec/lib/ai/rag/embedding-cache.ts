/**
 * Embedding Cache - Caché de embeddings para reducir llamadas a OpenAI API
 * 
 * Patrón: Service Layer
 * Principio SOLID: Single Responsibility (S)
 * 
 * Cachea embeddings generados por OpenAI para queries similares.
 * Reduce costos de API y mejora latencia para queries repetidas.
 * 
 * MCP usado: serena para analizar patrones de cache-manager.ts
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // timestamp en ms
}

// In-memory cache fallback
const inMemoryCache = new Map<string, CacheEntry<number[]>>();

// Limpiar entradas expiradas cada hora
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
}, 60 * 60 * 1000); // Cada hora

/**
 * TTL para embeddings cacheados: 24 horas (86400 segundos)
 * Los embeddings son estables para el mismo texto, así que podemos cachear por más tiempo
 */
const EMBEDDING_CACHE_TTL_SEC = 24 * 60 * 60; // 24 horas

/**
 * Normaliza una query para usar como key de caché
 * - Convierte a lowercase
 * - Elimina espacios extra
 * - Trim
 * 
 * @param query - Query original
 * @returns Query normalizada
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Reemplazar múltiples espacios con uno solo
}

/**
 * Genera un hash SHA-256 de la query normalizada para usar como key
 * 
 * @param normalizedQuery - Query normalizada
 * @returns Hash hexadecimal de la query
 */
function hashQuery(normalizedQuery: string): string {
  return createHash('sha256').update(normalizedQuery).digest('hex');
}

/**
 * Obtiene un embedding cacheado para una query
 * 
 * @param query - Query original (será normalizada y hasheada)
 * @returns Embedding cacheado o null si no existe o expiró
 */
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

  // Fallback in-memory
  return getFromInMemoryCache(key);
}

/**
 * Guarda un embedding en caché
 * 
 * @param query - Query original (será normalizada y hasheada)
 * @param embedding - Embedding a cachear
 * @param ttlSeconds - TTL en segundos (opcional, default 24 horas)
 */
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

  // Fallback in-memory
  setToInMemoryCache(key, embedding, ttlSeconds);
}

/**
 * Invalida el caché de embedding para una query específica
 * Útil cuando se necesita forzar regeneración
 * 
 * @param query - Query original
 */
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

/**
 * Helper: Obtener del caché in-memory
 */
function getFromInMemoryCache(key: string): number[] | null {
  const entry = inMemoryCache.get(key) as CacheEntry<number[]> | undefined;

  if (!entry) {
    return null;
  }

  // Verificar si expiró
  if (Date.now() >= entry.expiresAt) {
    inMemoryCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Helper: Guardar en caché in-memory
 */
function setToInMemoryCache(key: string, data: number[], ttlSeconds: number): void {
  inMemoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
