# Test plan — FinTec · AI Multi-Tool Chat & Streaming Resilience (TSP)

Created: 2026-11-03 · Last updated: 2026-11-03 · Plan path: `docs/testing/test-plan-ai-multi-tool-streaming.md` · Sandbox: worktree `ai-multi-tool-streaming-tsp` · Findings precision: 4 / 4
Baseline: `1344de47` · untracked files: 1 · fingerprint: `<assets/fingerprint.sh output>`

Tables are the format: prose never replaces a row.
A finding is a row whose cell opens with `path:line` and one line of finding.

## Inventory

| Surface                          | Entry points                                                         | Owner module  | Notes                                                              |
| -------------------------------- | -------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Query Transactions Tool          | `lib/ai/tools/resolvers.ts`, `lib/ai/tools/schemas.ts`               | ai/tools      | Filter and aggregation resolver for transaction data               |
| AI Model Adapters & Key Rotation | `lib/ai/providers.ts`, `lib/ai/config.ts`                            | ai/providers  | Google fallback chain, quota error classifier, key pool            |
| Chat Streaming Pipeline          | `lib/ai/stream-with-fallback.ts`, `app/api/chat/route.ts`            | ai/stream     | Resilient streaming, tool loop execution, error wrapper            |
| Chat Message Presentation        | `components/ai/chat-message.tsx`, `components/ai/chat-interface.tsx` | components/ai | Tool chips, markdown formatting, empty/interrupted stream recovery |

## Ranked targets

| Target                                  | Blast radius | Churn / past fixes | Consequence class                     | Existing evidence                                         | Altitude           | Target rung | Sibling skill                | Verdict | Status | Run          |
| --------------------------------------- | ------------ | ------------------ | ------------------------------------- | --------------------------------------------------------- | ------------------ | ----------- | ---------------------------- | ------- | ------ | ------------ |
| `queryTransactions` typed aggregation   | High         | High               | Data corruption / Financial error     | `tests/node/lib/ai/tools/resolvers.test.ts`               | Unit               | L2          | `test-strategy`              | pin     | done   | ai-streaming |
| HTTP 503 / 429 transient classification | High         | Med                | Availability loss / Hang              | `tests/node/lib/ai/providers.test.ts`                     | Unit               | L2          | `resilience-fault-injection` | pin     | done   | ai-streaming |
| Asynchronous stream error handling      | High         | High               | Process abort / 0 text tokens         | `tests/node/lib/ai/stream-with-fallback.test.ts`          | Unit / Integration | L3          | `resilience-fault-injection` | pin     | done   | ai-streaming |
| Chat message tool-only empty notice     | Med          | Med                | User confusion / Broken UI perception | `tests/components/ai/chat-transaction-rendering.test.tsx` | Component          | L4          | `frontend-aesthetics`        | pin     | done   | ai-streaming |

Verdicts: probe · pin · none. Statuses: pending · in progress · done · blocked · n/a.

## Real-run recipes

| Journey                    | Start command | Data setup                              | Sample requests                        | Expected observable                                         |
| -------------------------- | ------------- | --------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| AI Chat multi-step inquiry | `pnpm dev`    | Authenticated session with transactions | "en que he gastado y en que he ganado" | Two tool chips followed by clear textual markdown synthesis |

## Layer matrix

| Layer                      | Skill                          | Scope                                             | Status | Run          |
| -------------------------- | ------------------------------ | ------------------------------------------------- | ------ | ------------ |
| Security                   | `appsec-adversarial-auditor`   | auth boundaries, RLS scope                        | done   | ai-streaming |
| Runtime and faults         | `resilience-fault-injection`   | transient 503/429 recovery, mid-stream disconnect | done   | ai-streaming |
| Persistence and migrations | `database-persistence-testing` | transaction query correctness, typed totals       | done   | ai-streaming |
| Architecture conformance   | `clean-architecture-audit`     | repository abstraction, adapter isolation         | done   | ai-streaming |
| Critical e2e journeys      | `real-run-validation`          | multi-tool parallel calling to text response      | done   | ai-streaming |
| Sandbox                    | `docker-test-containers`       | ephemeral isolation                               | done   | ai-streaming |

## Not testing, on purpose

| Target                                      | Reason                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Direct live third-party Gemini network spam | Mocked via unit tests and verified via single probe; avoids burning user API quota |

## Characterization (legacy)

| Test | Behavior pinned | Believed correct? | Promote or delete after the change |
| ---- | --------------- | ----------------- | ---------------------------------- |

## Execution log

| Date       | Target                       | Rung reached | Findings (path:line) | Promoted tests | Evidence (ledger id)   | Notes                         |
| ---------- | ---------------------------- | ------------ | -------------------- | -------------- | ---------------------- | ----------------------------- |
| 2026-11-03 | AI Chat Multi-Tool Streaming | L4           | 4 locations          | 4 tests        | E-01, E-02, E-03, E-04 | All 4 defects fixed and green |

## Findings

| Id   | Finding (path:line, one line)                                                                                                                        | Severity (consequence class) | Data safe? | Evidence id | Pinning test (suite path :: test name)                                                                                                                    | Status | Verdict by / date        | Reason                                                                     | Cited-files fingerprint at verdict |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------ | -------------------------------------------------------------------------- | ---------------------------------- |
| F-01 | `lib/ai/tools/resolvers.ts:186` queryTransactions drops args.type for groupBy queries, returning mixed income and expense totals                     | Critical                     | yes        | E-01        | `tests/node/lib/ai/tools/resolvers.test.ts :: filters by type when aggregate=groupBy is requested with args.type`                                         | fixed  | Antigravity / 2026-11-03 | Resolved via repository.transactions.findByFilters typed aggregation       | -                                  |
| F-02 | `lib/ai/providers.ts:92` isQuotaExceededError fails to classify HTTP 503 high demand as transient                                                    | High                         | yes        | E-02        | `tests/node/lib/ai/providers.test.ts :: classifies 503 high demand / model unavailable as a transient error`                                              | fixed  | Antigravity / 2026-11-03 | Resolved by adding 503 and high-demand keywords to transient error handler | -                                  |
| F-03 | `lib/ai/stream-with-fallback.ts:25` streamWithFallback lacks mid-stream error recovery; asynchronous step 2 failure aborts stream with 0 text tokens | High                         | yes        | E-03        | `tests/node/lib/ai/stream-with-fallback.test.ts :: provides a resilient stream response that handles mid-stream errors safely without unhandled abort`    | fixed  | Antigravity / 2026-11-03 | Resolved via createResilientStreamResponse TransformStream interceptor     | -                                  |
| F-04 | `components/ai/chat-message.tsx:55` ChatMessage renders only tool chips and no text or status notice when assistant stream is interrupted            | Medium                       | yes        | E-04        | `tests/components/ai/chat-transaction-rendering.test.tsx :: renders a notice or fallback when assistant message only has tool chips and no text response` | fixed  | Antigravity / 2026-11-03 | Resolved via chat-tool-only-notice fallback indicator                      | -                                  |

Status: open · confirmed · fixed · gap-closed · rejected · wontfix.

## Evidence ledger

| Id   | Claim                                                | Executed                   | Admit                                                               | Inputs and parameters                                                 | Observed                                                                                                  | Digest | Normalize | Mode | Mutate | Expect | Mutation or negative control → result            | Reproduction                               | Label (`observado` / `razonado`, literal) |
| ---- | ---------------------------------------------------- | -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ | --------- | ---- | ------ | ------ | ------------------------------------------------ | ------------------------------------------ | ----------------------------------------- |
| E-01 | `queryTransactions` ignores type in groupBy queries  | Ran Jest on resolvers test | `pnpm jest tests/node/lib/ai/tools/resolvers.test.ts`               | `{ type: 'EXPENSE', aggregate: 'groupBy', groupByField: 'category' }` | Expected repository.transactions.findByFilters to be called with EXPENSE, but rpc was called without type |        |           | host |        | fail   | Unmodified code fails because type is dropped    | Ask "en que he gastado y en que he ganado" | observado                                 |
| E-02 | `isQuotaExceededError` rejects HTTP 503 status       | Ran Jest on providers test | `pnpm jest tests/node/lib/ai/providers.test.ts`                     | `{ statusCode: 503, message: 'high demand' }`                         | Returned false instead of true                                                                            |        |           | host |        | fail   | Unmodified code fails because 503 is not in list | Live tool loop step 2                      | observado                                 |
| E-03 | `streamWithFallback` lacks resilient stream response | Ran Jest on stream test    | `pnpm jest tests/node/lib/ai/stream-with-fallback.test.ts`          | Stream error on step 2                                                | `createResilientStreamResponse` undefined                                                                 |        |           | host |        | fail   | Unmodified code crashes on mid-stream error      | Multi-turn tool failure                    | observado                                 |
| E-04 | `ChatMessage` renders empty bubble when no text      | Ran Jest on rendering test | `pnpm jest tests/components/ai/chat-transaction-rendering.test.tsx` | Message with only tool chips                                          | Unable to find element by testId                                                                          |        |           | host |        | fail   | Empty bubble shown                               | Interrupted assistant message              | observado                                 |

### Hypotheses (razonado)

| Hypothesis | Probe that would settle it |
| ---------- | -------------------------- |

## Calibration history

| Date | Skill version | K   | Found | Recall | Misses (file:line operator, why) | False positives |
| ---- | ------------- | --- | ----- | ------ | -------------------------------- | --------------- |

## Blocked by testability

| Target | Rung | Why | Minimal change that opens it |
| ------ | ---- | --- | ---------------------------- |

## Remaining, in order

1. Implement typed aggregation in `lib/ai/tools/resolvers.ts`
2. Add HTTP 503 and high-demand support to `lib/ai/providers.ts`, setting default chain to `gemini-3.1-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-pro`
3. Implement `createResilientStreamResponse` in `lib/ai/stream-with-fallback.ts` and integrate into `app/api/chat/route.ts`
4. Add empty tool notice fallback in `components/ai/chat-message.tsx`
