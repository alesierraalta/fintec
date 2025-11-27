/**
 * Semantic Memory - Gestión de memoria semántica con búsqueda vectorial
 * 
 * Almacena hechos, preferencias y patrones aprendidos del usuario usando
 * embeddings vectoriales para búsqueda semántica.
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { generateEmbedding } from '../rag/embedder';
import { logger } from '@/lib/utils/logger';

export type MemoryType = 'preference' | 'fact' | 'pattern' | 'rule';

export interface SemanticMemory {
  id: string;
  userId: string;
  memoryType: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  importanceScore: number;
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SemanticSearchResult {
  id: string;
  memoryType: MemoryType;
  content: string;
  similarity: number;
  importanceScore: number;
  metadata: Record<string, any>;
}

export interface SemanticSearchOptions {
  memoryTypes?: MemoryType[];
  minSimilarity?: number;
  maxResults?: number;
  minImportance?: number;
}

/**
 * Almacena una nueva memoria semántica
 */
export async function storeMemory(
  userId: string,
  memoryType: MemoryType,
  content: string,
  importanceScore: number = 0.5,
  metadata?: Record<string, any>
): Promise<SemanticMemory> {
  try {
    const client = createSupabaseServiceClient();
    
    // Generar embedding para la memoria
    const { embedding } = await generateEmbedding(content);
    // PostgREST/Supabase convierte automáticamente el formato string '[0.1,0.2,0.3]' a vector type
    // Este formato es compatible con pgvector cuando se inserta en una columna vector(1536)
    const embeddingStr = `[${embedding.join(',')}]`;

    const { data, error } = await (client
      .from('ai_semantic_memories') as any)
      .insert({
        user_id: userId,
        memory_type: memoryType,
        content: content.trim(),
        embedding: embeddingStr, // Formato string que PostgREST convierte a vector(1536)
        metadata: metadata || {},
        importance_score: Math.max(0, Math.min(1, importanceScore)),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store memory: ${error.message}`);
    }

    logger.debug(`[semantic-memory] Stored ${memoryType} memory ${data.id} for user ${userId}`);
    return mapMemoryFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error storing memory:', error);
    throw new Error(`Failed to store memory: ${errorMessage}`);
  }
}

/**
 * Busca memorias semánticas relevantes usando búsqueda vectorial
 */
export async function searchMemories(
  userId: string,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> {
  try {
    const client = createSupabaseServiceClient();
    
    // Generar embedding de la query
    const { embedding } = await generateEmbedding(query);
    // Para RPC calls, PostgREST necesita el formato string que se convierte a vector(1536)
    // El formato '[0.1,0.2,0.3]' es compatible con el tipo vector en PostgreSQL
    const embeddingStr = `[${embedding.join(',')}]`;

    // Llamar a función RPC para búsqueda vectorial
    // Nota: PostgREST convierte automáticamente el string a vector(1536) cuando el parámetro
    // de la función RPC está tipado como vector(1536)
    const { data, error } = await (client.rpc as any)('search_semantic_memories', {
      query_embedding: embeddingStr, // PostgREST convierte string a vector(1536) para el RPC
      user_id_param: userId,
      memory_types: options.memoryTypes || null,
      match_threshold: options.minSimilarity || 0.7,
      match_count: options.maxResults || 5,
      ef_search: 100, // HNSW parameter
    });

    if (error) {
      throw new Error(`Failed to search memories: ${error.message}`);
    }

    // Filtrar por importancia mínima si se especifica
    let results = (data || []).map((item: any) => ({
      id: item.id,
      memoryType: item.memory_type,
      content: item.content,
      similarity: parseFloat(item.similarity) || 0,
      importanceScore: parseFloat(item.importance_score) || 0.5,
      metadata: item.metadata || {},
    }));

    if (options.minImportance !== undefined) {
      results = results.filter((r: SemanticSearchResult) => 
        r.importanceScore >= options.minImportance!
      );
    }

    // Actualizar access_count y last_accessed_at para memorias recuperadas
    if (results.length > 0) {
      await Promise.all(
        results.map((r: SemanticSearchResult) => 
          updateMemoryAccess(r.id).catch(err => 
            logger.warn(`[semantic-memory] Failed to update access for memory ${r.id}:`, err)
          )
        )
      );
    }

    logger.debug(`[semantic-memory] Found ${results.length} relevant memories for query: "${query.substring(0, 50)}..."`);
    return results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error searching memories:', error);
    throw new Error(`Failed to search memories: ${errorMessage}`);
  }
}

/**
 * Obtiene memorias por tipo
 */
export async function getMemoriesByType(
  userId: string,
  memoryType: MemoryType,
  limit: number = 20
): Promise<SemanticMemory[]> {
  try {
    const client = createSupabaseServiceClient();
    
    const { data, error } = await (client
      .from('ai_semantic_memories') as any)
      .select('*')
      .eq('user_id', userId)
      .eq('memory_type', memoryType)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to retrieve memories: ${error.message}`);
    }

    return (data || []).map(mapMemoryFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error retrieving memories:', error);
    throw new Error(`Failed to retrieve memories: ${errorMessage}`);
  }
}

/**
 * Actualiza una memoria existente
 */
export async function updateMemory(
  memoryId: string,
  userId: string,
  updates: {
    content?: string;
    importanceScore?: number;
    metadata?: Record<string, any>;
  }
): Promise<SemanticMemory> {
  try {
    const client = createSupabaseServiceClient();
    
    const updateData: any = {};
    
    if (updates.content !== undefined) {
      updateData.content = updates.content.trim();
      // Regenerar embedding si el contenido cambió
      const { embedding } = await generateEmbedding(updates.content);
      updateData.embedding = `[${embedding.join(',')}]`;
    }
    
    if (updates.importanceScore !== undefined) {
      updateData.importance_score = Math.max(0, Math.min(1, updates.importanceScore));
    }
    
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const { data, error } = await (client
      .from('ai_semantic_memories') as any)
      .update(updateData)
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update memory: ${error.message}`);
    }

    logger.debug(`[semantic-memory] Updated memory ${memoryId}`);
    return mapMemoryFromDb(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error updating memory:', error);
    throw new Error(`Failed to update memory: ${errorMessage}`);
  }
}

/**
 * Actualiza el contador de acceso de una memoria
 */
export async function updateMemoryAccess(memoryId: string): Promise<void> {
  try {
    const client = createSupabaseServiceClient();
    
    const { error } = await (client.rpc as any)('update_memory_access', {
      memory_id: memoryId,
    });

    if (error) {
      throw new Error(`Failed to update memory access: ${error.message}`);
    }
  } catch (error: unknown) {
    // No lanzar error, solo loggear - esto es una operación no crítica
    logger.warn('[semantic-memory] Failed to update memory access:', error);
  }
}

/**
 * Elimina una memoria
 */
export async function deleteMemory(
  memoryId: string,
  userId: string
): Promise<void> {
  try {
    const client = createSupabaseServiceClient();
    
    const { error } = await (client
      .from('ai_semantic_memories') as any)
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }

    logger.debug(`[semantic-memory] Deleted memory ${memoryId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error deleting memory:', error);
    throw new Error(`Failed to delete memory: ${errorMessage}`);
  }
}

/**
 * Obtiene todas las memorias del usuario ordenadas por importancia
 */
export async function getAllMemories(
  userId: string,
  limit: number = 50
): Promise<SemanticMemory[]> {
  try {
    const client = createSupabaseServiceClient();
    
    const { data, error } = await (client
      .from('ai_semantic_memories') as any)
      .select('*')
      .eq('user_id', userId)
      .order('importance_score', { ascending: false })
      .order('last_accessed_at', { ascending: false, nullsLast: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to retrieve memories: ${error.message}`);
    }

    return (data || []).map(mapMemoryFromDb);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[semantic-memory] Error retrieving memories:', error);
    throw new Error(`Failed to retrieve memories: ${errorMessage}`);
  }
}

// Helper function para mapear datos de DB

function mapMemoryFromDb(data: any): SemanticMemory {
  return {
    id: data.id,
    userId: data.user_id,
    memoryType: data.memory_type,
    content: data.content,
    embedding: data.embedding ? parseEmbedding(data.embedding) : undefined,
    metadata: data.metadata || {},
    importanceScore: parseFloat(data.importance_score) || 0.5,
    accessCount: data.access_count || 0,
    lastAccessedAt: data.last_accessed_at ? new Date(data.last_accessed_at) : undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function parseEmbedding(embedding: string | number[]): number[] {
  if (Array.isArray(embedding)) {
    return embedding;
  }
  // Si viene como string desde PostgreSQL
  if (typeof embedding === 'string') {
    try {
      return JSON.parse(embedding);
    } catch {
      // Si es formato PostgreSQL array literal
      return embedding
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));
    }
  }
  return [];
}

