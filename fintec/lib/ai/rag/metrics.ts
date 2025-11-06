/**
 * Retrieval Metrics - Métricas de calidad y rendimiento para RAG
 * 
 * Patrón: Service Layer
 * Principio SOLID: Single Responsibility (S)
 * 
 * Proporciona interfaces y funciones para registrar y analizar
 * métricas de recuperación de documentos RAG.
 * 
 * MCP usado: serena para analizar patrones de logger.ts
 */

import { logger } from '@/lib/utils/logger';
import { QueryComplexity } from './query-analyzer';

/**
 * Interfaz para métricas de recuperación RAG
 */
export interface RetrievalMetrics {
  /** Complejidad de la query analizada */
  queryComplexity: QueryComplexity;
  
  /** Número de documentos solicitados (topK) */
  topKRequested: number;
  
  /** Número de documentos realmente recuperados */
  documentsRetrieved: number;
  
  /** Similitud promedio de los documentos recuperados */
  averageSimilarity: number;
  
  /** Similitud mínima entre los documentos recuperados */
  minSimilarity: number;
  
  /** Similitud máxima entre los documentos recuperados */
  maxSimilarity: number;
  
  /** Si el embedding fue obtenido del caché (true) o generado (false) */
  embeddingCacheHit: boolean;
  
  /** Latencia de recuperación en milisegundos */
  retrievalLatencyMs: number;
  
  /** Query original (opcional, para debugging) */
  query?: string;
  
  /** Tipos de documentos solicitados (opcional) */
  documentTypes?: string[];
}

/**
 * Registra métricas de recuperación RAG
 * 
 * @param metrics - Métricas a registrar
 */
export function logRetrievalMetrics(metrics: RetrievalMetrics): void {
  const {
    queryComplexity,
    topKRequested,
    documentsRetrieved,
    averageSimilarity,
    minSimilarity,
    maxSimilarity,
    embeddingCacheHit,
    retrievalLatencyMs,
    query,
    documentTypes,
  } = metrics;
  
  // Log detallado con información estructurada
  logger.debug(`[RAG Metrics] Retrieval completed:`, {
    query: query?.substring(0, 100),
    complexity: queryComplexity,
    topKRequested,
    documentsRetrieved,
    retrievalRate: `${documentsRetrieved}/${topKRequested} (${Math.round((documentsRetrieved / topKRequested) * 100)}%)`,
    similarity: {
      avg: averageSimilarity.toFixed(3),
      min: minSimilarity.toFixed(3),
      max: maxSimilarity.toFixed(3),
    },
    embeddingCacheHit,
    latency: `${retrievalLatencyMs}ms`,
    documentTypes: documentTypes?.join(', ') || 'all',
  });
  
  // Log de advertencia si hay problemas de calidad
  if (documentsRetrieved === 0) {
    logger.warn(`[RAG Metrics] No documents retrieved for query: "${query?.substring(0, 50)}..."`);
  } else if (documentsRetrieved < topKRequested * 0.5) {
    logger.warn(`[RAG Metrics] Low retrieval rate: ${documentsRetrieved}/${topKRequested} documents retrieved`);
  }
  
  if (averageSimilarity < 0.7) {
    logger.warn(`[RAG Metrics] Low average similarity: ${averageSimilarity.toFixed(3)} (threshold: 0.7)`);
  }
  
  // Log de rendimiento si la latencia es alta
  if (retrievalLatencyMs > 1000) {
    logger.warn(`[RAG Metrics] High retrieval latency: ${retrievalLatencyMs}ms`);
  }
}

/**
 * Calcula métricas de similitud de un conjunto de documentos recuperados
 * 
 * @param similarities - Array de valores de similitud
 * @returns Objeto con estadísticas de similitud
 */
export function calculateSimilarityMetrics(similarities: number[]): {
  average: number;
  min: number;
  max: number;
} {
  if (similarities.length === 0) {
    return { average: 0, min: 0, max: 0 };
  }
  
  const sum = similarities.reduce((acc, val) => acc + val, 0);
  const average = sum / similarities.length;
  const min = Math.min(...similarities);
  const max = Math.max(...similarities);
  
  return { average, min, max };
}

/**
 * Crea un objeto RetrievalMetrics a partir de datos de recuperación
 * 
 * @param params - Parámetros para crear las métricas
 * @returns Objeto RetrievalMetrics
 */
export function createRetrievalMetrics(params: {
  queryComplexity: QueryComplexity;
  topKRequested: number;
  documentsRetrieved: number;
  similarities: number[];
  embeddingCacheHit: boolean;
  retrievalLatencyMs: number;
  query?: string;
  documentTypes?: string[];
}): RetrievalMetrics {
  const similarityMetrics = calculateSimilarityMetrics(params.similarities);
  
  return {
    queryComplexity: params.queryComplexity,
    topKRequested: params.topKRequested,
    documentsRetrieved: params.documentsRetrieved,
    averageSimilarity: similarityMetrics.average,
    minSimilarity: similarityMetrics.min,
    maxSimilarity: similarityMetrics.max,
    embeddingCacheHit: params.embeddingCacheHit,
    retrievalLatencyMs: params.retrievalLatencyMs,
    query: params.query,
    documentTypes: params.documentTypes,
  };
}
