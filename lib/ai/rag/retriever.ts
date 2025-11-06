/**
 * Retriever - Recupera documentos relevantes usando búsqueda vectorial
 * 
 * Patrón: Service Layer
 * Principio SOLID: Single Responsibility (S)
 * Docs: https://supabase.com/docs/guides/ai/vector-columns
 * 
 * MCP usado: web_search y mcp_supabase_search_docs para sintaxis pgvector
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { generateEmbedding } from './embedder';
import { logger } from '@/lib/utils/logger';
import { analyzeQueryComplexity, calculateTopK, extractExplicitLimit, type QueryComplexity } from './query-analyzer';
import { logRetrievalMetrics, createRetrievalMetrics } from './metrics';

export interface RetrievedDocument {
  documentType: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

const DEFAULT_TOP_K = 10;
const MIN_SIMILARITY = 0.7; // Umbral mínimo de similitud

/**
 * Recupera documentos relevantes para una query usando búsqueda vectorial
 */
/**
 * Recupera documentos relevantes para una query usando búsqueda vectorial con HNSW
 * 
 * @param userId - ID del usuario
 * @param query - Query de búsqueda
 * @param documentTypes - Tipos de documentos a buscar (opcional)
 * @param topK - Número de documentos a recuperar (opcional, se calcula automáticamente si no se proporciona)
 * @param efSearch - Parámetro ef_search para HNSW (opcional, default 100)
 * @returns Array de documentos recuperados con sus similitudes
 */
/**
 * Recupera documentos relevantes para una query usando búsqueda vectorial con HNSW
 * Implementa top-K dinámico basado en la complejidad de la query
 * 
 * @param userId - ID del usuario
 * @param query - Query de búsqueda
 * @param documentTypes - Tipos de documentos a buscar (opcional)
 * @param topK - Número de documentos a recuperar (opcional, se calcula automáticamente si no se proporciona)
 * @param efSearch - Parámetro ef_search para HNSW (opcional, default 100)
 * @returns Array de documentos recuperados con sus similitudes
 */
export async function retrieveRelevantDocuments(
  userId: string,
  query: string,
  documentTypes?: string[],
  topK?: number,
  efSearch?: number
): Promise<RetrievedDocument[]> {
  const startTime = Date.now();
  let embeddingCacheHit = false;
  let queryComplexity: import('./query-analyzer').QueryComplexity = 'MODERATE';
  
  try {
    const client = createSupabaseServiceClient();
    
    // Calcular topK dinámicamente si no se proporciona
    let finalTopK: number;
    if (topK !== undefined && topK > 0) {
      // Usar topK proporcionado
      finalTopK = topK;
    } else {
      // Calcular topK basado en complejidad de la query
      queryComplexity = analyzeQueryComplexity(query);
      const explicitLimit = extractExplicitLimit(query);
      finalTopK = calculateTopK(queryComplexity, explicitLimit || undefined);
      logger.debug(`[retrieveRelevantDocuments] Auto-calculated topK=${finalTopK} for complexity=${queryComplexity}, query: "${query.substring(0, 50)}..."`);
    }
    
    // Generar embedding de la query (con caché)
    // Nota: embeddingCacheHit se detecta en generateEmbedding, pero necesitamos verificarlo
    // Por ahora, asumimos que generateEmbedding maneja el caché internamente
    const { embedding } = await generateEmbedding(query);
    
    // TODO: Verificar si el embedding fue cacheado (requiere modificar generateEmbedding para retornar esta info)
    // Por ahora, asumimos false y lo mejoraremos en una iteración futura
    
    // Usar efSearch proporcionado o el default para HNSW (100)
    const finalEfSearch = efSearch ?? 100;
    
    // Llamar a función RPC para búsqueda vectorial con HNSW
    // ef_search controla el tamaño de la lista dinámica durante la búsqueda
    // Mayor ef_search = mejor precisión pero consultas más lentas
    const { data, error } = await (client.rpc as any)('search_rag_documents', {
      query_embedding: `[${embedding.join(',')}]`,
      user_id_param: userId,
      document_types: documentTypes || null,
      match_threshold: MIN_SIMILARITY,
      match_count: finalTopK,
      ef_search: finalEfSearch, // HNSW parameter
    });

    if (error) {
      throw new Error(`Failed to retrieve documents: ${error.message}`);
    }

    // Formatear resultados
    const results: RetrievedDocument[] = (data || []).map((doc: {
      document_type: string;
      document_id: string;
      content: string;
      similarity: number;
      metadata: Record<string, unknown>;
    }) => ({
      documentType: doc.document_type,
      documentId: doc.document_id,
      content: doc.content,
      similarity: doc.similarity,
      metadata: doc.metadata || {},
    }));

    // Calcular métricas
    const retrievalLatencyMs = Date.now() - startTime;
    const similarities = results.map(r => r.similarity);
    
    // Registrar métricas
    const metrics = createRetrievalMetrics({
      queryComplexity,
      topKRequested: finalTopK,
      documentsRetrieved: results.length,
      similarities,
      embeddingCacheHit,
      retrievalLatencyMs,
      query,
      documentTypes,
    });
    logRetrievalMetrics(metrics);

    logger.debug(`[retrieveRelevantDocuments] Retrieved ${results.length} documents for query: "${query.substring(0, 50)}..."`);
    
    return results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[retrieveRelevantDocuments] Error retrieving documents:`, error);
    throw new Error(`Failed to retrieve documents: ${errorMessage}`);
  }
}

