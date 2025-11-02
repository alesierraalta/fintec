/**
 * Rate Limiter for AI Chat API
 * 
 * Implementa rate limiting con sliding window algorithm usando Redis.
 * Fallback a in-memory Map si Redis no está disponible.
 * 
 * Límite: 10 requests/minuto por usuario premium
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // timestamp en ms
}

// In-memory fallback: Map<userId, Array<timestamp>>
const inMemoryLimits = new Map<string, number[]>();
const IN_MEMORY_CLEANUP_INTERVAL = 60 * 1000; // Limpiar cada minuto

// Límites configurables
const LIMIT_PER_MINUTE = 10;
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_WINDOW_ENTRIES = 100; // Por usuario

// Limpiar entradas expiradas en memoria cada minuto
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of inMemoryLimits.entries()) {
    const validTimestamps = timestamps.filter(ts => now - ts < WINDOW_MS);
    if (validTimestamps.length === 0) {
      inMemoryLimits.delete(userId);
    } else {
      inMemoryLimits.set(userId, validTimestamps);
    }
  }
}, IN_MEMORY_CLEANUP_INTERVAL);

/**
 * Verifica si el usuario está dentro del rate limit
 * Usa Redis si está disponible, fallback a in-memory
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `ratelimit:ai:chat:${userId}`;
  
  if (isRedisConnected()) {
    return checkRateLimitRedis(key, now);
  } else {
    return checkRateLimitInMemory(userId, now);
  }
}

/**
 * Verificar rate limit usando Redis
 */
async function checkRateLimitRedis(key: string, now: number): Promise<RateLimitResult> {
  const client = getRedisClient();
  if (!client) {
    // Fallback a in-memory si Redis está disponible pero falla
    return checkRateLimitInMemory(key.split(':')[3], now);
  }

  try {
    // Usar Redis sorted set para sliding window
    const windowStart = now - WINDOW_MS;
    
    // Remover timestamps fuera del window
    await client.zremrangebyscore(key, '-inf', windowStart);
    
    // Contar requests en el window actual
    const count = await client.zcard(key);
    
    if (count >= LIMIT_PER_MINUTE) {
      // Rate limit excedido
      const oldestScore = await client.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestScore.length >= 2 ? parseInt(oldestScore[1]) + WINDOW_MS : now + WINDOW_MS;
      
      logger.warn(`Rate limit exceeded for user: ${key.split(':')[3]}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }
    
    // Agregar nuevo request
    await client.zadd(key, now, `${now}-${Math.random()}`);
    
    // Establecer TTL para limpiar automáticamente después del window
    await client.expire(key, Math.ceil(WINDOW_MS / 1000));
    
    const remaining = LIMIT_PER_MINUTE - count - 1;
    const resetAt = now + WINDOW_MS;
    
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetAt,
    };
  } catch (error) {
    logger.error('Rate limiter Redis error, falling back to in-memory', error);
    // Fallback a in-memory en caso de error
    const userId = key.split(':')[3];
    return checkRateLimitInMemory(userId, now);
  }
}

/**
 * Verificar rate limit usando in-memory Map (fallback)
 */
function checkRateLimitInMemory(userId: string, now: number): RateLimitResult {
  const windowStart = now - WINDOW_MS;
  
  // Obtener o crear lista de timestamps para el usuario
  let timestamps = inMemoryLimits.get(userId) || [];
  
  // Remover timestamps fuera del window
  timestamps = timestamps.filter(ts => ts > windowStart);
  
  if (timestamps.length >= LIMIT_PER_MINUTE) {
    // Rate limit excedido
    const oldestTimestamp = timestamps[0];
    const resetAt = oldestTimestamp + WINDOW_MS;
    
    logger.warn(`Rate limit exceeded for user (in-memory): ${userId}`);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
  
  // Agregar nuevo request
  timestamps.push(now);
  
  // Limitar tamaño máximo en memoria por usuario
  if (timestamps.length > MAX_WINDOW_ENTRIES) {
    timestamps = timestamps.slice(-MAX_WINDOW_ENTRIES);
  }
  
  inMemoryLimits.set(userId, timestamps);
  
  const remaining = LIMIT_PER_MINUTE - timestamps.length;
  const resetAt = now + WINDOW_MS;
  
  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    resetAt,
  };
}

/**
 * Reset rate limit para un usuario (admin/testing)
 */
export async function resetRateLimit(userId: string): Promise<void> {
  const key = `ratelimit:ai:chat:${userId}`;
  
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        await client.del(key);
        logger.info(`Rate limit reset for user: ${userId}`);
      } catch (error) {
        logger.error('Error resetting rate limit in Redis', error);
      }
    }
  }
  
  inMemoryLimits.delete(userId);
  logger.info(`Rate limit reset for user (in-memory): ${userId}`);
}
