import { embed } from 'ai';
import { google } from '@ai-sdk/google';

/**
 * Single default-bound RAG transport port (Ports & Adapters), sitting
 * BELOW `embedText`/`rerankCandidates` rather than at the `ToolContext`
 * level. This is deliberate: `runBackfill` seeds document vectors via
 * `embedText` (scripts/backfill-embeddings.ts:160) while
 * `searchTransactions` queries via the same function (resolvers.ts:224) —
 * a `ToolContext`-level seam would miss the seed path and could let the two
 * flows use different providers. Binding here means both flow through the
 * same `getRagTransport()` call.
 *
 * Production is the default; a caller (e.g. the eval harness) swaps in a
 * deterministic fixture transport via `setRagTransport`. A fixture whose
 * lookup misses MUST throw — it never silently falls back to a live call.
 */
export interface RagTransport {
  embed: (params: {
    model: ReturnType<typeof google.textEmbeddingModel>;
    value: string;
    providerOptions: Record<string, unknown>;
  }) => Promise<{ embedding: number[] }>;
  rerank: (
    query: string,
    candidates: Array<{ id: string; text: string; score: number }>
  ) => Promise<{
    results?: Array<{ index: number; relevance_score: number }>;
  }>;
}

const RERANK_TIMEOUT_MS = 500;
const RERANK_MODEL = 'voyage/rerank-2.5-lite';
const DEFAULT_GATEWAY_RERANK_URL = 'https://ai-gateway.vercel.sh/v1/rerank';

function getGatewayRerankUrl(): string {
  return process.env.AI_GATEWAY_RERANK_URL || DEFAULT_GATEWAY_RERANK_URL;
}

async function productionRerank(
  query: string,
  candidates: Array<{ id: string; text: string; score: number }>
): Promise<{ results?: Array<{ index: number; relevance_score: number }> }> {
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

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

const productionTransport: RagTransport = {
  embed: (params) => embed(params as any),
  rerank: productionRerank,
};

let currentTransport: RagTransport = productionTransport;

/** Returns the current transport (production by default). */
export function getRagTransport(): RagTransport {
  return currentTransport;
}

/**
 * Swaps in a transport implementation (e.g. a deterministic fixture for
 * the eval harness). Pass no argument to reset to the production default.
 */
export function setRagTransport(
  transport: RagTransport = productionTransport
): void {
  currentTransport = transport;
}
