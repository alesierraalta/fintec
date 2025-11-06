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

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

/**
 * Genera embedding para un texto usando OpenAI
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0].embedding;
    
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length || 0}`);
    }

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

