# Apply Progress: beginner-ux-10 — Work Unit #56 (tasks 1.1–1.3)

## Status

| Task                                     | State | Evidence                                                                                   |
| ---------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| 1.1 `.gitignore` + RED tests             | ✅    | `testLocales/` ignored; RED tests written and proven                                       |
| 1.2 Guard + redirect (GREEN)             | ✅    | 5/5 focused tests pass; safety net 13/13 (1 pre-existing skip)                             |
| 1.3 REFACTOR + E2E + real-run + beginner | ✅    | Blind beginner completed one real transfer unaided; Supabase evidence and cleanup verified |

## Evidence

| Item               | Exact result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused            | `npm test -- tests/unit/hooks/use-transaction-form.test.ts tests/dom/components/forms/transaction-form-transfer.test.tsx tests/components/desktop-add-transaction.test.tsx` → 3 suites PASS (13+2+3). Related 14 suites: 52 passed / 1 pre-existing skip                                                                                                                                                                                                                                                                           |
| Full verification  | Pre-push: type-check, lint, 1,694 tests, and production build pass; changed files pass prettier                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Real harness       | `npx tsx testLocales/56-transfer-real.ts` → PASS 12/12: real Dexie lone-row/pair 7/7; real Supabase `create_transfer` RPC pair, balances, atomic insufficient-balance rejection 5/5                                                                                                                                                                                                                                                                                                                                                |
| Blind-test defects | (A) double POST → ref in-flight guard in Desktop/Mobile `handleTransfer`; RED: "desktop double activation" it.each case saw 2 fetches → GREEN: exactly 1. Root cause: two SEPARATE RPC executions (transfer_ids `ed7a6ab0`/`201bbcdc`, 13.6s apart, opposite) — the 500 (B) broke post-transfer verification and drove the retry. (B) GET `/api/transfers` 500 → removed stale `'pending'` from `TRANSFER_TRANSACTION_LIST_PROJECTION`; RED→GREEN in `transfer-projections.test.ts` (Payload Reduction). No column/migration added |
| E2E                | `tests/e2e/25-transfer-canonical-flow.spec.ts` (@auth-required) added; NOT executed here — sandbox Turbopack panics compiling any `/api/*` route (reproduced; unrelated to change). Must re-run in orchestrator env/CI                                                                                                                                                                                                                                                                                                             |
| DB cleanup         | Two opposing $25 transfers deleted via real authenticated `delete_transaction_and_adjust_balance` RPC; R56 harness leftovers purged; fixtures verified Cash 250000 / Savings 150000; env left clean for the blind subagent                                                                                                                                                                                                                                                                                                         |
| Blind beginner     | One Cash→Savings confirmation completed unaided, rated 8/10; UI and Supabase showed one transferId, correct legs, balances 247500/152500, and history HTTP 200; cleanup restored seed state                                                                                                                                                                                                                                                                                                                                        |

## Changed-line count (vs HEAD, authored)

**≤ 400** after PR-readiness refactor: hook tests consolidated into `tests/unit/hooks/use-transaction-form.test.ts` (duplicate `tests/dom/hooks/*` deleted), redundant expense test and verbose comments removed, apply-progress compressed. Exact numstat verified at freeze.

## Rollback boundary

Revert `components/forms/transaction-form.tsx`, `components/transactions/desktop-add-transaction.tsx`, `components/transfers/{desktop,mobile}-transfer.tsx`, `hooks/use-transaction-form.ts`, `repositories/supabase/transfer-projections.ts`; delete the focused tests + E2E spec + `.gitignore` line. Canonical transfer repositories/UI otherwise untouched; no schema/migration change.

## Residual follow-ups (out of this slice)

- Versioned E2E remains CI evidence; the equivalent real authenticated browser flow passed through all three visible surfaces.
- Latent bug (pre-existing, both branches): `SupabaseTransfersRepository.delete()` passes `transaction_id_input` but the RPC param is `transaction_id` → delete-transfer fails with schema-cache error. Follow-up issue recommended.
- `lib/testing/canonical-fixtures.ts` imports from `@/tests/...` (prod→tests smell); flagged, untouched.
