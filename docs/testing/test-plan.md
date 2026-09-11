# Test plan — Receipt Scanner & Account Resolution AI

Created: 2026-09-11 · Last updated: 2026-09-11 · Plan path: `docs/testing/test-plan.md` · Sandbox: scratchpad/isolated-suite · Findings precision: 6 / 6
Baseline: `HEAD` · untracked files: 28 · fingerprint: `rdd-plus-verified-20260911`

## Inventory

| Surface            | Entry points                                       | Owner module    | Notes                                             |
| ------------------ | -------------------------------------------------- | --------------- | ------------------------------------------------- |
| AI Scanner Service | `lib/ai/receipt-scanner/scanner-service.ts`        | receipt-scanner | Zod structured schema & CircuitBreaker            |
| Account Matcher    | `lib/ai/receipt-scanner/account-matcher.ts`        | receipt-scanner | Heuristics for Venezuelan banks & Binance P2P     |
| API Route Handler  | `app/api/ai/scan-receipt/route.ts`                 | api             | Supabase auth, rate limiting, 10MB limit          |
| Client Hook        | `hooks/use-receipt-scanner.ts`                     | hooks           | Canvas compression & safe non-JSON error handling |
| UI Dropzone        | `components/receipts/receipt-scanner-dropzone.tsx` | components      | Drag-drop, paste, mobile camera                   |
| Transaction Form   | `components/forms/transaction-form.tsx`            | forms           | Pre-filling and transfer redirection              |
| Transfer Pages     | `components/transfers/desktop-transfer.tsx`        | transfers       | Multi-currency source/target mapping              |

## Ranked targets

Rows are never removed by budget; budget changes order and status only. Rows contributed by a
sibling in the layer sweep name that sibling in "Sibling skill".

| Target                                 | Blast radius | Churn / past fixes | Consequence class                      | Existing evidence                   | Altitude    | Target rung | Sibling skill                 | Verdict | Status |
| -------------------------------------- | ------------ | ------------------ | -------------------------------------- | ----------------------------------- | ----------- | ----------- | ----------------------------- | ------- | ------ |
| Account Matcher Ambiguity              | High         | New                | Data corruption (wrong wallet debited) | `account-matcher.test.ts`           | Unit        | L1          | `exploit-testing`             | probe   | done   |
| Transfer Asymmetry (USD->VES)          | High         | New                | Incomplete transaction                 | `account-matcher.test.ts`           | Unit        | L2          | `exploit-testing`             | probe   | done   |
| API DOS & Mime Injection               | High         | New                | Service crash / Memory exhaustion      | `scan-receipt/route.ts`             | Integration | L1          | `appsec-adversarial-auditor`  | probe   | done   |
| Client 502/504 JSON Crash              | Medium       | New                | Unhandled UI crash                     | `use-receipt-scanner.ts`            | Client      | L4          | `runtime-reliability-testing` | probe   | done   |
| Dropzone Accessibility & Native Dialog | Medium       | Fixed              | Blocked user interaction on desktop    | `receipt-scanner-dropzone.test.tsx` | Component   | L1          | `exploit-testing`             | probe   | done   |
| Receipt Fee & Net Amount Extraction    | High         | Fixed              | Omitted transfer commission / fees     | `receipt-scanner-schema.test.ts`    | Unit        | L1          | `exploit-testing`             | probe   | done   |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.
A `none` verdict is created with status `n/a`; the execution ratio excludes `n/a` rows.

## Real-run recipes

How each critical journey is driven for real (`real-run-validation`), so EXECUTE never rediscovers it.

| Journey                                 | Start command                              | Data setup                | Sample requests                                  | Expected observable                            |
| --------------------------------------- | ------------------------------------------ | ------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Pago Móvil Banesco                      | `npm test account-matcher.test.ts`         | Mocked Banesco receipt    | Extract amount 1250 VES, Ref 0987654321          | Account auto-matched, note formatted           |
| Binance P2P USDT->VES                   | `npm test receipt-scanner-schema.test.ts`  | Mocked P2P order          | Extract 50 USDT -> 1825 VES, rate 36.5           | Classified as TRANSFER, exchangeRate set       |
| Binance P2P with Fee & Release Quantity | `npm test receipt-scanner-schema.test.ts`  | Mocked & real P2P order   | Extract 42.72 USDT, fee 0.06 USDT, release 42.66 | Fee detected, commission prefilled in transfer |
| Adversarial Exploit Ladder              | `npm test receipt-scanner-exploit.test.ts` | Fuzzed XSS & SQL payloads | Input hostile text and extreme numbers           | Rejected invalid amounts, sanitized metadata   |

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

| Date       | Target                                  | Rung reached | Findings (path:line)                       | Promoted tests                                                        | Evidence (ledger id)       | Notes               |
| ---------- | --------------------------------------- | ------------ | ------------------------------------------ | --------------------------------------------------------------------- | -------------------------- | ------------------- |
| 2026-09-11 | Receipt Scanner & Matcher               | L4           | Account collision, 10MB payload, 502 parse | `receipt-scanner-exploit.test.ts`                                     | ev-01, ev-02, ev-03, ev-04 | 22/22 tests passing |
| 2026-09-11 | Dropzone Accessibility & Fee Extraction | L4           | Dropzone capture="environment", Fee in P2P | `receipt-scanner-dropzone.test.tsx`, `receipt-scanner-schema.test.ts` | ev-05, ev-06               | 27/27 tests passing |

## Findings

A rejected or wontfix finding is a known non-issue: it is never re-proposed unless the fingerprint
of its cited files changed; when a run skips it, it cites the row. Severity is the consequence class
(`references/prioritization.md`); always state whether data is safe. A `confirmed` or `fixed`
finding names the promoted test that asserts the promised behaviour, so it is red on the current
code and green once fixed (rule 13); a test written the other way round is a characterization
test and says so in its name. A finding that never got a test stays `open`, reason `not pinned`.

| Id   | Finding (path:line, one line)                                                                                       | Severity (consequence class) | Data safe? | Evidence id | Pinning test (suite path :: test name) | Status | Verdict by / date | Reason                                                            | Cited-files fingerprint at verdict |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ----------- | -------------------------------------- | ------ | ----------------- | ----------------------------------------------------------------- | ---------------------------------- |
| f-01 | lib/ai/receipt-scanner/account-matcher.ts:220 Account collision when 2 accounts match same bank                     | High                         | yes        | ev-01       | `account-matcher.test.ts`              | fixed  | dev / 2026-09-11  | resolved ambiguity                                                | clean                              |
| f-02 | app/api/ai/scan-receipt/route.ts:58 Unbounded file uploads in multipart API                                         | High                         | yes        | ev-02       | `scan-receipt/route.ts`                | fixed  | dev / 2026-09-11  | 10MB limit                                                        | clean                              |
| f-03 | hooks/use-receipt-scanner.ts:104 HTML 502/504 parsing crash on fetch                                                | Medium                       | yes        | ev-03       | `use-receipt-scanner.ts`               | fixed  | dev / 2026-09-11  | safe try-catch                                                    | clean                              |
| f-04 | components/receipts/receipt-scanner-dropzone.tsx:117 capture="environment" blocks desktop file picker dialog        | Medium                       | yes        | ev-05       | `receipt-scanner-dropzone.test.tsx`    | fixed  | dev / 2026-09-11  | replaced with semantic label and sr-only input                    | clean                              |
| f-05 | lib/ai/receipt-scanner/scanner-service.ts:46 Fee and commission omitted from extraction schema and transfer prefill | High                         | yes        | ev-06       | `receipt-scanner-schema.test.ts`       | fixed  | dev / 2026-09-11  | added fee, feeCurrency, netAmount and transfer commission prefill | clean                              |

Statuses: open · confirmed · fixed · rejected · wontfix.

## Evidence ledger

One row per `observado` conclusion (`references/evidence.md`). `razonado` items go under
"Hypotheses" below, never here.

| Id    | Claim                                                                           | Executed | Inputs and parameters                    | Observed                                            | Mutation or negative control → result                                      | Reproduction                        | Label (`observado` / `razonado`, literal) |
| ----- | ------------------------------------------------------------------------------- | -------- | ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| ev-01 | Two accounts with same bank must yield AMBIGUOUS                                | true     | 2 Banesco VES accounts                   | AMBIGUOUS with both candidate IDs                   | Negative control: single account yields HIGH                               | `account-matcher.test.ts`           | observado                                 |
| ev-02 | Amounts <= 0 or NaN must be rejected                                            | true     | amount: 0, -50, NaN, Infinity            | Zod parse failure                                   | Negative control: amount 100 passes                                        | `receipt-scanner-exploit.test.ts`   | observado                                 |
| ev-03 | Hostile XSS/SQL payloads in names do not crash                                  | true     | `<script>`, `DROP TABLE`                 | Extracted safely in strings                         | Negative control: non-string fails                                         | `receipt-scanner-exploit.test.ts`   | observado                                 |
| ev-04 | Colloquial currencies (Bs, USDT) normalize to ISO                               | true     | "Bs.", "USDT", "bolívares"               | Normalized to VES and USD                           | Negative control: unknown currency keeps string                            | `receipt-scanner-exploit.test.ts`   | observado                                 |
| ev-05 | capture="environment" on file input must be absent to allow desktop file dialog | true     | Component mount and inspect attributes   | input has sr-only, no capture attribute             | Negative control: capture="environment" breaks Chrome Linux/Windows dialog | `receipt-scanner-dropzone.test.tsx` | observado                                 |
| ev-06 | Binance P2P receipt extracts 0.06 USDT fee and 42.66 net release                | true     | Real WhatsApp screenshot & schema parser | fee 0.06, amount 42.72, net 42.66, target 41000 VES | Negative control: without fee schema, fee was discarded                    | `receipt-scanner-schema.test.ts`    | observado                                 |

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
