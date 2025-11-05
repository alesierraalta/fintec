/**
 * Prompt Cache Manager
 * 
 * Gestiona el caché de prompts compuestos en Redis.
 * Optimiza el uso de tokens almacenando prompts compuestos para reutilización.
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { ComposedPrompt } from './types';
import { logger } from '@/lib/utils/logger';

/**
 * TTL para prompts compuestos (en segundos)
 * - Prompts estáticos (solo identity, capabilities, instructions): 1 hora
 * - Prompts con contexto dinámico: 5 minutos (el contexto cambia frecuentemente)
 */
const PROMPT_CACHE_TTL_STATIC_SEC = 60 * 60; // 1 hora
const PROMPT_CACHE_TTL_DYNAMIC_SEC = 5 * 60; // 5 minutos

/**
 * Genera una clave de caché para un prompt compuesto
 */
function generateCacheKey(
  userId: string,
  components: string[],
  contextHash?: string
): string {
  const componentsStr = components.sort().join(',');
  const hashStr = contextHash ? `:${contextHash}` : '';
  return `cache:prompt:${userId}:${componentsStr}${hashStr}`;
}

/**
 * Genera un hash simple del contexto para usar como parte de la clave de caché
 */
function generateContextHash(context: any): string {
  // Hash simple basado en propiedades clave del contexto
  const key = JSON.stringify({
    accounts: context?.accounts?.total || 0,
    transactions: context?.transactions?.recent?.length || 0,
    budgets: context?.budgets?.active?.length || 0,
    goals: context?.goals?.active?.length || 0,
  });
  
  // Hash simple (no criptográfico, solo para diferenciar)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Obtiene un prompt compuesto del caché
 */
export async function getCachedPrompt(
  userId: string,
  components: string[],
  context?: any
): Promise<ComposedPrompt | null> {
  const contextHash = context ? generateContextHash(context) : undefined;
  const key = generateCacheKey(userId, components, contextHash);

  // Redis es OBLIGATORIO para caché de prompts
  if (!isRedisConnected()) {
    logger.warn(`[PromptCache] Redis not available - cannot retrieve cached prompt for user ${userId}`);
    return null;
  }

  try {
    const client = getRedisClient();
    if (client) {
      const cached = await client.get(key);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          logger.debug(`[PromptCache] Cache HIT: Prompt for user ${userId}, components: ${components.join(', ')}`);
          return data as ComposedPrompt;
        } catch (error) {
          logger.warn(`[PromptCache] Failed to parse cached prompt for user ${userId}`);
          return null;
        }
      }
    }
  } catch (error) {
    logger.error('[PromptCache] Error retrieving prompt from Redis', error);
  }

  return null;
}

/**
 * Guarda un prompt compuesto en el caché
 */
export async function setCachedPrompt(
  userId: string,
  prompt: ComposedPrompt,
  context?: any
): Promise<void> {
  const contextHash = context ? generateContextHash(context) : undefined;
  const key = generateCacheKey(userId, prompt.components, contextHash);

  // Redis es OBLIGATORIO para caché de prompts
  if (!isRedisConnected()) {
    logger.warn(`[PromptCache] Redis not available - cannot save prompt for user ${userId}`);
    return;
  }

  try {
    const client = getRedisClient();
    if (client) {
      // Determinar TTL basado en si el prompt incluye contexto dinámico
      const hasDynamicContext = prompt.components.includes('context');
      const ttl = hasDynamicContext ? PROMPT_CACHE_TTL_DYNAMIC_SEC : PROMPT_CACHE_TTL_STATIC_SEC;

      const serialized = JSON.stringify(prompt);
      await client.setex(key, ttl, serialized);
      logger.debug(`[PromptCache] Cache WRITE: Prompt for user ${userId}, components: ${prompt.components.join(', ')}, TTL: ${ttl}s`);
    }
  } catch (error) {
    logger.error('[PromptCache] Error saving prompt to Redis', error);
  }
}

/**
 * Invalida el caché de prompts para un usuario
 */
export async function invalidatePromptCache(userId: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = getRedisClient();
    if (client) {
      // Eliminar todas las claves de prompt para este usuario
      const pattern = `cache:prompt:${userId}:*`;
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(...keys);
        logger.debug(`[PromptCache] Cache INVALIDATE: ${keys.length} prompts for user ${userId}`);
      }
    }
  } catch (error) {
    logger.error('[PromptCache] Error invalidating prompt cache in Redis', error);
  }
}

/**
 * Obtiene métricas de uso de prompts desde el caché
 */
export async function getPromptMetrics(userId: string): Promise<{
  cachedPrompts: number;
  totalTokens: number;
  averageTokens: number;
}> {
  if (!isRedisConnected()) {
    return { cachedPrompts: 0, totalTokens: 0, averageTokens: 0 };
  }

  try {
    const client = getRedisClient();
    if (client) {
      const pattern = `cache:prompt:${userId}:*`;
      const keys = await client.keys(pattern);
      
      let totalTokens = 0;
      let promptCount = 0;

      for (const key of keys) {
        const cached = await client.get(key);
        if (cached) {
          try {
            const prompt: ComposedPrompt = JSON.parse(cached);
            totalTokens += prompt.estimatedTokens || 0;
            promptCount++;
          } catch {
            // Ignorar errores de parsing
          }
        }
      }

      return {
        cachedPrompts: promptCount,
        totalTokens,
        averageTokens: promptCount > 0 ? Math.round(totalTokens / promptCount) : 0,
      };
    }
  } catch (error) {
    logger.error('[PromptCache] Error getting prompt metrics from Redis', error);
  }

  return { cachedPrompts: 0, totalTokens: 0, averageTokens: 0 };
}

