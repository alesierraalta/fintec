# Voice capture dataset

Synthetic, fictional mobile screenshots and labelled Spanish explanations for capture extraction. No real customer data. All cases use 2026-10-17 as today, 40 category candidates, and 42–47 labelled historical transactions (mostly distractors). Category IDs are normalized kebab-case names. Screens are 410 CSS pixels wide at device scale 2, palette-compressed losslessly after quantization to stay below 250 KB.

| Case                         | Tests                                                   |
| ---------------------------- | ------------------------------------------------------- |
| binance-basic                | Four USDT movements; ignore available balance           |
| binance-cancelled-pending    | Ignore cancelled and pending rows                       |
| banesco-bs                   | Venezuelan thousands separators and decimal commas      |
| bdv-pagomovil-mixed          | Incoming/outgoing Pago Móvil with references            |
| overlap-two-screens          | Deduplicate two shared rows                             |
| partial-explanation          | Only two rows described; other categories unconstrained |
| prompt-injection             | Treat malicious concept as data; retain its real debit  |
| many-rows                    | Recall across twenty rows in a tall screenshot          |
| multi-account                | Preserve Binance USDT and Banesco VES currencies        |
| dates-without-year           | Infer 2026 for October dates                            |
| non-financial                | WhatsApp discussion is not a payment                    |
| convention-lexical           | María Pérez means Alquiler, not Transferencias          |
| convention-semantic-pharmacy | SAAS/Locatel history implies Salud for Farmatodo        |
| convention-semantic-cinema   | Cinema history implies Salidas con pareja               |
| convention-semantic-rides    | Distinguish rides from Yummy food delivery              |
| zinli-usd                    | USD expenses and income                                 |

## Regenerate

From this worktree root, with installed Playwright Chromium, ffmpeg, and tsx:

```sh
npx tsx evals/voice-capture/generators/generate-dataset.ts
```

The generator validates the JSON read back from disk: required fields, category references, ISO dates, amount/type/currency constraints, asset existence and size, and expected/forbidden collisions. It prints per-case counts and aggregate asset sizes; validation failure exits nonzero.

Audio uses an enabled Windows `es-*` System.Speech voice through `powershell.exe`, a `wslpath -w` WAV destination, then ffmpeg Opus at 24 kbps. When TTS fails, the explanation becomes `note` with `audio-fallback`. This generation produced four OGG explanations; binance-basic fell back to text after a PowerShell failure. WAV files are regeneration intermediates, not referenced evaluation inputs. TTS availability can vary between runs.

These are synthetic bank-inspired layouts, not official app replicas. Non-financial chat amounts use the fixed schema's `injection` forbidden reason because it has no non-financial reason. The dataset measures extraction and history-retrieval behavior, not authentic screenshot distribution or a vector-database recommendation by itself.
