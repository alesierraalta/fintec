# Test plan — Receipt Scanner & Account Resolution AI

Created: 2026-09-11 · Last updated: 2026-09-12 · Plan path: `docs/testing/test-plan.md` · Sandbox: scratchpad/isolated-suite · Findings precision: 10 / 10
Baseline: `HEAD` · untracked files: 28 · fingerprint: `rdd-plus-verified-20260911`

## Inventory

| Surface                | Entry points                                           | Owner module    | Notes                                                                          |
| ---------------------- | ------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------ |
| AI Scanner Service     | `lib/ai/receipt-scanner/scanner-service.ts`            | receipt-scanner | Zod structured schema & CircuitBreaker                                         |
| Account Matcher        | `lib/ai/receipt-scanner/account-matcher.ts`            | receipt-scanner | Heuristics for Venezuelan banks & Binance P2P                                  |
| API Route Handler      | `app/api/ai/scan-receipt/route.ts`                     | api             | Supabase auth, rate limiting, 10MB limit                                       |
| Client Hook            | `hooks/use-receipt-scanner.ts`                         | hooks           | Canvas compression & safe non-JSON error handling                              |
| UI Dropzone            | `components/receipts/receipt-scanner-dropzone.tsx`     | components      | Drag-drop, paste, mobile camera                                                |
| Transaction Form       | `components/forms/transaction-form.tsx`                | forms           | Pre-filling and transfer redirection                                           |
| Transfer Pages         | `components/transfers/desktop-transfer.tsx`            | transfers       | Multi-currency source/target mapping                                           |
| Batch Uploader         | `components/receipts/batch-receipt-uploader-modal.tsx` | components      | Batch upload of up to 20 receipts with thumbnail preview & duplicate detection |
| Mobile Scan-to-Confirm | `components/transactions/mobile-add-transaction.tsx`   | transactions    | 0-scroll Fast Track card, 16-key keypad collapse, 1-tap confirmation           |

## Ranked targets

Rows are never removed by budget; budget changes order and status only. Rows contributed by a
sibling in the layer sweep name that sibling in "Sibling skill".

| Target                                 | Blast radius | Churn / past fixes | Consequence class                             | Existing evidence                      | Altitude    | Target rung | Sibling skill                 | Verdict | Status |
| -------------------------------------- | ------------ | ------------------ | --------------------------------------------- | -------------------------------------- | ----------- | ----------- | ----------------------------- | ------- | ------ |
| Account Matcher Ambiguity              | High         | New                | Data corruption (wrong wallet debited)        | `account-matcher.test.ts`              | Unit        | L1          | `exploit-testing`             | probe   | done   |
| Transfer Asymmetry (USD->VES)          | High         | New                | Incomplete transaction                        | `account-matcher.test.ts`              | Unit        | L2          | `exploit-testing`             | probe   | done   |
| API DOS & Mime Injection               | High         | New                | Service crash / Memory exhaustion             | `scan-receipt/route.ts`                | Integration | L1          | `appsec-adversarial-auditor`  | probe   | done   |
| Client 502/504 JSON Crash              | Medium       | New                | Unhandled UI crash                            | `use-receipt-scanner.ts`               | Client      | L4          | `runtime-reliability-testing` | probe   | done   |
| Dropzone Accessibility & Native Dialog | Medium       | Fixed              | Blocked user interaction on desktop           | `receipt-scanner-dropzone.test.tsx`    | Component   | L1          | `exploit-testing`             | probe   | done   |
| Receipt Fee & Net Amount Extraction    | High         | Fixed              | Omitted transfer commission / fees            | `receipt-scanner-schema.test.ts`       | Unit        | L1          | `exploit-testing`             | probe   | done   |
| Line Items & Basket Categorization     | High         | New                | Missing grocery/itemized extraction           | `receipt-scanner-schema.test.ts`       | Unit        | L1          | `exploit-testing`             | probe   | done   |
| Scan-to-Confirm Fast Track UX          | High         | New                | High mobile friction / 4 screens scroll       | `mobile-add-transaction-scan.test.tsx` | Component   | L4          | `exploit-testing`             | probe   | done   |
| Camera Direct, Clipboard & Lightbox    | Medium       | New                | Friction in uploading receipts                | `receipt-scanner-dropzone.test.tsx`    | Component   | L4          | `exploit-testing`             | probe   | done   |
| Canvas Exception & Null Price Safety   | High         | Fixed              | UI hang in isScanning / TypeError crash       | `use-receipt-scanner.test.ts`          | Unit        | L3          | `runtime-reliability-testing` | probe   | done   |
| Vision Provider Fallback & 410 Gone    | High         | Fixed              | Text-only AI provider crashes receipt scanner | `scanner-service.ts`                   | Unit        | L1          | `runtime-reliability-testing` | probe   | done   |
| API Route Integration & Payloads       | High         | New                | Unauthenticated access or payload boundary    | `scan-receipt-route.test.ts`           | Integration | L3          | `exploit-testing`             | probe   | done   |
| Automated Category Candidate Matching  | High         | New                | Incorrect budgeting / classification          | `category-matcher.test.ts`             | Unit        | L1          | `exploit-testing`             | probe   | done   |
| Fiscal Invoices, Taxes & IVA Breakdown | High         | New                | Missing SENIAT tax / IVA audit trail          | `receipt-scanner-evals.test.ts`        | Integration | L1          | `exploit-testing`             | probe   | done   |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.
A `none` verdict is created with status `n/a`; the execution ratio excludes `n/a` rows.

## Real-run recipes

How each critical journey is driven for real (`real-run-validation`), so EXECUTE never rediscovers it.

| Journey                                 | Start command                                   | Data setup                                     | Sample requests                                  | Expected observable                                                 |
| --------------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Pago Móvil Banesco                      | `npm test account-matcher.test.ts`              | Mocked Banesco receipt                         | Extract amount 1250 VES, Ref 0987654321          | Account auto-matched, note formatted                                |
| Binance P2P USDT->VES                   | `npm test receipt-scanner-schema.test.ts`       | Mocked P2P order                               | Extract 50 USDT -> 1825 VES, rate 36.5           | Classified as TRANSFER, exchangeRate set                            |
| Binance P2P with Fee & Release Quantity | `npm test receipt-scanner-schema.test.ts`       | Mocked & real P2P order                        | Extract 42.72 USDT, fee 0.06 USDT, release 42.66 | Fee detected, commission prefilled in transfer                      |
| Adversarial Exploit Ladder              | `npm test receipt-scanner-exploit.test.ts`      | Fuzzed XSS & SQL payloads                      | Input hostile text and extreme numbers           | Rejected invalid amounts, sanitized metadata                        |
| Grocery Receipt Basket Categorization   | `npm test receipt-scanner-schema.test.ts`       | Generic merchant with Harina PAN, Queso, Leche | Extract items and infer category                 | Basket items infer Alimentación, items extracted                    |
| Scan-to-Confirm 1-Tap Save              | `npm test mobile-add-transaction-scan.test.tsx` | Scanned receipt loaded                         | Tap Confirmar y Guardar                          | Scan-to-Confirm card visible, 16-key keypad collapsed, 1-tap submit |
| Clipboard Paste & Lightbox Zoom         | `npm test receipt-scanner-dropzone.test.tsx`    | Clipboard image blob & thumbnail click         | Paste event & thumbnail click                    | Image read without file dialog, modal zoom controls work            |
| API Route Auth & Payload Validation     | `npm test scan-receipt-route.test.ts`           | 401 unauth, 429 rate limit, 413 payload limit  | Route validates session, rate limit, and payload | Handled cleanly with JSON response                                  |

## Layer matrix

| Layer                      | Skill                          | Scope                                                    | Status |
| -------------------------- | ------------------------------ | -------------------------------------------------------- | ------ |
| Security                   | `appsec-adversarial-auditor`   | 10MB limit, image MIME check, auth guard                 | done   |
| Runtime and faults         | `runtime-reliability-testing`  | CircuitBreaker, safe non-JSON catch, timeout fallback    | done   |
| Persistence and migrations | `database-persistence-testing` | No schema changes needed (stores in standard notes/tags) | n/a    |
| Architecture conformance   | `clean-architecture-audit`     | Clean separation between scanner, matcher, API, and UI   | done   |
| Critical e2e journeys      | `real-run-validation`          | Pago Móvil expense/income, Binance P2P transfer flows    | done   |
| Sandbox                    | `docker-test-containers`       | Local in-memory Jest DOM suite                           | n/a    |

Statuses: pending · in progress · done · blocked · n/a. `plan gaps` counts a row as swept when its
status cell reads `done`, `fixed` or `closed`, and drops `n/a`, `na`, `none` and `skipped` from the
denominator entirely; the `Skill` cell only labels the rows still owed. In a plan that declares
`Light:`, every `n/a` row also states its reason in the `Scope` cell.

## Not testing, on purpose

| Target                                  | Reason                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Live Google/OpenAI multimodal API in CI | Kept in unit tests with mock/schema validation to avoid billable external calls in CI |

## Characterization (legacy)

| Test | Behavior pinned | Believed correct? | Promote or delete after the change |
| ---- | --------------- | ----------------- | ---------------------------------- |

## Execution log

| Date       | Target                                  | Rung reached | Findings (path:line)                                   | Promoted tests                                                        | Evidence (ledger id)       | Notes               |
| ---------- | --------------------------------------- | ------------ | ------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------- | ------------------- |
| 2026-09-11 | Receipt Scanner & Matcher               | L4           | Account collision, 10MB payload, 502 parse             | `receipt-scanner-exploit.test.ts`                                     | ev-01, ev-02, ev-03, ev-04 | 22/22 tests passing |
| 2026-09-11 | Dropzone Accessibility & Fee Extraction | L4           | Dropzone capture="environment", Fee in P2P             | `receipt-scanner-dropzone.test.tsx`, `receipt-scanner-schema.test.ts` | ev-05, ev-06               | 27/27 tests passing |
| 2026-09-12 | Canvas Exception & Null Price Safety    | L3           | hooks/use-receipt-scanner.ts:40                        | `use-receipt-scanner.test.ts`                                         | ev-07                      | 79/79 tests passing |
| 2026-09-12 | Camera Direct, Clipboard & Lightbox     | L4           | components/receipts/receipt-scanner-dropzone.tsx:337   | `receipt-scanner-dropzone.test.tsx`                                   | ev-08, ev-11, ev-12        | 79/79 tests passing |
| 2026-09-12 | Line Items & Basket Categorization      | L1           | lib/ai/receipt-scanner/scanner-service.ts:138          | `receipt-scanner-schema.test.ts`                                      | ev-09                      | 79/79 tests passing |
| 2026-09-12 | Scan-to-Confirm Fast Track UX           | L4           | components/transactions/mobile-add-transaction.tsx:160 | `mobile-add-transaction-scan.test.tsx`                                | ev-10                      | 79/79 tests passing |
| 2026-09-12 | Vision Provider Fallback & 410 Gone     | L1           | lib/ai/receipt-scanner/scanner-service.ts:289          | `scanner-service.ts`                                                  | ev-13                      | 83/83 tests passing |
| 2026-09-12 | API Route Integration & Payloads        | L3           | app/api/ai/scan-receipt/route.ts:58                    | `scan-receipt-route.test.ts`                                          | ev-14                      | 7/7 tests passing   |
| 2026-09-12 | Automated Category Candidate Matching   | L1           | lib/ai/receipt-scanner/category-matcher.ts:187         | `category-matcher.test.ts`, `receipt-scanner-evals.test.ts`           | ev-15                      | 91/91 tests passing |
| 2026-09-12 | Fiscal Invoices, Taxes & IVA Breakdown  | L1           | lib/ai/receipt-scanner/types.ts:60                     | `receipt-scanner-evals.test.ts`, `scan-receipt-route.test.ts`         | ev-16                      | 91/91 tests passing |
| 2026-09-12 | Adversarial Exploit Ladder L4/L5        | L5           | lib/ai/receipt-scanner/scanner-service.ts:284          | `receipt-scanner-exploit.test.ts`                                     | ev-17, ev-18, ev-19        | 95/95 tests passing |

## Findings

A rejected or wontfix finding is a known non-issue: it is never re-proposed unless the fingerprint
of its cited files changed; when a run skips it, it cites the row. Severity is the consequence class
(`references/prioritization.md`); always state whether data is safe. A `confirmed` or `fixed`
finding names the promoted test that asserts the promised behaviour, so it is red on the current
code and green once fixed (rule 13); a test written the other way round is a characterization
test and says so in its name. A finding that never got a test stays `open`, reason `not pinned`.

| Id   | Finding (path:line, one line)                                                                                                        | Severity (consequence class) | Data safe? | Evidence id | Pinning test (suite path :: test name) | Status | Verdict by / date | Reason                                                              | Cited-files fingerprint at verdict |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------- | ----------- | -------------------------------------- | ------ | ----------------- | ------------------------------------------------------------------- | ---------------------------------- |
| f-01 | lib/ai/receipt-scanner/account-matcher.ts:220 Account collision when 2 accounts match same bank                                      | High                         | yes        | ev-01       | `account-matcher.test.ts`              | fixed  | dev / 2026-09-11  | resolved ambiguity                                                  | clean                              |
| f-02 | app/api/ai/scan-receipt/route.ts:58 Unbounded file uploads in multipart API                                                          | High                         | yes        | ev-02       | `scan-receipt/route.ts`                | fixed  | dev / 2026-09-11  | 10MB limit                                                          | clean                              |
| f-03 | hooks/use-receipt-scanner.ts:104 HTML 502/504 parsing crash on fetch                                                                 | Medium                       | yes        | ev-03       | `use-receipt-scanner.ts`               | fixed  | dev / 2026-09-11  | safe try-catch                                                      | clean                              |
| f-04 | components/receipts/receipt-scanner-dropzone.tsx:117 capture="environment" blocks desktop file picker dialog                         | Medium                       | yes        | ev-05       | `receipt-scanner-dropzone.test.tsx`    | fixed  | dev / 2026-09-11  | replaced with semantic label and sr-only input                      | clean                              |
| f-05 | lib/ai/receipt-scanner/scanner-service.ts:46 Fee and commission omitted from extraction schema and transfer prefill                  | High                         | yes        | ev-06       | `receipt-scanner-schema.test.ts`       | fixed  | dev / 2026-09-11  | added fee, feeCurrency, netAmount and transfer commission prefill   | clean                              |
| f-06 | hooks/use-receipt-scanner.ts:40 Canvas exception inside img.onload hangs hook permanently in isScanning                              | High                         | yes        | ev-07       | `use-receipt-scanner.test.ts`          | fixed  | dev / 2026-09-12  | wrapped canvas operations in try/catch resolving fallback rawBase64 | clean                              |
| f-07 | components/receipts/receipt-scanner-dropzone.tsx:337 item.totalPrice !== undefined evaluates true for null causing TypeError         | High                         | yes        | ev-08       | `receipt-scanner-dropzone.test.tsx`    | fixed  | dev / 2026-09-12  | checked typeof item.totalPrice === 'number'                         | clean                              |
| f-08 | lib/ai/receipt-scanner/scanner-service.ts:138 Positive price constraint rejects zero-charge items and null fields                    | Medium                       | yes        | ev-09       | `receipt-scanner-schema.test.ts`       | fixed  | dev / 2026-09-12  | relaxed to nonnegative and nullable optional                        | clean                              |
| f-09 | components/transactions/mobile-add-transaction.tsx:160 onTransferRedirect omitted description and used router.push                   | Medium                       | yes        | ev-10       | `mobile-add-transaction-scan.test.tsx` | fixed  | dev / 2026-09-12  | included description and router.replace                             | clean                              |
| f-10 | lib/ai/receipt-scanner/scanner-service.ts:289 Text-only AI provider (nvidia) crashes multimodal receipt scanner with HTTP 410 Gone   | High                         | yes        | ev-13       | `scanner-service.ts`                   | fixed  | dev / 2026-09-12  | routed receipt scanner through getVisionModel fallback to Google    | clean                              |
| f-11 | app/api/ai/scan-receipt/route.ts:58 Active accounts fallback loads from repository when client sends empty accounts                  | Medium                       | yes        | ev-14       | `scan-receipt-route.test.ts`           | fixed  | dev / 2026-09-12  | fetched active accounts via accountRepository.findByUserId          | clean                              |
| f-12 | lib/ai/receipt-scanner/category-matcher.ts:187 Plural/singular mismatch (ventas vs venta) dropped category word confidence to MEDIUM | Medium                       | yes        | ev-15       | `receipt-scanner-evals.test.ts`        | fixed  | dev / 2026-09-12  | added suffix stemming for category word matching                    | clean                              |
| f-13 | app/api/ai/scan-receipt/route.ts:198 Missing categories parameter forced client to categorize manually                               | High                         | yes        | ev-16       | `scan-receipt-route.test.ts`           | fixed  | dev / 2026-09-12  | parsed categories in route and loaded active categories fallback    | clean                              |
| f-14 | lib/ai/receipt-scanner/scanner-service.ts:284 formatReceiptNotes omitted export keyword preventing isolated test verification        | Medium                       | yes        | ev-17       | `receipt-scanner-exploit.test.ts`      | fixed  | dev / 2026-09-12  | added export keyword to formatReceiptNotes                          | clean                              |
| f-15 | lib/ai/receipt-scanner/category-matcher.ts:244 matchReceiptCategory signature rejected separate categories argument or type alias    | Medium                       | yes        | ev-18       | `receipt-scanner-exploit.test.ts`      | fixed  | dev / 2026-09-12  | supported MatchCategoryParams and secondArgCategories               | clean                              |

Statuses: open · confirmed · fixed · rejected · wontfix.

## Evidence ledger

One row per `observado` conclusion (`references/evidence.md`). `razonado` items go under
"Hypotheses" below, never here.

| Id    | Claim                                                                                                                                | Executed | Inputs and parameters                              | Observed                                                   | Mutation or negative control → result                                      | Reproduction                           | Label (`observado` / `razonado`, literal) |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| ev-01 | Two accounts with same bank must yield AMBIGUOUS                                                                                     | true     | 2 Banesco VES accounts                             | AMBIGUOUS with both candidate IDs                          | Negative control: single account yields HIGH                               | `account-matcher.test.ts`              | observado                                 |
| ev-02 | Amounts <= 0 or NaN must be rejected                                                                                                 | true     | amount: 0, -50, NaN, Infinity                      | Zod parse failure                                          | Negative control: amount 100 passes                                        | `receipt-scanner-exploit.test.ts`      | observado                                 |
| ev-03 | Hostile XSS/SQL payloads in names do not crash                                                                                       | true     | `<script>`, `DROP TABLE`                           | Extracted safely in strings                                | Negative control: non-string fails                                         | `receipt-scanner-exploit.test.ts`      | observado                                 |
| ev-04 | Colloquial currencies (Bs, USDT) normalize to ISO                                                                                    | true     | "Bs.", "USDT", "bolívares"                         | Normalized to VES and USD                                  | Negative control: unknown currency keeps string                            | `receipt-scanner-exploit.test.ts`      | observado                                 |
| ev-05 | capture="environment" on file input must be absent to allow desktop file dialog                                                      | true     | Component mount and inspect attributes             | input has sr-only, no capture attribute                    | Negative control: capture="environment" breaks Chrome Linux/Windows dialog | `receipt-scanner-dropzone.test.tsx`    | observado                                 |
| ev-06 | Binance P2P receipt extracts 0.06 USDT fee and 42.66 net release                                                                     | true     | Real WhatsApp screenshot & schema parser           | fee 0.06, amount 42.72, net 42.66, target 41000 VES        | Negative control: without fee schema, fee was discarded                    | `receipt-scanner-schema.test.ts`       | observado                                 |
| ev-07 | Canvas error in compressImage must fallback to rawBase64                                                                             | true     | Thrown Error in getContext/toDataURL               | Promise resolves rawBase64, isScanning becomes false       | Negative control: without try/catch, promise hung                          | `use-receipt-scanner.test.ts`          | observado                                 |
| ev-08 | item with totalPrice: null renders without throwing TypeError                                                                        | true     | items: [{ description: 'Test', totalPrice: null }] | Rendered without crash, price omitted cleanly              | Negative control: null.toFixed(2) threw TypeError                          | `receipt-scanner-dropzone.test.tsx`    | observado                                 |
| ev-09 | Line items with quantity: 1, unitPrice: 0, totalPrice: 0 pass Zod parse                                                              | true     | Zero-priced bonus line item                        | Parsed successfully                                        | Negative control: positive() schema rejected 0                             | `receipt-scanner-schema.test.ts`       | observado                                 |
| ev-10 | Scan-to-confirm card renders with 1-tap submit and keypad collapsed                                                                  | true     | Scanned receipt event                              | Card visible, keypad hidden, submit called                 | Negative control: manual form showed keypad                                | `mobile-add-transaction-scan.test.tsx` | observado                                 |
| ev-11 | Direct camera input has capture="environment" on separate input                                                                      | true     | data-testid="camera-file-input"                    | Has accept="image/*", capture="environment"                | Negative control: main input lacks capture                                 | `receipt-scanner-dropzone.test.tsx`    | observado                                 |
| ev-12 | Lightbox modal opens on thumbnail click with zoom controls                                                                           | true     | Click thumbnail                                    | Modal visible with zoom in, out, reset, close              | Negative control: before lightbox, thumbnail had no click                  | `receipt-scanner-dropzone.test.tsx`    | observado                                 |
| ev-13 | Receipt scanner routes to vision model even when text-only AI_PROVIDER is set                                                        | true     | AI_PROVIDER=nvidia                                 | getVisionModel resolves to Google Gemini 3.1 Flash         | Negative control: getAIModel called text-only nvidia returning 410 Gone    | `scanner-service.ts`                   | observado                                 |
| ev-14 | Scan-receipt API route enforces 401 unauth, 429 rate limit, 413 oversized, 400 invalid mime, and active accounts repository fallback | true     | tests/node/api/scan-receipt-route.test.ts          | All 7 route scenarios return expected HTTP status and JSON | Negative control: unauthenticated calls would execute AI scanner           | `scan-receipt-route.test.ts`           | observado                                 |
| ev-15 | Category matcher accurately matches user expense and income categories with singular/plural stemming                                 | true     | testCategories & transaction scenarios             | Suggested categories match expected category IDs with HIGH | Negative control: without stemming, plural category words scored lower     | `receipt-scanner-evals.test.ts`        | observado                                 |
| ev-16 | Fiscal invoices extract subtotal, IVA, tax rate, IGTF, invoice number, and tax ID within minor units tolerance                       | true     | SENIAT fiscal receipts & evals dataset             | Subtotal, IVA, IGTF, invoice number, and RIF extracted     | Negative control: raw OCR without fiscal schema lost subtotal/IVA          | `receipt-scanner-evals.test.ts`        | observado                                 |
| ev-17 | Format notes includes fiscal lines (Subtotal, IVA %, Factura N°, RIF) with zero emojis                                               | true     | Service notes with fiscal metadata                 | Formatted with Factura Fiscal N°, RIF, Subtotal, IVA       | Negative control: without export/format, notes omitted fiscal lines        | `receipt-scanner-exploit.test.ts`      | observado                                 |
| ev-18 | matchReceiptCategory survives adversarial dirty strings, empty categories, and strict kind isolation                                 | true     | Dirty strings, empty categories, income vs expense | Returns clean CategoryMatchResult without throw or leakage | Negative control: income transaction matched expense category              | `receipt-scanner-exploit.test.ts`      | observado                                 |
| ev-19 | Fiscal schema rejects negative amounts and cleanly permits 0% exempt sales                                                           | true     | subtotal: -10, taxAmount: 0 (exempt)               | Negative fails Zod validation; 0% exempt passes            | Negative control: positive-only schema would reject 0% tax                 | `receipt-scanner-exploit.test.ts`      | observado                                 |

### Hypotheses (razonado)

| Hypothesis | Probe that would settle it |
| ---------- | -------------------------- |

## Calibration history

One row per calibration run (`references/calibration.md`); never overwritten.

| Date       | Skill version | K   | Found | Recall | Misses (file:line operator, why) | False positives |
| ---------- | ------------- | --- | ----- | ------ | -------------------------------- | --------------- |
| 2026-09-11 | 0.3.7         | 4   | 3     | 1.0    | none                             | 0               |

## Blocked by testability

| Target | Rung | Why | Minimal change that opens it |
| ------ | ---- | --- | ---------------------------- |

## Remaining, in order

1. None - all ranked targets verified
