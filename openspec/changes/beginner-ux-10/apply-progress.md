# Apply Progress: beginner-ux-10 — WU #56 (tasks 1.1–1.3)

**Status**: 1.1 ✅ (`testLocales/` ignored; RED proven) · 1.2 ✅ (guard+redirect GREEN; focused 5/5; safety net 13/13) · **1.3 ✅ complete** — REFACTOR, real driver, isolated auth E2E, and independent blind beginner observation all PASS (evidence below). No commit in this batch (explicitly requested).

**TDD evidence**: RED→GREEN→REFACTOR was completed across the transfer guard, canonical redirects, paired feedback, edit-leg invariant, double-submit protection, and transfer projection regression. Focused command `npm test -- tests/unit/hooks/use-transaction-form.test.ts tests/dom/components/forms/transaction-form-transfer.test.tsx tests/components/desktop-add-transaction.test.tsx tests/components/transfer-response-handling.test.tsx tests/node/repositories/transfer-projections.test.ts --runInBand` → 5 suites passed, 31 tests passed, 0 failed, 6.072s. Prior cumulative evidence: 14 suites, 64 passed / 1 pre-existing skip; type-check exit 0; lint 0 errors, 0 new warnings; prettier clean.

**Work Unit Evidence**:

| Evidence | Result |
|---|---|
| Focused tests | PASS — 5 suites / 31 tests, 0 failed; command recorded above. Corrective rerun: 3.625s, same 5/31 result. |
| Runtime harness (fresh, 2026-08-19) | `npx tsx testLocales/56-transfer-real.ts` (ignored driver, real Dexie + real Supabase) → exit 0. Output: `DEXIE 2/2 PASS`; `SUPABASE 5/5 PASS: RPC pair 6ff6a2f3-6eba-4048-9675-34331d40c542, balances 7500/2500`; `SUPABASE failure path PASS: same-account rejected (Transfer failed: Cannot transfer to the same account)`; `REAL TRANSFER HARNESS PASS: Dexie 2/2 + Supabase 5/5 + failure path`. Atomicity asserted: the rejected same-account RPC left the successful pair untouched (count still 2). |
| Backend cleanup (fresh) | One-off temporary checker (removed after use) queried the real DB via service role: transactions with that transfer_id = 0, both fixture accounts = 0, no `@example.invalid` auth users, no `@example.invalid` profile rows → `CLEANUP 4/4 PASS`. Driver deletes via its `finally` (accounts → profile → auth user) and `db.delete()` for Dexie. |
| Auth E2E (fresh, isolated server) | Server started from this worktree with identity chain: npm launcher PID 3496356 → `sh -c next dev -p 3111` PID 3496369 → `node next dev` PID 3496370 → `next-server` (v16.1.6) PID 3496382; all four cwd = `/home/alesierraalta/documents/projects/fintec-worktrees/beginner-ux-10` (via `/proc/<pid>/cwd`); port 3111 owned exclusively by PID 3496382 (`ss -ltnp`). Command: `REUSE_EXISTING_SERVER=true PORT=3111 PLAYWRIGHT_GLOBAL_TIMEOUT_MS=180000 npm run e2e:auth-required -- tests/e2e/25-transfer-canonical-flow.spec.ts` → exit 0; setup (6.6s) + canonical flow (6.4s), **2 passed in 15.7s**. Server log served `/api/transactions`, `/api/auth/profile`, `/api/subscription/status`, `/api/bcv-rates`, `/api/binance-rates` all 200 — no Turbopack `/api` panic in this run. Server stopped with SIGTERM to its process group; port 3111 verified free. |
| Beginner task (fresh blind subagent, 2026-08-19) | Blind subagent received EXACTLY: "Quieres mover dinero de una cuenta tuya a otra. Empieza desde la opción para registrar una nueva transacción y realiza la transferencia." It completed from Nueva Transacción through the canonical transfer UI. Independent backend readback observed exactly two paired transfer runs in the dedicated canonical accounts, both directions correct, source/destination deltas of 1250 minor each per run, not expense, and accurate explanation. Parent verification then removed all four blind rows and restored canonical balances to 250000/150000; cleanup PASS, no matching rows remain. |
| Rollback boundary | Revert the five transfer production files plus `repositories/supabase/transfer-projections.ts`; remove the focused tests, E2E spec, and `.gitignore` entries. No schema/RPC change. |

**Observed validation**: the guarded auth E2E verified the canonical redirect from both generic callers (`/` and `/transactions/add`) and unchanged transaction count. The real driver exercised real Dexie and real Supabase `create_transfer`: paired rows, balance changes (7500/2500), same-account rejection, and fixture cleanup. The requested fresh-beginner task ("Quieres mover dinero de una cuenta tuya a otra. Empieza desde la opción para registrar una nueva transacción y realiza la transferencia.") is now COMPLETE: a fresh blind subagent (spawned by the orchestrator) completed it from Nueva Transacción through the canonical transfer UI; independent backend readback and parent cleanup PASS (table row above). The earlier in-worktree delegation attempts were blocked by the platform (`Subagent depth limit reached (1)`, no subagent tool in this catalog), which is why the fresh run was performed by the parent session. Task 1.3 is now checked in `tasks.md`.

**Known defects/gotchas**: `dotenv` must explicitly load `.env.local`; `tsx` uses CJS here, so the driver uses an async `main()` rather than top-level await. The fixture must create auth user → `public.users` profile → accounts because of the FK chain, and cleanup runs accounts → profile → auth user. Latent pre-existing `delete()` parameter mismatch (`transaction_id_input` vs `transaction_id`) remains out of scope. No commit in this batch.

## Corrective Attempt Evidence

| Step | Exact result |
|---|---|
| Focused test rerun | `npm test -- tests/unit/hooks/use-transaction-form.test.ts tests/dom/components/forms/transaction-form-transfer.test.tsx tests/components/desktop-add-transaction.test.tsx tests/components/transfer-response-handling.test.tsx tests/node/repositories/transfer-projections.test.ts --runInBand` → exit 0; 5 suites / 31 tests passed, 0 failed, 3.625s. |
| Independent beginner delegation | `functions.subagent(agent=general, prompt=<exact user phrase only>)` → blocked by platform: `Subagent depth limit reached (1). Increase "experimental.subagent_depth" to allow nested subagents.` This subagent's catalog exposes no subagent tool. No UX observation inferred. |
| Fixture cleanup | Driver completed its `finally`; its generated auth user/accounts/transfer were deleted. Post-run DB query proved 4/4 clean. Browser auth state remained only in ignored `playwright/.auth/user.json`; no product or tracked test artifact was added. |

**Changed-line count (vs planning commit 365a8e9)**: ≤ 400 authored at prior freeze.

---

# Apply Progress: beginner-ux-10 — WU #57 (tasks 2.1–2.3) — PARTIAL (bounded slice)

**Status (2026-08-19)**: Persistence contract implemented and PROVEN (RED→GREEN). Tasks 2.1 and 2.2 are **partial**; task 2.3 (REFACTOR/E2E/real-driver/beginner) is **PENDING**. The `recurring-page-client` component call-site wiring (explicit first-operation choice) is unresolved and flagged to the maintainer. No commit in this batch.

**What was delivered and proven (Strict TDD, RED→GREEN):**

- **POST `/api/recurring-transactions`** (`app/api/recurring-transactions/route.ts`): rule-first persistence. Accepts `registerFirstOperation`. Computes `nextExecutionDate` BEFORE persisting (no immediate → `startDate`; immediate → next frequency occurrence after the first operation, so cron never duplicates it). Persists rule first; if rule creation fails → 500 Spanish, nothing follows. If `registerFirstOperation` → creates exactly one first transaction; on failure returns `202 { success:false, outcome:'partial-failure', data:rule, Spanish error }` (rule retained, never claims success). Success returns `outcome: 'rule-created' | 'first-operation-created'`.
- **Schedule semantics** (`lib/dates/recurring.ts`): added pure `resolveRecurringNextExecutionDate(startDate, frequency, intervalCount, registerFirstOperation)` on UTC date-only arithmetic (deterministic regardless of server timezone).
- **Supabase repo** (`repositories/supabase/recurring-transactions-repository-impl.ts`): `create` persists the explicit `nextExecutionDate` (falls back to `startDate`); `executeDue` unchanged (atomic RPC is the duplicate-free boundary).
- **Local repo** (`repositories/local/recurring-transactions-repository-impl.ts`): honest — `create` and `executeDue` now THROW an explicit unsupported error instead of returning a fabricated `'mock-transaction-id'` (no mock success).
- **Hook** (`hooks/use-recurring-creation.ts`, exported from `hooks/index.ts`): orchestrates POST with `registerFirstOperation` and maps outcomes to `rule-created | first-operation-created | partial-failure`; throws Spanish error on any unexpected failure.
- **Cron** (`app/api/cron/recurring-transactions/route.ts`): needed NO code change — it already calls atomic `executeDue` and advances the next date. Added a test confirming a second cron run does not re-execute an already-advanced rule.

**Focused test command (exact):**
`npm test -- tests/node/api/recurring-transactions-route.test.ts tests/node/repositories/recurring-transactions-repository-impl.test.ts tests/node/api/recurring-transactions-cron.test.ts tests/components/recurring-page-client.test.tsx tests/unit/hooks/use-recurring-creation.test.ts --runInBand` → **5 suites passed, 51 tests passed, 0 failed**. Safety net (before edits): 38 passed in the 4 target suites; full affected set now 64 passed.

**Work Unit Evidence (2.1–2.2 partial):**
