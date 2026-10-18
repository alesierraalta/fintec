# Capture evals, benchmarks and embeddings decision

Measure "Capturas + voz" against a labelled dataset with the real model, benchmark the
deterministic capture parsers, and decide with data whether the feature should use the
existing pgvector embeddings (transactions.embedding, gemini-embedding-001, 768 dims).

## Specs

- S1 Dataset: labelled cases to validate the capture feature. User: "haz benchmarks, evals y un dataset para que puedas validar".
- S2 Evals: run the real extraction against the dataset, repeated runs per case, report movement recall/precision, ignored rows, type/currency/category/description accuracy, pass^k and latency; exit non-zero below thresholds.
- S3 Benchmarks: throughput of the deterministic parsers (statement CSV, quick entry, capture normalizer) at realistic and large sizes.
- S4 Decision: "y ver si hace falta generar embeddings y una base de datos vectorial" — compare no history vs lexical history retrieval vs embedding retrieval on category accuracy, tokens and latency; recommend with evidence.

## Tasks

- T1 S2 pure scoring module `evals/voice-capture/scoring.ts` + unit tests — inline — commit: `b3c02026`
- T2 S1 dataset generator (Playwright-rendered screens, TTS audio) + `dataset/cases.json` — worker — commit: `6002e710`
- T3 S2,S4 runner `evals/voice-capture/run-evals.ts` with variants none/lexical/embedding + optional `history` hint in capture service — inline — commit: `a3065a8b`, `b375d480`
- T4 S3 parser benchmarks `evals/voice-capture/bench-parsers.ts` — inline — commit: `b375d480`
- T5 S4 run, analyse, write `evals/voice-capture/REPORT.md` with the recommendation — inline — commit: see L6

## Log

- L1 (user): "haz benchmarks, evals y un dataset para que puedas validar, y ver si hace falta generar embeddings y una base de datos vectorial"
- L2 (discovery): pgvector already exists (migration 20251215000000_enable_vector.sql, HNSW index, hybrid_search_transactions RPC, lib/ai/rag/embeddings.ts with gemini-embedding-001 at 768 dims). The open question is whether capture should use it. Existing harness pattern: evals/receipt-scanner (Playwright-rendered images, ground-truth.json, eval-report.json).
- L3 (decision): worktree `.claude/worktrees/capture-evals` from origin/main aa1c2bbb.
- L4 (user): "haz el TSP". Defects pinned RED then fixed (`90808c48`): order-dependent pairing, vacuous accuracy on unmatched runs, embedding failure erasing baseline results, silent `--gate` without thresholds, 0% instead of n/a. First k=3 run stopped because its scoring was invalid.
- L5 (evidence): k=3 run against Gemini: 18 embedding runs lost to embedding quota after 880 calls. Five ambiguous dataset labels fixed (category sets) and report rescored offline; token usage now kept in raw runs.
- L6 (decision, evidence in evals/voice-capture/REPORT.md): no new embeddings/vector DB. Paired on 29 complete runs: full-history 100% pass@1 and 6/6 convention cases; lexical and embedding 3/6; none 0/6; all variants 100% on non-convention cases. Retrieval found correct neighbours but fixed thresholds could not decide. Next step: wire history hints (distinct description->category, cap 300) into the capture route. Slice note: branch exceeds ~400 authored lines mostly due to generated dataset JSON and tests.
- L7 (user): "si continua". Wired history into /api/ai/capture-batch (`e4038bec`): latest 1000 transactions -> buildHistoryHints (distinct description->category, cap 300; skips transfers, reconciliation adjustments, uncategorized); history load failure falls back to no hints. Tests RED then GREEN; jest dom+node 2334 passed (pending-page/categories-page flaked once under parallel load, 2/2 green isolated, untouched by this branch); tsc 0; oxlint 0.
