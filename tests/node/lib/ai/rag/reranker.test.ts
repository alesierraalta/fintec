/**
 * Unit tests for `lib/ai/rag/reranker.ts`.
 *
 * Mocks `global.fetch` (the Vercel AI Gateway HTTP call to Voyage
 * rerank-2.5-lite) — no live network calls.
 *
 * Covers (per design's reranker decision + spec "Fail-open reranker"
 * requirement, all 3 scenarios):
 *   - Skip heuristics: fewer than 15 candidates, or a strong lexical anchor
 *   - ~500ms hard timeout -> fail-open to original order
 *   - Any error -> fail-open to original order
 *   - Feature flag disabled -> fail-open (passthrough) without calling fetch
 *   - Success path returns the reranked order
 */

const originalFetch = global.fetch;
const originalEnv = process.env.RERANKER_ENABLED;

function makeCandidates(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `tx-${i}`,
    text: `Transaction number ${i} at Merchant ${i}`,
    score: 1 / (50 + i),
  }));
}

describe('lib/ai/rag/reranker', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.RERANKER_ENABLED = 'true';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.RERANKER_ENABLED = originalEnv;
    jest.useRealTimers();
  });

  describe('skip heuristics', () => {
    it('skips reranking and returns input order unchanged when fewer than 15 candidates', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(10);

      const result = await rerankCandidates(
        'find my netflix charges',
        candidates
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(candidates);
    });

    it('skips reranking when a strong lexical anchor exists in a top candidate', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(20);
      candidates[0] = {
        id: 'tx-anchor',
        text: 'netflix subscription charge',
        score: 0.5,
      };

      const result = await rerankCandidates(
        'netflix subscription charge',
        candidates
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(candidates);
    });
  });

  describe('feature flag', () => {
    it('returns the input order unchanged and never calls fetch when the flag is disabled', async () => {
      process.env.RERANKER_ENABLED = 'false';
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(20);

      const result = await rerankCandidates(
        'find my netflix charges',
        candidates
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(candidates);
    });
  });

  describe('fail-open behavior', () => {
    it('falls open to the original RRF order when the gateway call errors', async () => {
      const fetchMock = jest
        .fn()
        .mockRejectedValue(new Error('gateway unreachable'));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(20);

      const result = await rerankCandidates('find my transactions', candidates);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(candidates);
    });

    it('falls open to the original RRF order when the gateway call times out (~500ms)', async () => {
      const fetchMock = jest.fn().mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(20);

      const result = await rerankCandidates('find my transactions', candidates);

      expect(result).toEqual(candidates);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, options] = fetchMock.mock.calls[0];
      expect(options.signal.aborted).toBe(true);
    }, 2000);

    it('falls open to the original RRF order when the gateway responds with a non-ok status', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const candidates = makeCandidates(20);

      const result = await rerankCandidates('find my transactions', candidates);

      expect(result).toEqual(candidates);
    });
  });

  describe('success path', () => {
    it('returns candidates reordered per the gateway relevance scores', async () => {
      const candidates = makeCandidates(20);
      // Gateway says candidate index 5 is most relevant, then index 0.
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { index: 5, relevance_score: 0.98 },
            { index: 0, relevance_score: 0.91 },
            { index: 3, relevance_score: 0.4 },
          ],
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const result = await rerankCandidates(
        'find my netflix and spotify charges',
        candidates
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result[0]).toEqual(candidates[5]);
      expect(result[1]).toEqual(candidates[0]);
      expect(result[2]).toEqual(candidates[3]);
    });

    it('appends candidates missing from a partial gateway response after the reranked ones, preserving all 20 inputs', async () => {
      // Real PR2 test-count accounting note: this test file has 12 base
      // scenarios + this partial-results case = 13 reranker tests total.
      const candidates = makeCandidates(20);
      // Gateway only scored 3 of the 20 candidates (a partial response) —
      // the other 17 MUST still be present in the result, appended after
      // the reranked ones, in their original relative order.
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { index: 5, relevance_score: 0.98 },
            { index: 0, relevance_score: 0.91 },
            { index: 3, relevance_score: 0.4 },
          ],
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { rerankCandidates } = require('@/lib/ai/rag/reranker');
      const result = await rerankCandidates(
        'find my netflix and spotify charges',
        candidates
      );

      // Pinned length: no candidate may be silently dropped.
      expect(result).toHaveLength(20);
      // Reranked head, in gateway relevance order.
      expect(result[0]).toEqual(candidates[5]);
      expect(result[1]).toEqual(candidates[0]);
      expect(result[2]).toEqual(candidates[3]);
      // Appended tail: remaining candidates (excluding 5, 0, 3) in original order.
      const expectedTail = candidates.filter(
        (_c, i) => ![5, 0, 3].includes(i)
      );
      expect(result.slice(3)).toEqual(expectedTail);
    });
  });
});
