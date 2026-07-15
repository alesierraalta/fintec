/**
 * Unit tests for `lib/ai/rag/embeddings.ts`.
 *
 * Mocks the `ai` package's `embed()` and `@ai-sdk/google`'s
 * `google.textEmbeddingModel()` — no live provider calls.
 *
 * Covers (per design + spec transaction-embeddings requirement):
 *   - 768-dim length assertion (throws on mismatch — historical
 *     vercel/ai#8033 passthrough bug)
 *   - Client-side renormalization to unit length
 *   - taskType branching (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY)
 *   - Module-scope LRU cache hit/miss for repeated query embeddings
 */

const mockEmbed = jest.fn();
const mockTextEmbeddingModel = jest.fn((modelId: string) => ({
  modelId,
  __type: 'mock-embedding-model',
}));

jest.mock('ai', () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

jest.mock('@ai-sdk/google', () => ({
  google: {
    textEmbeddingModel: (...args: unknown[]) => mockTextEmbeddingModel(...args),
  },
}));

function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

describe('lib/ai/rag/embeddings', () => {
  beforeEach(() => {
    jest.resetModules();
    mockEmbed.mockReset();
    mockTextEmbeddingModel.mockClear();
  });

  describe('embedText — length assertion', () => {
    it('returns a 768-length vector on a well-formed provider response', async () => {
      const raw = Array.from({ length: 768 }, (_, i) => (i % 5) + 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');
      const result = await embedText(
        'coffee at starbucks',
        'RETRIEVAL_DOCUMENT'
      );

      expect(result).toHaveLength(768);
    });

    it('throws when the provider returns a vector with the wrong length (passthrough bug guard)', async () => {
      const raw = Array.from({ length: 3072 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');

      await expect(
        embedText('coffee at starbucks', 'RETRIEVAL_DOCUMENT')
      ).rejects.toThrow(/768/);
    });
  });

  describe('embedText — renormalization', () => {
    it('renormalizes a non-unit vector to unit length', async () => {
      // 768 entries all set to 2 -> magnitude = sqrt(768 * 4) = sqrt(3072), not 1
      const raw = Array.from({ length: 768 }, () => 2);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');
      const result = await embedText(
        'netflix subscription',
        'RETRIEVAL_DOCUMENT'
      );

      expect(magnitude(result)).toBeCloseTo(1, 6);
      // Direction preserved: every component should still be equal to each other
      expect(result[0]).toBeCloseTo(result[1], 10);
    });

    it('renormalizes a different non-unit vector to unit length (triangulation)', async () => {
      const raw = Array.from({ length: 768 }, (_, i) => (i < 384 ? 1 : 3));
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');
      const result = await embedText(
        'gas station fillup',
        'RETRIEVAL_DOCUMENT'
      );

      expect(magnitude(result)).toBeCloseTo(1, 6);
    });

    it('returns a NaN-containing vector unchanged instead of propagating NaN through every component', () => {
      const { renormalize } = require('@/lib/ai/rag/embeddings');
      const raw = [1, 2, NaN, 4];

      const result = renormalize(raw);

      expect(result).toEqual(raw);
      expect(Number.isNaN(result[2])).toBe(true);
      // Only the original NaN component is NaN — division-by-NaN did not
      // spread NaN into the other components.
      expect(Number.isNaN(result[0])).toBe(false);
    });

    it('returns an Infinity-containing vector unchanged instead of dividing by an infinite norm', () => {
      const { renormalize } = require('@/lib/ai/rag/embeddings');
      const raw = [1, 2, Infinity, 4];

      const result = renormalize(raw);

      expect(result).toEqual(raw);
      expect(result[2]).toBe(Infinity);
    });
  });

  describe('embedText — taskType branching', () => {
    it('passes taskType=RETRIEVAL_DOCUMENT through providerOptions.google for stored text', async () => {
      const raw = Array.from({ length: 768 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');
      await embedText('grocery store purchase', 'RETRIEVAL_DOCUMENT');

      expect(mockEmbed).toHaveBeenCalledTimes(1);
      const call = mockEmbed.mock.calls[0][0];
      expect(call.providerOptions.google.taskType).toBe('RETRIEVAL_DOCUMENT');
      expect(call.providerOptions.google.outputDimensionality).toBe(768);
    });

    it('passes taskType=RETRIEVAL_QUERY through providerOptions.google for search queries', async () => {
      const raw = Array.from({ length: 768 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');
      await embedText('find my netflix charges', 'RETRIEVAL_QUERY');

      expect(mockEmbed).toHaveBeenCalledTimes(1);
      const call = mockEmbed.mock.calls[0][0];
      expect(call.providerOptions.google.taskType).toBe('RETRIEVAL_QUERY');
    });
  });

  describe('embedText — module-scope LRU cache for query embeddings', () => {
    it('returns a cached result for a repeated RETRIEVAL_QUERY text without calling the provider again', async () => {
      const raw = Array.from({ length: 768 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');

      const first = await embedText(
        'find my netflix charges',
        'RETRIEVAL_QUERY'
      );
      expect(mockEmbed).toHaveBeenCalledTimes(1);

      const second = await embedText(
        'find my netflix charges',
        'RETRIEVAL_QUERY'
      );

      expect(mockEmbed).toHaveBeenCalledTimes(1); // no second provider call
      expect(second).toEqual(first);
    });

    it('does not cache RETRIEVAL_DOCUMENT embeddings (each write re-embeds)', async () => {
      const raw = Array.from({ length: 768 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');

      await embedText('same description twice', 'RETRIEVAL_DOCUMENT');
      await embedText('same description twice', 'RETRIEVAL_DOCUMENT');

      expect(mockEmbed).toHaveBeenCalledTimes(2);
    });

    it('misses the cache for a different query text', async () => {
      const raw = Array.from({ length: 768 }, () => 1);
      mockEmbed.mockResolvedValue({ embedding: raw });

      const { embedText } = require('@/lib/ai/rag/embeddings');

      await embedText('find my netflix charges', 'RETRIEVAL_QUERY');
      await embedText('find my spotify charges', 'RETRIEVAL_QUERY');

      expect(mockEmbed).toHaveBeenCalledTimes(2);
    });
  });
});
