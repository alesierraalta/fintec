# Apply Progress: beginner-ux-10 — WU #56 (tasks 1.1–1.3)

**Status**: 1.1 ✅ (`testLocales/` ignored; RED proven) · 1.2 ✅ (guard+redirect GREEN; focused 5/5; safety net 13/13) · 1.3 ⏳ code/evidence done; PENDING beginner validation, E2E re-run, commit.

**Evidence**: focused `npm test -- tests/unit/hooks/use-transaction-form.test.ts tests/dom/components/forms/transaction-form-transfer.test.tsx tests/components/desktop-add-transaction.test.tsx tests/components/transfer-response-handling.test.tsx tests/node/repositories/transfer-projections.test.ts` → 5 suites PASS; related 14 suites, 64 passed / 1 pre-existing skip. `npm run type-check` exit 0 · lint 0 errors (0 new warnings) · prettier clean.
Real harness `npx tsx testLocales/56-transfer-real.ts` → PASS 12/12 (real Dexie pair/lone-row 7/7; real Supabase `create_transfer` RPC pair/balances/atomic failure 5/5).
Blind defects: (A) double POST → ref in-flight guard in Desktop/Mobile `handleTransfer` (RED: double activation = 2 fetches → GREEN: 1). Root cause: two SEPARATE RPC executions (`ed7a6ab0`/`201bbcdc`, 13.6s apart, opposite) — the 500 (B) drove the retry. (B) GET /api/transfers 500 → removed stale `'pending'` from the list projection (RED→GREEN, no migration). Edit-leg invariant: neither leg individually editable via generic TransactionForm — submit routes both to `/transfers` (parameterized RED→GREEN); creation redirects preserved. E2E `25-transfer-canonical-flow.spec.ts` (@auth-required) added; unexecuted here (sandbox Turbopack `/api` panic, unrelated). DB cleanup: opposing $25 transfers deleted via real authenticated delete RPC; fixtures Cash 250000 / Savings 150000; env clean.

**Changed-line count (vs planning commit 365a8e9)**: ≤ 400 authored (verified at freeze).

**Rollback**: revert the 5 production files + transfer-projections.ts; delete focused tests + E2E spec + `.gitignore` line. No schema change.

**Residual**: beginner validation (cannot fabricate) + E2E re-run (dashboard quick-action modal covered by unit+E2E only) · latent pre-existing bug `delete()` passes `transaction_id_input` vs RPC `transaction_id` (follow-up) · commit deferred.
