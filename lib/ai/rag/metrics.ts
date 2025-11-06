/**
 * Retrieval Metrics - Métricas de rendimiento y calidad para RAG
 */

import { logger } from '@/lib/utils/logger';
import { QueryComplexity } from './query-analyzer';

export interface RetrievalMetrics {
  queryComplexity: QueryComplexity;
  topKRequested: number;
  documentsRetrieved: number;
  averageSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;
  embeddingCacheHit: boolean;
  retrievalLatencyMs: number;
  query: string;
  documentTypes?: string[] | null;
}

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

  logger.info(`[RAG Metrics] Query: "${query.substring(0, 50)}..."`, {
    complexity: queryComplexity,
    topKRequested,
    documentsRetrieved,
    avgSimilarity: averageSimilarity.toFixed(3),
    minSimilarity: minSimilarity.toFixed(3),
    maxSimilarity: maxSimilarity.toFixed(3),
    embeddingCacheHit,
    latencyMs: retrievalLatencyMs,
    documentTypes: documentTypes?.join(',') || 'all',
  });
}

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

export function createRetrievalMetrics(params: {
  queryComplexity: QueryComplexity;
  topKRequested: number;
  documentsRetrieved: number;
  similarities: number[];
  embeddingCacheHit: boolean;
  retrievalLatencyMs: number;
  query: string;
  documentTypes?: string[] | null;
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
