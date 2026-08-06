/**
 * Fail-open reranker for hybrid search candidates.
 *
 * Design notes (see sdd/ai-rag-hybrid-search/design):
 * - Voyage `rerank-2.5-lite` is called through the Vercel AI Gateway HTTP
 *   endpoint, gated behind the `RERANKER_ENABLED` feature flag.
 * - Bounded by a hard ~500ms timeout via `AbortController`.
 * - MUST fail open (return the input order unchanged) on any error, timeout,
 *   non-ok response, or when the flag is disabled — reranking is purely an
 *   optimization on top of the RRF-ordered candidates, never a hard
 *   dependency of search.
 * - Skip heuristics avoid the network round-trip entirely when it would add
 *   little value: fewer than 15 candidates, or a strong exact lexical match
 *   already present among the candidates for the query text.
 */

import { getRagTransport } from './transport';

export interface RerankCandidate {
  id: string;
  text: string;
  score: number;
}

interface VoyageRerankResult {
  index: number;
  relevance_score: number;
}

interface VoyageRerankResponse {
  results?: VoyageRerankResult[];
}

const MIN_CANDIDATES_FOR_RERANK = 15;

function isRerankerEnabled(): boolean {
  return process.env.RERANKER_ENABLED === 'true';
}

/**
 * True when the query text appears verbatim (case-insensitive) inside any
 * candidate's text — a strong signal that lexical matching already found
 * the right answer and semantic reranking would add little value.
 */
function hasStrongLexicalAnchor(
  query: string,
  candidates: RerankCandidate[]
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return false;
  }
  return candidates.some((candidate) =>
    candidate.text.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Reorders `candidates` per the gateway's relevance scores, then APPENDS any
 * candidate the gateway omitted from `response.results` (e.g. a partial
 * response covering only a subset of the input) after the reranked ones, in
 * their original relative order. This preserves every input candidate — the
 * gateway's response is a hint for ordering, never a filter over the result
 * set.
 */
function applyRerankOrder(
  candidates: RerankCandidate[],
  response: VoyageRerankResponse
): RerankCandidate[] {
  const results = response.results;
  if (!Array.isArray(results) || results.length === 0) {
    return candidates;
  }

  const sorted = [...results].sort(
    (a, b) => b.relevance_score - a.relevance_score
  );

  const rerankedIndices = new Set<number>();
  const reranked: RerankCandidate[] = [];
  for (const result of sorted) {
    const candidate = candidates[result.index];
    if (candidate !== undefined && !rerankedIndices.has(result.index)) {
      reranked.push(candidate);
      rerankedIndices.add(result.index);
    }
  }

  if (reranked.length === 0) {
    return candidates;
  }

  const remaining = candidates.filter(
    (_candidate, index) => !rerankedIndices.has(index)
  );

  return [...reranked, ...remaining];
}

/**
 * Reranks `candidates` for `query` via Voyage rerank-2.5-lite through the
 * Vercel AI Gateway. Always fails open to the original (RRF-ordered) input
 * on any error, timeout, disabled flag, or skip heuristic.
 */
export async function rerankCandidates(
  query: string,
  candidates: RerankCandidate[]
): Promise<RerankCandidate[]> {
  if (!isRerankerEnabled()) {
    return candidates;
  }
  if (candidates.length < MIN_CANDIDATES_FOR_RERANK) {
    return candidates;
  }
  if (hasStrongLexicalAnchor(query, candidates)) {
    return candidates;
  }

  try {
    const response = await getRagTransport().rerank(query, candidates);
    return applyRerankOrder(candidates, response);
  } catch (error) {
    console.warn(
      '[reranker] falling back to RRF order:',
      error instanceof Error ? error.message : String(error)
    );
    return candidates;
  }
}
