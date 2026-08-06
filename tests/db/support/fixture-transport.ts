import type { RagTransport } from '@/lib/ai/rag/transport';

const EMBEDDING_DIM = 768;

/**
 * Deterministic pseudo-random unit vector derived from a string hash
 * (FNV-1a seed + a linear congruential generator). No network call, no
 * external dependency — same input text always yields the same vector.
 */
function hashToVector(text: string): number[] {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const vector: number[] = [];
  let seed = hash || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    vector.push((seed / 0xffffffff) * 2 - 1);
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Deterministic fixture `RagTransport` for DB-backed tests. Swapped in via
 * `setRagTransport` so `runBackfill`/`embedText` (used by
 * `seedEvalDataset`) never make a paid network call while still exercising
 * the real production code path.
 */
export function createFixtureRagTransport(): RagTransport {
  return {
    embed: async (params) => ({ embedding: hashToVector(String(params.value)) }),
    rerank: async (_query, candidates) => ({
      results: candidates.map((candidate, index) => ({
        index,
        relevance_score: candidate.score,
      })),
    }),
  };
}
