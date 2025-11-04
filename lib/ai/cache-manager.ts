/**
 * Cache Manager for AI Chat
 * 
 * Caché de contexto de billetera (TTL 5 minutos) y conversaciones (TTL 30 minutos).
 * Usa Redis si está disponible, fallback a in-memory Map.
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { WalletContext } from './context-builder';
import { ChatMessage } from './chat-assistant';
import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // timestamp en ms
}

// In-memory cache fallback
const inMemoryCache = new Map<string, CacheEntry<any>>();

// Limpiar entradas expiradas cada 5 minutos
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
    logger.debug(`Cache: Cleaned up ${keysToDelete.length} expired entries`);
  }
}, 5 * 60 * 1000);

/**
 * Cache TTLs en segundos (Redis requiere segundos)
 */
const CONTEXT_CACHE_TTL_SEC = 5 * 60; // 5 minutos
const CONVERSATION_CACHE_TTL_SEC = 30 * 60; // 30 minutos
const PENDING_ACTION_CACHE_TTL_SEC = 10 * 60; // 10 minutos (más largo para dar tiempo al usuario a confirmar)

/**
 * Obtiene contexto cacheado
 */
export async function getCachedContext(userId: string): Promise<WalletContext | null> {
  const key = `cache:context:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const cached = await client.getex(key);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            logger.debug(`Cache HIT: Context for user ${userId}`);
            return data;
          } catch {
            logger.warn(`Cache: Failed to parse cached context for user ${userId}`);
            return null;
          }
        }
      }
    } catch (error) {
      logger.error('Cache: Error retrieving context from Redis', error);
    }
  }

  // Fallback in-memory
  return getFromInMemoryCache(key);
}

/**
 * Guarda contexto en caché
 */
export async function setCachedContext(userId: string, context: WalletContext): Promise<void> {
  const key = `cache:context:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(context);
        await client.setex(key, CONTEXT_CACHE_TTL_SEC, serialized);
        logger.debug(`Cache WRITE: Context for user ${userId}`);
        return;
      }
    } catch (error) {
      logger.error('Cache: Error saving context to Redis', error);
    }
  }

  // Fallback in-memory
  setToInMemoryCache(key, context, CONTEXT_CACHE_TTL_SEC);
}

/**
 * Obtiene conversación cacheada (últimos 10 mensajes)
 */
export async function getCachedConversation(userId: string, sessionId: string): Promise<ChatMessage[] | null> {
  const key = `cache:conversation:${userId}:${sessionId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const cached = await client.getex(key);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            logger.debug(`Cache HIT: Conversation for user ${userId}, session ${sessionId}`);
            return data;
          } catch {
            logger.warn(`Cache: Failed to parse cached conversation for user ${userId}`);
            return null;
          }
        }
      }
    } catch (error) {
      logger.error('Cache: Error retrieving conversation from Redis', error);
    }
  }

  // Fallback in-memory
  return getFromInMemoryCache(key);
}

/**
 * Guarda conversación en caché (últimos 10 mensajes)
 */
export async function setCachedConversation(
  userId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  // Solo guardar últimos 10 mensajes para no usar demasiada memoria
  const recentMessages = messages.slice(-10);
  const key = `cache:conversation:${userId}:${sessionId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(recentMessages);
        await client.setex(key, CONVERSATION_CACHE_TTL_SEC, serialized);
        logger.debug(`Cache WRITE: Conversation for user ${userId}, session ${sessionId}`);
        return;
      }
    } catch (error) {
      logger.error('Cache: Error saving conversation to Redis', error);
    }
  }

  // Fallback in-memory
  setToInMemoryCache(key, recentMessages, CONVERSATION_CACHE_TTL_SEC);
}

/**
 * Invalida caché de contexto (cuando hay cambios)
 */
export async function invalidateContextCache(userId: string): Promise<void> {
  const key = `cache:context:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.del(key);
        logger.debug(`Cache INVALIDATE: Context for user ${userId}`);
      }
    } catch (error) {
      logger.error('Cache: Error invalidating context in Redis', error);
    }
  }

  inMemoryCache.delete(key);
}

/**
 * Invalida caché de conversación
 */
export async function invalidateConversationCache(userId: string, sessionId: string): Promise<void> {
  const key = `cache:conversation:${userId}:${sessionId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.del(key);
        logger.debug(`Cache INVALIDATE: Conversation for user ${userId}, session ${sessionId}`);
      }
    } catch (error) {
      logger.error('Cache: Error invalidating conversation in Redis', error);
    }
  }

  inMemoryCache.delete(key);
}

/**
 * Interfaz para acción pendiente en caché
 */
export interface PendingAction {
  type: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

/**
 * Obtiene acción pendiente de confirmación
 */
/**
 * Obtiene una acción pendiente de confirmación del caché
 * @param userId - ID del usuario
 * @returns La acción pendiente o null si no existe o expiró
 */

export async function getCachedPendingAction(userId: string): Promise<PendingAction | null> {
  const key = `cache:pending-action:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const cached = await client.getex(key);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            logger.debug(`Cache HIT: Pending action for user ${userId}`);
            return data;
          } catch {
            logger.warn(`Cache: Failed to parse cached pending action for user ${userId}`);
            return null;
          }
        }
      }
    } catch (error) {
      logger.error('Cache: Error retrieving pending action from Redis', error);
    }
  }

  // Fallback in-memory
  return getFromInMemoryCache(key);
}

/**
 * Guarda acción pendiente en caché
 */
/**
 * Guarda una acción pendiente de confirmación en el caché
 * @param userId - ID del usuario
 * @param action - La acción pendiente a guardar
 */

export async function setCachedPendingAction(userId: string, action: PendingAction): Promise<void> {
  const key = `cache:pending-action:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(action);
        await client.setex(key, PENDING_ACTION_CACHE_TTL_SEC, serialized);
        logger.debug(`Cache WRITE: Pending action for user ${userId}`);
        return;
      }
    } catch (error) {
      logger.error('Cache: Error saving pending action to Redis', error);
    }
  }

  // Fallback in-memory
  setToInMemoryCache(key, action, PENDING_ACTION_CACHE_TTL_SEC);
}

/**
 * Invalida caché de acción pendiente (después de confirmar/rechazar)
 */
/**
 * Invalida el caché de acción pendiente (después de confirmar o rechazar)
 * @param userId - ID del usuario
 */

export async function invalidatePendingActionCache(userId: string): Promise<void> {
  const key = `cache:pending-action:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.del(key);
        logger.debug(`Cache INVALIDATE: Pending action for user ${userId}`);
      }
    } catch (error) {
      logger.error('Cache: Error invalidating pending action in Redis', error);
    }
  }

  inMemoryCache.delete(key);
}

/**
 * Helper: Obtener del caché in-memory
 */
function getFromInMemoryCache<T>(key: string): T | null {
  const entry = inMemoryCache.get(key) as CacheEntry<T> | undefined;

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
function setToInMemoryCache<T>(key: string, data: T, ttlSeconds: number): void {
  inMemoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
