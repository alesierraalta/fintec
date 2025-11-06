/**
 * Embedder - Genera embeddings usando OpenAI
 * 
 * Patrón: Service Layer
 * Principio SOLID: Single Responsibility (S)
 * Docs: https://platform.openai.com/docs/guides/embeddings
 * 
 * MCP usado: serena find_symbol para analizar uso de OpenAI en config.ts
 */

import { openai } from '../config';
import { logger } from '@/lib/utils/logger';
import { getCachedEmbedding, setCachedEmbedding } from './embedding-cache';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

/**
 * Genera embedding para un texto usando OpenAI
 */
/**
 * Genera embedding para un texto usando OpenAI
 * Implementa caché para reducir llamadas a la API
 * 
 * @param text - Texto para generar embedding
 * @returns Embedding result con el vector y modelo usado
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Normalizar y verificar caché primero
    const normalizedText = text.trim();
    
    // Intentar obtener del caché
    const cachedEmbedding = await getCachedEmbedding(normalizedText);
    if (cachedEmbedding) {
      logger.debug(`[generateEmbedding] Using cached embedding for text: "${normalizedText.substring(0, 50)}..."`);
      return {
        embedding: cachedEmbedding,
        model: EMBEDDING_MODEL,
      };
    }

    // Cache miss: generar embedding con OpenAI
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalizedText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0].embedding;
    
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length || 0}`);
    }

    // Guardar en caché para futuras consultas
    await setCachedEmbedding(normalizedText, embedding, 24 * 60 * 60); // 24 horas
    
    logger.debug(`[generateEmbedding] Generated and cached embedding for text: "${normalizedText.substring(0, 50)}..."`);

    return {
      embedding,
      model: EMBEDDING_MODEL,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[generateEmbedding] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${errorMessage}`);
  }
}

/**
 * Genera embeddings en batch (útil para indexación masiva)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.trim()),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => ({
      embedding: item.embedding,
      model: EMBEDDING_MODEL,
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[generateEmbeddingsBatch] Error generating embeddings batch:', error);
    throw new Error(`Failed to generate embeddings batch: ${errorMessage}`);
  }
}

