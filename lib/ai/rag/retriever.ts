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
export async function retrieveRelevantDocuments(
  userId: string,
  query: string,
  documentTypes?: string[],
  topK: number = DEFAULT_TOP_K
): Promise<RetrievedDocument[]> {
  try {
    const client = createSupabaseServiceClient();
    
    // Generar embedding de la query
    const { embedding } = await generateEmbedding(query);
    
    // Llamar a función RPC para búsqueda vectorial
    // Supabase puede aceptar el array directamente o como string en formato PostgreSQL
    // Probamos primero con string, que es el formato estándar de pgvector
    const { data, error } = await (client.rpc as any)('search_rag_documents', {
      query_embedding: `[${embedding.join(',')}]`,
      user_id_param: userId,
      document_types: documentTypes || null,
      match_threshold: MIN_SIMILARITY,
      match_count: topK,
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

    logger.debug(`[retrieveRelevantDocuments] Retrieved ${results.length} documents for query: "${query.substring(0, 50)}..."`);
    
    return results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[retrieveRelevantDocuments] Error retrieving documents:`, error);
    throw new Error(`Failed to retrieve documents: ${errorMessage}`);
  }
}

