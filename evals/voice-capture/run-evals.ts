/**
 * Voice capture evals against the real model.
 *
 *   npx tsx --env-file=.env.local evals/voice-capture/run-evals.ts \
 *     [--k=2] [--cases=id1,id2] [--concurrency=3] [--gate]
 *
 * Variants (paired: lexical/embedding re-categorize the same extraction as none):
 *   none          current behaviour, no user history
 *   full-history  the user's history pasted into the prompt (no retrieval)
 *   lexical       none + trigram nearest-neighbour re-categorization
 *   embedding     none + gemini-embedding-001 cosine re-categorization
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGoogleModelFallbackChain } from '@/lib/ai/providers';
import { embedText } from '@/lib/ai/rag/embeddings';
import {
  extractCapturedTransactions,
  type CaptureMedia,
} from '@/lib/ai/voice-capture/capture-service';
import { recategorize } from '@/lib/ai/voice-capture/history-retrieval';
import {
  checkGate,
  evaluateJob,
  type GateThresholds,
  type StoredRun,
  type Variant,
} from './harness';
import { aggregateRuns, scoreCase } from './scoring';
import type { CaptureEvalCase } from './types';

const DATASET_DIR = path.join(__dirname, 'dataset');
const REPORT_PATH = path.join(DATASET_DIR, 'eval-report.json');
const THRESHOLDS_PATH = path.join(__dirname, 'thresholds.json');
const LEXICAL_THRESHOLD = 0.5; // fixed a priori; the sweep below is diagnostic
const EMBEDDING_THRESHOLD = 0.75;
const SWEEP = [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9];

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=')[1] : 'true';
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

function media(dir: string, file: string): CaptureMedia {
  const full = path.join(DATASET_DIR, dir, file);
  return {
    data: new Uint8Array(fs.readFileSync(full)),
    mediaType: MIME[path.extname(file)] ?? 'application/octet-stream',
  };
}

async function pool<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<void>
) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) await fn(queue.shift()!);
    })
  );
}

let embedCalls = 0;
let embedMs = 0;
async function timedEmbed(
  text: string,
  task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
) {
  const t0 = Date.now();
  embedCalls++;
  try {
    return await embedText(text, task);
  } finally {
    embedMs += Date.now() - t0;
  }
}

async function extract(c: CaptureEvalCase, withHistory: boolean) {
  let usage: { inputTokens?: number; outputTokens?: number } = {};
  const t0 = Date.now();
  const predicted = await extractCapturedTransactions({
    images: c.images.map((f) => media('images', f)),
    audio: c.audio ? media('audio', c.audio) : undefined,
    note: c.note,
    accounts: c.accounts,
    categories: c.categories,
    today: c.today,
    history: withHistory ? c.history : undefined,
    onUsage: (u) => (usage = u),
  });
  return { predicted, latencyMs: Date.now() - t0, usage };
}

async function main() {
  const k = Number(arg('k') ?? 2);
  const concurrency = Number(arg('concurrency') ?? 3);
  const only = arg('cases')?.split(',');
  const all: CaptureEvalCase[] = JSON.parse(
    fs.readFileSync(path.join(DATASET_DIR, 'cases.json'), 'utf8')
  );
  const cases = only ? all.filter((c) => only.includes(c.id)) : all;
  const docCaches = new Map<string, Map<string, number[]>>();
  const runs: StoredRun[] = [];

  const jobs = cases.flatMap((c) =>
    Array.from({ length: k }, (_, run) => ({ c, run }))
  );
  console.log(
    `Running ${cases.length} cases x ${k} runs (concurrency ${concurrency})`
  );

  await pool(jobs, concurrency, async ({ c, run }) => {
    if (!docCaches.has(c.id)) docCaches.set(c.id, new Map());
    const results = await evaluateJob(c, run, {
      extract,
      embed: timedEmbed,
      documentCache: docCaches.get(c.id)!,
      lexicalThreshold: LEXICAL_THRESHOLD,
      embeddingThreshold: EMBEDDING_THRESHOLD,
    });
    runs.push(...results);
    process.stdout.write(results.map((r) => (r.score ? '.' : 'E')).join(''));
  });
  console.log('');

  const variants: Variant[] = ['none', 'full-history', 'lexical', 'embedding'];
  const summary = Object.fromEntries(
    variants.map((v) => [v, aggregateRuns(runs.filter((r) => r.variant === v))])
  );
  const byTag: Record<
    string,
    Record<string, ReturnType<typeof aggregateRuns>>
  > = {};
  for (const tag of new Set(cases.flatMap((c) => c.tags))) {
    const ids = new Set(
      cases.filter((c) => c.tags.includes(tag)).map((c) => c.id)
    );
    byTag[tag] = Object.fromEntries(
      variants.map((v) => [
        v,
        aggregateRuns(runs.filter((r) => r.variant === v && ids.has(r.caseId))),
      ])
    );
  }

  // Diagnostic threshold sweep on the stored neighbours (no new model calls).
  const sweep = (variant: 'lexical' | 'embedding') =>
    SWEEP.map((t) => {
      const scored = runs
        .filter((r) => r.variant === variant && r.predicted && r.neighbors)
        .map((r) => {
          const c = cases.find((x) => x.id === r.caseId)!;
          return {
            ...r,
            score: scoreCase(
              c,
              recategorize(r.predicted!, r.neighbors!, c.categories, t)
            ),
          };
        });
      return {
        threshold: t,
        categoryAccuracy: aggregateRuns(scored).categoryAccuracy,
      };
    });

  const report = {
    timestamp: new Date().toISOString(),
    model: getGoogleModelFallbackChain().primary,
    k,
    cases: cases.length,
    thresholds: { lexical: LEXICAL_THRESHOLD, embedding: EMBEDDING_THRESHOLD },
    embeddings: { calls: embedCalls, totalMs: embedMs },
    summary,
    byTag,
    sweep: { lexical: sweep('lexical'), embedding: sweep('embedding') },
    // Raw predictions and neighbours: rescoring needs no new model calls.
    rawRuns: runs.map(
      ({ caseId, variant, run, latencyMs, predicted, neighbors, error }) => ({
        caseId,
        variant,
        run,
        latencyMs,
        predicted,
        neighbors,
        error,
      })
    ),
    perCase: cases.map((c) => ({
      id: c.id,
      difficulty: c.difficulty,
      tags: c.tags,
      variants: Object.fromEntries(
        variants.map((v) => {
          const rs = runs.filter((r) => r.caseId === c.id && r.variant === v);
          return [
            v,
            rs.map((r) =>
              r.score
                ? { ...r.score, latencyMs: r.latencyMs }
                : { error: r.error }
            ),
          ];
        })
      ),
    })),
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const pct = (x: number | null) =>
    x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`;
  console.log(
    '\n| variant | pass@1 | pass^k | recall | precision | forbidden | type | currency | category | keywords | p50 ms | p95 ms | in tok |'
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const v of variants) {
    const s = summary[v];
    console.log(
      `| ${v} | ${pct(s.passAt1)} | ${pct(s.passHatK)} | ${pct(s.recall)} | ${pct(s.precision)} | ${s.forbiddenHits} | ${pct(s.typeAccuracy)} | ${pct(s.currencyAccuracy)} | ${pct(s.categoryAccuracy)} | ${pct(s.keywordHitRate)} | ${s.latencyP50.toFixed(0)} | ${s.latencyP95.toFixed(0)} | ${s.avgInputTokens.toFixed(0)} |`
    );
  }
  console.log(
    `\nEmbeddings: ${embedCalls} calls, ${embedMs} ms total. Report: ${REPORT_PATH}`
  );

  if (arg('gate')) {
    const thresholds = fs.existsSync(THRESHOLDS_PATH)
      ? (JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8')) as GateThresholds)
      : null;
    const gate = checkGate(summary.none as Record<string, number>, thresholds);
    for (const failure of gate.failures) console.error(`GATE FAIL ${failure}`);
    if (!gate.ok) process.exit(1);
    console.log('Gate passed.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
