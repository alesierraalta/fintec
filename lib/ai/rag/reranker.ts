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

const RERANK_TIMEOUT_MS = 500;
const MIN_CANDIDATES_FOR_RERANK = 15;
const RERANK_MODEL = 'voyage/rerank-2.5-lite';
const DEFAULT_GATEWAY_RERANK_URL = 'https://ai-gateway.vercel.sh/v1/rerank';

function isRerankerEnabled(): boolean {
  return process.env.RERANKER_ENABLED === 'true';
}

function getGatewayRerankUrl(): string {
  return process.env.AI_GATEWAY_RERANK_URL || DEFAULT_GATEWAY_RERANK_URL;
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
  const reranked = sorted
    .map((result) => candidates[result.index])
    .filter(
      (candidate): candidate is RerankCandidate => candidate !== undefined
    );

  return reranked.length > 0 ? reranked : candidates;
}

async function callGatewayRerank(
  query: string,
  candidates: RerankCandidate[]
): Promise<VoyageRerankResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RERANK_TIMEOUT_MS);

  try {
    const response = await fetch(getGatewayRerankUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        query,
        documents: candidates.map((candidate) => candidate.text),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Reranker gateway request failed with status ${response.status}`
      );
    }

    return (await response.json()) as VoyageRerankResponse;
  } finally {
    clearTimeout(timeoutId);
  }
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
    const response = await callGatewayRerank(query, candidates);
    return applyRerankOrder(candidates, response);
  } catch (error) {
    console.warn(
      '[reranker] falling back to RRF order:',
      error instanceof Error ? error.message : String(error)
    );
    return candidates;
  }
}
