/**
 * Memory Consolidator - Consolidación de memorias similares
 * 
 * Identifica y consolida memorias similares para evitar duplicados
 * y mantener la base de conocimiento limpia y organizada.
 */

import { logger } from '@/lib/utils/logger';
import { getAllMemories, updateMemory, deleteMemory, SemanticMemory } from './semantic-memory';
import { generateEmbedding } from '../rag/embedder';

const SIMILARITY_THRESHOLD = 0.85; // Umbral para considerar memorias similares
const MIN_IMPORTANCE_FOR_CONSOLIDATION = 0.3;

/**
 * Consolida memorias similares para un usuario
 */
export async function consolidateUserMemories(
  userId: string,
  memoryType?: 'preference' | 'fact' | 'pattern' | 'rule'
): Promise<{
  consolidated: number;
  deleted: number;
}> {
  try {
    // Obtener todas las memorias del usuario (o del tipo específico)
    const allMemories = await getAllMemories(userId, 1000);
    
    let memoriesToProcess = allMemories;
    if (memoryType) {
      memoriesToProcess = allMemories.filter(m => m.memoryType === memoryType);
    }

    if (memoriesToProcess.length < 2) {
      return { consolidated: 0, deleted: 0 };
    }

    // Agrupar por tipo de memoria
    const memoriesByType = new Map<string, SemanticMemory[]>();
    memoriesToProcess.forEach(mem => {
      const key = mem.memoryType;
      if (!memoriesByType.has(key)) {
        memoriesByType.set(key, []);
      }
      memoriesByType.get(key)!.push(mem);
    });

    let consolidated = 0;
    let deleted = 0;

    // Procesar cada grupo de tipo
    for (const [type, memories] of memoriesByType.entries()) {
      if (memories.length < 2) continue;

      // Ordenar por importancia (mantener las más importantes)
      memories.sort((a, b) => b.importanceScore - a.importanceScore);

      // Comparar cada par de memorias
      const processed = new Set<string>();
      
      for (let i = 0; i < memories.length; i++) {
        if (processed.has(memories[i].id)) continue;

        const memory1 = memories[i];
        let bestMatch: { memory: SemanticMemory; similarity: number } | null = null;

        // Buscar memorias similares
        for (let j = i + 1; j < memories.length; j++) {
          if (processed.has(memories[j].id)) continue;

          const memory2 = memories[j];
          const similarity = await calculateSimilarity(memory1, memory2);

          if (similarity >= SIMILARITY_THRESHOLD) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = { memory: memory2, similarity };
            }
          }
        }

        // Si encontramos una memoria similar, consolidar
        if (bestMatch) {
          await consolidateMemories(memory1, bestMatch.memory, userId);
          processed.add(memory1.id);
          processed.add(bestMatch.memory.id);
          consolidated++;
          deleted++;
        }
      }
    }

    logger.info(`[memory-consolidator] Consolidated ${consolidated} pairs, deleted ${deleted} duplicates for user ${userId}`);
    return { consolidated, deleted };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[memory-consolidator] Error consolidating memories:', error);
    return { consolidated: 0, deleted: 0 };
  }
}

/**
 * Calcula la similitud entre dos memorias usando embeddings
 */
async function calculateSimilarity(
  memory1: SemanticMemory,
  memory2: SemanticMemory
): Promise<number> {
  try {
    // Si ambas tienen embeddings, usar cosine similarity
    if (memory1.embedding && memory2.embedding) {
      return cosineSimilarity(memory1.embedding, memory2.embedding);
    }

    // Si no, generar embeddings y comparar
    const [emb1, emb2] = await Promise.all([
      memory1.embedding 
        ? Promise.resolve(memory1.embedding)
        : generateEmbedding(memory1.content).then(r => r.embedding),
      memory2.embedding
        ? Promise.resolve(memory2.embedding)
        : generateEmbedding(memory2.content).then(r => r.embedding),
    ]);

    return cosineSimilarity(emb1, emb2);
  } catch (error) {
    logger.warn('[memory-consolidator] Error calculating similarity, using text comparison');
    // Fallback: comparación simple de texto
    return textSimilarity(memory1.content, memory2.content);
  }
}

/**
 * Consolida dos memorias similares en una sola
 */
async function consolidateMemories(
  memory1: SemanticMemory, // La más importante (se mantiene)
  memory2: SemanticMemory, // La menos importante (se elimina)
  userId: string
): Promise<void> {
  try {
    // Combinar contenido (usar el más completo)
    const combinedContent = memory1.content.length > memory2.content.length
      ? memory1.content
      : memory2.content;

    // Combinar metadatos
    const combinedMetadata = {
      ...memory1.metadata,
      ...memory2.metadata,
      consolidated_from: [
        ...(memory1.metadata.consolidated_from || []),
        memory2.id,
      ],
    };

    // Usar la mayor importancia
    const maxImportance = Math.max(memory1.importanceScore, memory2.importanceScore);

    // Actualizar memoria principal
    await updateMemory(memory1.id, userId, {
      content: combinedContent,
      importanceScore: maxImportance,
      metadata: combinedMetadata,
    });

    // Eliminar memoria duplicada
    await deleteMemory(memory2.id, userId);

    logger.debug(`[memory-consolidator] Consolidated ${memory2.id} into ${memory1.id}`);
  } catch (error: unknown) {
    logger.error('[memory-consolidator] Error consolidating memories:', error);
    throw error;
  }
}

/**
 * Calcula similitud coseno entre dos vectores
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calcula similitud de texto simple (Jaccard similarity)
 */
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

