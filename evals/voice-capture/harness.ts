import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';
import {
  embeddingNeighbors,
  lexicalNeighbors,
  recategorize,
  type Embedder,
  type Neighbor,
} from '@/lib/ai/voice-capture/history-retrieval';
import { scoreCase, type RunResult } from './scoring';
import type { CaptureEvalCase } from './types';

export type Variant = 'none' | 'full-history' | 'lexical' | 'embedding';

export interface StoredRun extends RunResult {
  variant: Variant;
  run: number;
  predicted?: CapturedTransaction[];
  neighbors?: Neighbor[][];
}

export interface Extraction {
  predicted: CapturedTransaction[];
  latencyMs: number;
  usage: { inputTokens?: number; outputTokens?: number };
}

export interface JobDeps {
  extract: (c: CaptureEvalCase, withHistory: boolean) => Promise<Extraction>;
  embed: Embedder;
  documentCache: Map<string, number[]>;
  lexicalThreshold: number;
  embeddingThreshold: number;
}

/** Runs every variant of one case/run and returns one record per variant. */
export async function evaluateJob(
  c: CaptureEvalCase,
  run: number,
  deps: JobDeps
): Promise<StoredRun[]> {
  const out: StoredRun[] = [];
  try {
    const base = await deps.extract(c, false);
    const tokens = {
      inputTokens: base.usage.inputTokens,
      outputTokens: base.usage.outputTokens,
    };
    out.push({
      caseId: c.id,
      variant: 'none',
      run,
      latencyMs: base.latencyMs,
      score: scoreCase(c, base.predicted),
      predicted: base.predicted,
      ...tokens,
    });

    const queries = base.predicted.map((p) => p.merchant ?? p.description);
    const lexNeighbors = queries.map((q) => lexicalNeighbors(q, c.history, 3));
    out.push({
      caseId: c.id,
      variant: 'lexical',
      run,
      latencyMs: base.latencyMs,
      score: scoreCase(
        c,
        recategorize(
          base.predicted,
          lexNeighbors,
          c.categories,
          deps.lexicalThreshold
        )
      ),
      predicted: base.predicted,
      neighbors: lexNeighbors,
      ...tokens,
    });

    // The embedding API can fail on its own; that must not erase the
    // baseline and lexical results already recorded for this run.
    try {
      const t0 = Date.now();
      const embNeighbors: Neighbor[][] = [];
      for (const q of queries) {
        embNeighbors.push(
          await embeddingNeighbors(
            q,
            c.history,
            3,
            deps.embed,
            deps.documentCache
          )
        );
      }
      out.push({
        caseId: c.id,
        variant: 'embedding',
        run,
        latencyMs: base.latencyMs + (Date.now() - t0),
        score: scoreCase(
          c,
          recategorize(
            base.predicted,
            embNeighbors,
            c.categories,
            deps.embeddingThreshold
          )
        ),
        predicted: base.predicted,
        neighbors: embNeighbors,
        ...tokens,
      });
    } catch (error) {
      out.push({
        caseId: c.id,
        variant: 'embedding',
        run,
        latencyMs: 0,
        score: null,
        error: String(error),
      });
    }
  } catch (error) {
    for (const variant of ['none', 'lexical', 'embedding'] as Variant[]) {
      out.push({
        caseId: c.id,
        variant,
        run,
        latencyMs: 0,
        score: null,
        error: String(error),
      });
    }
  }

  try {
    const withHistory = await deps.extract(c, true);
    out.push({
      caseId: c.id,
      variant: 'full-history',
      run,
      latencyMs: withHistory.latencyMs,
      score: scoreCase(c, withHistory.predicted),
      predicted: withHistory.predicted,
      inputTokens: withHistory.usage.inputTokens,
      outputTokens: withHistory.usage.outputTokens,
    });
  } catch (error) {
    out.push({
      caseId: c.id,
      variant: 'full-history',
      run,
      latencyMs: 0,
      score: null,
      error: String(error),
    });
  }
  return out;
}

export type GateThresholds = Record<string, number>;

/** Compares the baseline variant against minimums (maxForbiddenHits is a maximum). */
export function checkGate(
  summary: Record<string, number>,
  thresholds: GateThresholds | null
): { ok: boolean; failures: string[] } {
  if (!thresholds) {
    return {
      ok: false,
      failures: ['thresholds file missing: nothing to gate'],
    };
  }
  const failures = Object.entries(thresholds)
    .filter(([key, limit]) =>
      key === 'maxForbiddenHits'
        ? summary.forbiddenHits > limit
        : (summary[key] ?? 0) < limit
    )
    .map(([key, limit]) => {
      const actual =
        key === 'maxForbiddenHits' ? summary.forbiddenHits : summary[key];
      return `${key}: ${actual} vs ${limit}`;
    });
  return { ok: failures.length === 0, failures };
}

export interface RawRun {
  caseId: string;
  variant: Variant;
  run: number;
  latencyMs: number;
  predicted?: CapturedTransaction[];
  neighbors?: Neighbor[][];
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Rebuilds scored runs from a previous report's raw predictions, so scoring
 * or label fixes never need new model calls. Unknown cases are dropped.
 */
export function rescoreRawRuns(
  raw: RawRun[],
  cases: CaptureEvalCase[],
  thresholds: { lexical: number; embedding: number }
): StoredRun[] {
  const byId = new Map(cases.map((c) => [c.id, c]));
  return raw.flatMap((r): StoredRun[] => {
    const c = byId.get(r.caseId);
    if (!c) return [];
    if (r.error || !r.predicted) {
      return [{ ...r, score: null, error: r.error ?? 'missing predictions' }];
    }
    const retrieval = r.variant === 'lexical' || r.variant === 'embedding';
    const predicted =
      retrieval && r.neighbors
        ? recategorize(
            r.predicted,
            r.neighbors,
            c.categories,
            thresholds[r.variant as 'lexical' | 'embedding']
          )
        : r.predicted;
    return [{ ...r, score: scoreCase(c, predicted) }];
  });
}
