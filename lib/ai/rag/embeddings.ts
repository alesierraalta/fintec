import { embed } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * gemini-embedding-001 embedding module.
 *
 * Design notes (see sdd/ai-rag-hybrid-search/design):
 * - Requests 768 output dimensions via `providerOptions.google.outputDimensionality`.
 * - gemini-embedding-001 only normalizes its output at the native 3072-dim
 *   size, so any truncated/projected dimensionality (768 here) is NOT
 *   guaranteed to be unit length — we renormalize client-side before use.
 * - We assert the returned vector length is exactly 768 before renormalizing.
 *   This guards against a historical AI SDK passthrough bug (vercel/ai#8033)
 *   where `outputDimensionality` was silently ignored by some provider paths
 *   and the full 3072-dim vector leaked through.
 * - Query embeddings (taskType=RETRIEVAL_QUERY) are cached in a module-scope
 *   LRU cache to avoid recomputing identical repeated searches within a
 *   session. Document embeddings (RETRIEVAL_DOCUMENT) are never cached since
 *   each write is expected to produce a fresh, distinct embedding.
 */

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

const EMBEDDING_MODEL_ID = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;
const QUERY_CACHE_MAX_ENTRIES = 100;

/**
 * Module-scope LRU cache for query embeddings, keyed by raw query text.
 * Map preserves insertion order, which we use as the recency ordering:
 * re-inserting a key on access moves it to the "most recently used" end.
 */
const queryEmbeddingCache = new Map<string, number[]>();

function getCachedQueryEmbedding(text: string): number[] | undefined {
  const cached = queryEmbeddingCache.get(text);
  if (cached === undefined) {
    return undefined;
  }
  // Refresh recency: move this entry to the end.
  queryEmbeddingCache.delete(text);
  queryEmbeddingCache.set(text, cached);
  return cached;
}

function setCachedQueryEmbedding(text: string, embedding: number[]): void {
  if (queryEmbeddingCache.has(text)) {
    queryEmbeddingCache.delete(text);
  } else if (queryEmbeddingCache.size >= QUERY_CACHE_MAX_ENTRIES) {
    const oldestKey = queryEmbeddingCache.keys().next().value;
    if (oldestKey !== undefined) {
      queryEmbeddingCache.delete(oldestKey);
    }
  }
  queryEmbeddingCache.set(text, embedding);
}

/** Test-only helper to reset LRU cache state between test cases. */
export function clearQueryEmbeddingCache(): void {
  queryEmbeddingCache.clear();
}

function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

/**
 * Renormalizes an embedding vector to unit length (L2 norm = 1).
 * A zero vector is returned unchanged (renormalizing would divide by zero).
 * A NaN or non-finite norm (e.g. a NaN/Infinity component in the raw vector)
 * is treated the same way — returned unchanged rather than propagating
 * NaN/Infinity into every component via division.
 */
export function renormalize(vector: number[]): number[] {
  const norm = magnitude(vector);
  if (norm === 0 || !Number.isFinite(norm)) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

function assertEmbeddingLength(embedding: number[]): void {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSIONS}-dimension embedding from ${EMBEDDING_MODEL_ID}, ` +
        `but received ${embedding.length} dimensions. This likely indicates the provider ` +
        `ignored providerOptions.google.outputDimensionality (see vercel/ai#8033) — ` +
        `refusing to persist a mismatched vector.`
    );
  }
}

/**
 * Generates a 768-dimension embedding for `text` using gemini-embedding-001.
 *
 * - `taskType=RETRIEVAL_DOCUMENT` for text being stored (transaction descriptions).
 * - `taskType=RETRIEVAL_QUERY` for search queries; results are cached.
 *
 * @throws if the provider returns a vector whose length is not exactly 768.
 */
export async function embedText(
  text: string,
  taskType: EmbeddingTaskType
): Promise<number[]> {
  if (taskType === 'RETRIEVAL_QUERY') {
    const cached = getCachedQueryEmbedding(text);
    if (cached !== undefined) {
      return cached;
    }
  }

  const { embedding } = await embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL_ID),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType,
      },
    },
  });

  assertEmbeddingLength(embedding);
  const normalized = renormalize(embedding);

  if (taskType === 'RETRIEVAL_QUERY') {
    setCachedQueryEmbedding(text, normalized);
  }

  return normalized;
}
