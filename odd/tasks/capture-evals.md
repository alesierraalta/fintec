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

- T1 S2 pure scoring module `evals/voice-capture/scoring.ts` + unit tests — inline — commit: pending
- T2 S1 dataset generator (Playwright-rendered screens, TTS audio) + `dataset/cases.json` — worker — commit: pending
- T3 S2,S4 runner `evals/voice-capture/run-evals.ts` with variants none/lexical/embedding + optional `history` hint in capture service — inline — commit: pending
- T4 S3 parser benchmarks `evals/voice-capture/bench-parsers.ts` — inline — commit: pending
- T5 S4 run, analyse, write `evals/voice-capture/REPORT.md` with the recommendation — inline — commit: pending

## Log

- L1 (user): "haz benchmarks, evals y un dataset para que puedas validar, y ver si hace falta generar embeddings y una base de datos vectorial"
- L2 (discovery): pgvector already exists (migration 20251215000000_enable_vector.sql, HNSW index, hybrid_search_transactions RPC, lib/ai/rag/embeddings.ts with gemini-embedding-001 at 768 dims). The open question is whether capture should use it. Existing harness pattern: evals/receipt-scanner (Playwright-rendered images, ground-truth.json, eval-report.json).
- L3 (decision): worktree `.claude/worktrees/capture-evals` from origin/main aa1c2bbb.
