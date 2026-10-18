# Voice capture evals — results and the embeddings decision

Date: 2026-10-18 · Model: `gemini-3.1-flash-lite` (via `GOOGLE_MODEL`) · Embeddings: `gemini-embedding-001` (768 d)

## Recommendation

**Do not add embeddings or a vector database for capture categorization.** Put the user's own
labelled history (distinct `description → category` pairs, capped at 300) in the extraction prompt.

- It is the only variant that fixed every personal-convention case (6/6), it never hurt the other
  cases, latency did not change, and it costs ~660 extra input tokens per analysis (+31%).
- Retrieval (lexical or embeddings) found the right neighbours but a fixed similarity threshold
  could not decide when to trust them (see below), so both fixed only the case with literal overlap.
- pgvector is already in the database (`transactions.embedding`, HNSW, `hybrid_search_transactions`).
  If a user's distinct history ever exceeds the 300-hint cap, the next step is _retrieve top-k and put
  it in the prompt_ — try lexical first, it ranked as well as embeddings here — not a new store.

## Method

- Dataset `dataset/cases.json`: 16 cases, 61 expected movements, 6 forbidden rows (balances,
  cancelled/pending rows, a prompt-injection row, a non-financial chat), 18 Playwright-rendered
  screenshots, 4 Spanish TTS audio explanations. Four _personal-convention_ cases use a 40-category
  list where only the user's history reveals the right category (e.g. FARMATODO → "Salud", not the
  generic "Farmacia"; CINEX → "Salidas con pareja", not "Entretenimiento").
- `run-evals.ts`, k = 3 runs per case. Variants:
  - `none` — current production behaviour;
  - `full-history` — history hints in the prompt (separate model call);
  - `lexical` / `embedding` — re-categorize **the same** `none` extraction with the top trigram /
    cosine neighbour when similarity ≥ 0.5 / 0.75 (thresholds fixed before the run). Paired, so the
    difference is retrieval only.
- Scoring (`scoring.ts`): exact best assignment of predicted to expected movements per same
  date/amount group; accuracies micro-averaged over matched movements; `null` when nothing to measure.

## Results

All 48 runs per variant (errors count as failures):

| variant      | pass@1 | pass^3 | recall | precision | forbidden hits | category | p50 / p95 ms  | input tokens |
| ------------ | ------ | ------ | ------ | --------- | -------------- | -------- | ------------- | ------------ |
| none         | 81.3%  | 81.3%  | 100%   | 100%      | 0              | 95.1%    | 6143 / 61180  | 2107         |
| full-history | 93.8%  | 87.5%  | 97.9%  | 97.9%     | 0              | 98.9%    | 6216 / 56130  | 2770         |
| lexical      | 87.5%  | 87.5%  | 100%   | 100%      | 0              | 96.7%    | 6143 / 61180  | 2107         |
| embedding    | 56.3%  | 50.0%  | 62.5%  | 62.5%     | 0              | 97.4%    | 17280 / 63440 | 2073         |

`embedding` lost 18 runs to the embedding API quota ("You exceeded your current quota") after 880
calls; `full-history` lost 1 run to a model "high demand" error. Type, currency and description
keywords were 100% for every variant.

Paired on the 29 (case, run) pairs where all four variants succeeded:

| variant          | pass@1   | category | convention cases | other cases |
| ---------------- | -------- | -------- | ---------------- | ----------- |
| none             | 79.3%    | 94.5%    | 0/6              | 100%        |
| **full-history** | **100%** | **100%** | **6/6**          | 100%        |
| lexical          | 89.7%    | 97.2%    | 3/6              | 100%        |
| embedding        | 89.7%    | 97.2%    | 3/6              | 100%        |

Every `none` failure is a personal convention. Retrieval fixed only `convention-lexical`
("PAGO MOVIL MARIA PEREZ" vs history "Pago a María Pérez"). `convention-semantic-rides` was already
right without history (the model separates "Yummy Rides" from "Yummy").

### Why retrieval did not fix the semantic cases

The neighbours were right; the decision rule was not.

- CINEX LIDER → embedding top-3 were all "Salidas con pareja" at cosine 0.63–0.65, below 0.75.
- FARMATODO → lexical top-1 was "Farmacia SAAS → Salud" at 0.24, below 0.5.
- Lowering thresholds hurts more than it helps (diagnostic sweep over the same runs): embedding
  category accuracy 0.95 at 0.75 but 0.54 at 0.6 and 0.40 at ≤ 0.5; lexical 0.90 at 0.4–0.6 and 0.80
  at 0.3. Gemini embeddings score unrelated merchants in the same band as related ones.

The model, given the history as context, makes that judgement correctly.

### Cost

- `full-history`: +663 input tokens per analysis on average; latency unchanged.
- Embeddings: 880 calls, 422 s of sequential embedding time, and the free-tier quota ran out. In
  production only query embeddings would be needed (transactions are already embedded), but each
  movement would still add a network round trip and quota usage.

## Benchmarks (`bench-parsers.ts`, deterministic code)

| benchmark                          | size                | median |
| ---------------------------------- | ------------------- | ------ |
| statement CSV parse + map          | 50,000 rows         | 137 ms |
| quick entry parse                  | 10,000 items        | 11 ms  |
| lexical re-categorize 20 movements | 10,000 history rows | 617 ms |

Everything scales linearly and is small next to the 6–60 s model latency. (The normalizer caps
output at 200 movements, so its 10k-row timing measures the cap, not throughput.)

## Limitations

- Synthetic screenshots and TTS audio; real photos and real voices may be harder.
- Only 6 convention movements across 4 cases; the effect is large (0/6 vs 6/6) but the sample is small.
- The embedding variant has partial coverage because of the quota (29/48 complete pairs).
- Untested: retrieved top-k hints in the prompt (only needed beyond the 300-hint cap).
- One model version; re-run after any model change.

## Issues found and fixed while building this (TSP)

Order-dependent pairing, vacuous 100% accuracy on unmatched runs, an embedding failure erasing
baseline results, a `--gate` that passed without thresholds, `0%` instead of `n/a`, five ambiguous
labels (e.g. "Café" labelled "Alimentación" while a "Café" category exists — now accept both), and
token usage missing from rescored reports. Each is pinned by a test in `tests/node/evals/`.

## Running

```bash
npm run eval:capture -- --k=3            # real model, writes dataset/eval-report.json
npm run eval:capture -- --rescore --gate # rescore stored predictions, no model calls; exit 1 below thresholds.json
npm run eval:capture:generate            # regenerate screenshots, audio and cases
npm run bench:capture                    # parser benchmarks, writes bench-report.json
```
