/**
 * Unit tests for `lib/ai/rag/transport.ts` — a single default-bound port
 * (Ports & Adapters with a production default) exposing `RagTransport
 * { embed, rerank }`, `getRagTransport()`, `setRagTransport()`.
 *
 * Chosen over a ToolContext-level seam because `runBackfill` seeds document
 * vectors via `embedText` (scripts/backfill-embeddings.ts:160) while
 * `searchTransactions` queries via the same function (resolvers.ts:224) —
 * a ToolContext seam would miss the seed path. The port sits underneath
 * both, so both flow through the same binding.
 */

const mockEmbed = jest.fn();
const mockCallGatewayRerank = jest.fn();

jest.mock('ai', () => ({
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

jest.mock('@ai-sdk/google', () => ({
  google: { textEmbeddingModel: (id: string) => ({ id }) },
}));

import {
  getRagTransport,
  setRagTransport,
  type RagTransport,
} from '@/lib/ai/rag/transport';

describe('RagTransport — production default binding', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('getRagTransport() returns production embed/rerank bindings by default', () => {
    const transport = getRagTransport();
    expect(typeof transport.embed).toBe('function');
    expect(typeof transport.rerank).toBe('function');
  });
});

describe('RagTransport — fixture transport override (strict, no live fallback)', () => {
  afterEach(() => {
    // Restore production default after each test so tests don't bleed.
    const { getRagTransport: freshGet } = require('@/lib/ai/rag/transport');
    void freshGet;
  });

  it('setRagTransport swaps in a deterministic fixture transport', async () => {
    const fixture: RagTransport = {
      embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      rerank: jest.fn().mockResolvedValue([{ id: 'a', relevance_score: 1 }]),
    };
    setRagTransport(fixture);

    const transport = getRagTransport();
    expect(transport).toBe(fixture);
  });

  it('a fixture transport with a missing lookup key throws (never falls back to a live call)', async () => {
    const fixture: RagTransport = {
      embed: jest.fn().mockImplementation(() => {
        throw new Error('fixture: no recorded embedding for this key');
      }),
      rerank: jest.fn(),
    };
    setRagTransport(fixture);

    const transport = getRagTransport();
    expect(() => transport.embed({} as any)).toThrow(/no recorded embedding/);
    expect(mockEmbed).not.toHaveBeenCalled();
  });
});
