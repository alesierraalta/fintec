/**
 * Cache Manager for AI Chat
 * 
 * Caché de contexto de billetera (TTL 5 minutos) y conversaciones (TTL 30 minutos).
 * Usa Redis si está disponible, fallback a in-memory Map.
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { WalletContext } from './context-builder';
import { ChatMessage } from './chat/chat-handler';
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
const QUERY_HISTORY_CACHE_TTL_SEC = 15 * 60; // 15 minutos para historial de consultas (suficiente para correcciones)

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
 * Obtiene conversación cacheada (últimos 20 mensajes)
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
 * Guarda conversación en caché (últimos 20 mensajes)
 */
export async function setCachedConversation(
  userId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  // Solo guardar últimos 20 mensajes para mantener contexto completo pero optimizar memoria
  const recentMessages = messages.slice(-20);
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
 * Interfaz para historial de consulta
 */
export interface QueryHistoryEntry {
  actionType: string;
  parameters: Record<string, any>;
  timestamp: number;
  message: string; // Mensaje original del usuario
}

/**
 * Obtiene el historial de consultas recientes del usuario desde Redis
 * Usado para manejar correcciones y contexto conversacional
 * @param userId - ID del usuario
 * @returns El historial de consultas o null si no existe
 */
export async function getCachedQueryHistory(userId: string): Promise<QueryHistoryEntry[] | null> {
  const key = `cache:query-history:${userId}`;

  // Redis es OBLIGATORIO para contexto conversacional
  if (!isRedisConnected()) {
    logger.warn(`Cache: Redis not available - cannot retrieve query history for user ${userId}`);
    return null;
  }

  try {
    const client = getRedisClient();
    if (client) {
      const cached = await client.get(key);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          logger.debug(`Cache HIT: Query history for user ${userId}, ${data.length} entries`);
          return data;
        } catch {
          logger.warn(`Cache: Failed to parse cached query history for user ${userId}`);
          return null;
        }
      }
    }
  } catch (error) {
    logger.error('Cache: Error retrieving query history from Redis', error);
  }

  return null;
}

/**
 * Guarda una entrada en el historial de consultas del usuario en Redis
 * Mantiene solo las últimas 5 consultas para eficiencia
 * @param userId - ID del usuario
 * @param entry - La entrada de historial a guardar
 */
export async function setCachedQueryHistory(userId: string, entry: QueryHistoryEntry): Promise<void> {
  const key = `cache:query-history:${userId}`;

  // Redis es OBLIGATORIO para contexto conversacional
  if (!isRedisConnected()) {
    logger.warn(`Cache: Redis not available - cannot save query history for user ${userId}`);
    return;
  }

  try {
    const client = getRedisClient();
    if (client) {
      // Obtener historial existente
      const existingHistory = await getCachedQueryHistory(userId) || [];
      
      // Agregar nueva entrada
      const updatedHistory = [...existingHistory, entry];
      
      // Mantener solo las últimas 5 consultas para eficiencia
      const recentHistory = updatedHistory.slice(-5);
      
      const serialized = JSON.stringify(recentHistory);
      await client.setex(key, QUERY_HISTORY_CACHE_TTL_SEC, serialized);
      logger.debug(`Cache WRITE: Query history for user ${userId}, ${recentHistory.length} entries`);
      return;
    }
  } catch (error) {
    logger.error('Cache: Error saving query history to Redis', error);
  }
}

/**
 * Obtiene la última consulta del usuario desde Redis
 * Útil para manejar correcciones
 * @param userId - ID del usuario
 * @returns La última consulta o null si no existe
 */
export async function getLastCachedQuery(userId: string): Promise<QueryHistoryEntry | null> {
  const history = await getCachedQueryHistory(userId);
  if (!history || history.length === 0) {
    return null;
  }
  // Retornar la más reciente (última del array)
  return history[history.length - 1];
}

/**
 * Invalida el historial de consultas del usuario
 * @param userId - ID del usuario
 */
export async function invalidateQueryHistoryCache(userId: string): Promise<void> {
  const key = `cache:query-history:${userId}`;

  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      if (client) {
        await client.del(key);
        logger.debug(`Cache INVALIDATE: Query history for user ${userId}`);
      }
    } catch (error) {
      logger.error('Cache: Error invalidating query history in Redis', error);
    }
  }
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
