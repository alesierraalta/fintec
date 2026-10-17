# Voice + screenshot capture

Log many movements at once: the user uploads screenshots (e.g. Binance history) and explains them
by voice (or text); the AI extracts every movement, labels it from the explanation, and the user
reviews the list before saving. Builds on `components/bulk-capture/*` (feat/low-friction-capture).

## Specs

- S1 Input: one or more screenshots plus an explanation recorded as audio in the app, an uploaded audio file, or typed text. User: "se puedan grabar audios donde se explique más o menos cuál es [...] te paso una captura con todos los gastos e incomes. De, de mi Binance".
- S2 The AI associates the explanation with the movements in the screenshots ("esta fecha, todo esto es de [...] cuando fui al cine, [...] cuando me cobré sueldo") and proposes, per movement: date, amount, currency, type (gasto/ingreso), description from the explanation, category and account.
- S3 Review before saving, like the existing batch: editable list with per-row checkbox; nothing is saved until the user confirms. User: "tal cual" (answer to: guardar tras revisión como el lote actual).
- S4 Saved movements are normal transactions (count in statistics), tagged `captura-voz`; history duplicates start unchecked.
- S5 Server-side safety: authenticated, rate limited, bounded upload sizes/counts; suggested account/category ids are only kept when they belong to the user.

## Tasks

- T1 S2,S5 pure normalizer `lib/ai/voice-capture/normalize.ts` + tests — inline — commit: `538bb84d`
- T2 S1,S2,S5 service `lib/ai/voice-capture/capture-service.ts` + route `app/api/ai/capture-batch/route.ts` + route tests — inline — commit: `538bb84d` (route RED not observed: test and route written in one step)
- T3 S1,S3,S4 `components/bulk-capture/voice-capture-modal.tsx` + menu option + page wiring (`?action=voice`) + Android RECORD_AUDIO + tests — worker + parent fixes (image compression, currency-mismatch warning, non-JSON error) — commit: `4e59c7d0`
- T4 verify — inline — done: jest dom+node 2278 passed / 12 skipped; tsc 0; oxlint 0; prettier clean; negative control (compression/warning removed → 2 tests red, restored). Real run against Gemini with a synthetic Binance screenshot + Spanish TTS audio: 4/4 movements, balance and cancelled row skipped, descriptions/categories from the audio, 36 s latency.

## Log

- L1 (user, original): "Una forma, no sé si te parece, es que se puedan grabar audios donde se explique más o menos cuál es, o sea, yo te paso una foto con un montón de, de, de cosas, o sea, ponte que te paso una captura con todos los gastos e incomes. De, de mi Binance, por ejemplo, y te digo, bueno, esta fecha, todo esto es de, bueno, cuando fui al cine, todo esto es de cuando fui a tal, todo esto cuando hice tal, todo esto es de cuando me cobré sueldo, esto es de tal, esto es de tal, esto es de tal. Eso podría ser una forma bastante interesante de, y o, claramente luego de que la IA los asocie, asocie mi grabación con las fotos y haga automáticamente las... O sea, todo el tema de gastos incluso."
- L2 (user): "tal cual" — interpreted as: AI proposes, user reviews the list and saves in batch (same as the receipt batch).
- L3 (decision): Gemini (AI_PROVIDER=google) handles images+audio in one generateObject call; audio requires a Google key, text explanation works with any vision provider. Worktree `.claude/worktrees/voice-capture` from 29f7460e because the shared checkout is used by another session (it committed 14d7da8d on feat/low-friction-capture).
- L4 (user): "haz el TSP". Real Gemini runs: audio/webm, audio/ogg (WhatsApp), audio/mp4 (iOS) all 4/4 correct; overlapping screenshots deduplicated (4, not 6). Defects pinned RED then fixed: 'Bs'/'Bs.' became USD and auto-assigned the USD account; unreadable currency guessed USD; sub-precision amounts (USDT dust, 2 decimals) aborted batch saves. Open: latency 15-58 s observed vs route maxDuration 60 (deployment decision); future-dated rows (misread year) are not flagged (razonado).
