/**
 * Short-term Memory - Gestión mejorada de memoria a corto plazo
 * 
 * Extiende el sistema de caché existente con funcionalidades mejoradas:
 * - Compresión de mensajes antiguos
 * - Cache de recuperaciones semánticas
 * - TTL inteligente basado en actividad
 */

import { getRedisClient, isRedisConnected } from '@/lib/redis/client';
import { logger } from '@/lib/utils/logger';
import { ChatMessage } from '../chat/chat-handler';
import { openai, getTemperatureConfig } from '../config';

const MAX_MESSAGES_PER_SESSION = 50;
const COMPRESSION_THRESHOLD = 30; // Comprimir cuando hay más de 30 mensajes
const SEMANTIC_CACHE_TTL_SEC = 60 * 60; // 1 hora para cache semántico
const SESSION_TTL_SEC = 30 * 60; // 30 minutos para sesiones activas

/**
 * Almacena conversación en memoria a corto plazo con compresión inteligente
 */
export async function storeShortTermConversation(
  userId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    // Limitar a últimos N mensajes
    const recentMessages = messages.slice(-MAX_MESSAGES_PER_SESSION);

    // Si hay muchos mensajes, comprimir los antiguos
    let messagesToStore = recentMessages;
    if (recentMessages.length > COMPRESSION_THRESHOLD) {
      messagesToStore = await compressOldMessages(recentMessages);
    }

    const key = `cache:conversation:${userId}:${sessionId}`;

    if (isRedisConnected()) {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(messagesToStore);
        await client.setex(key, SESSION_TTL_SEC, serialized);
        logger.debug(`[short-term-memory] Stored ${messagesToStore.length} messages for session ${sessionId}`);
        return;
      }
    }

    // Fallback in-memory (usar el sistema existente)
    // Esto se manejaría en cache-manager.ts
    logger.warn('[short-term-memory] Redis not available, using fallback');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[short-term-memory] Error storing conversation:', error);
    throw new Error(`Failed to store conversation: ${errorMessage}`);
  }
}

/**
 * Comprime mensajes antiguos usando summarization
 */
async function compressOldMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
  try {
    // Mantener los últimos N mensajes sin comprimir
    const keepRecent = 20;
    const recentMessages = messages.slice(-keepRecent);
    const oldMessages = messages.slice(0, messages.length - keepRecent);

    if (oldMessages.length === 0) {
      return recentMessages;
    }

    // Crear un resumen de los mensajes antiguos
    const summaryContent = await summarizeMessages(oldMessages);

    // Crear mensaje de sistema con el resumen
    const summaryMessage: ChatMessage = {
      role: 'system',
      content: `[Resumen de conversación anterior: ${summaryContent}]`,
    };

    return [summaryMessage, ...recentMessages];
  } catch (error) {
    logger.warn('[short-term-memory] Failed to compress messages, keeping all:', error);
    return messages;
  }
}

/**
 * Resume mensajes usando LLM
 */
async function summarizeMessages(messages: ChatMessage[]): Promise<string> {
  try {
    const { openai } = await import('../config');
    
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')
      .substring(0, 2000); // Limitar tamaño

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'Resume esta conversación en 2-3 oraciones, enfocándote en los puntos clave.',
        },
        {
          role: 'user',
          content: conversationText,
        },
      ],
      ...getTemperatureConfig(),
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || 'Conversación anterior';
  } catch (error) {
    logger.warn('[short-term-memory] Failed to summarize, using fallback:', error);
    return `Conversación con ${messages.length} mensajes anteriores`;
  }
}

/**
 * Cachea resultados de búsqueda semántica
 */
export async function cacheSemanticSearch(
  userId: string,
  query: string,
  results: any[]
): Promise<void> {
  try {
    const key = `cache:semantic:${userId}:${hashQuery(query)}`;

    if (isRedisConnected()) {
      const client = getRedisClient();
      if (client) {
        const serialized = JSON.stringify(results);
        await client.setex(key, SEMANTIC_CACHE_TTL_SEC, serialized);
        logger.debug(`[short-term-memory] Cached semantic search for query: "${query.substring(0, 50)}..."`);
      }
    }
  } catch (error) {
    logger.warn('[short-term-memory] Failed to cache semantic search:', error);
  }
}

/**
 * Obtiene resultados de búsqueda semántica del cache
 */
export async function getCachedSemanticSearch(
  userId: string,
  query: string
): Promise<any[] | null> {
  try {
    const key = `cache:semantic:${userId}:${hashQuery(query)}`;

    if (isRedisConnected()) {
      const client = getRedisClient();
      if (client) {
        const cached = await client.get(key);
        if (cached) {
          try {
            const results = JSON.parse(cached);
            logger.debug(`[short-term-memory] Cache HIT for semantic search: "${query.substring(0, 50)}..."`);
            return results;
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  } catch (error) {
    logger.warn('[short-term-memory] Failed to get cached semantic search:', error);
    return null;
  }
}

/**
 * Hash simple para queries
 */
function hashQuery(query: string): string {
  // Hash simple basado en el contenido
  let hash = 0;
  const normalized = query.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

