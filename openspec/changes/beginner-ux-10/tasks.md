# Tasks: Beginner Financial-Integrity Chain (#56 → #57 → #58)

## Review Workload Forecast

| Field                   | Value                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | 520–680 lines across three slices                                                                                               |
| 400-line budget risk    | High                                                                                                                            |
| Chained PRs recommended | Yes                                                                                                                             |
| Suggested split         | PR #56 → PR #57 → PR #58                                                                                                        |
| Delivery strategy       | auto-chain                                                                                                                      |
| Chain strategy          | feature-branch-chain — use a draft/no-merge tracker; PR #1 targets the tracker and each child targets its immediate predecessor |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                           | Likely PR | Focused test command                                                                                                                                                                                                                        | Runtime harness                                                                                                        | Rollback boundary                              |
| ---- | ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1    | Canonical transfer entry       | PR #56    | `npm test -- tests/dom/components/forms/transaction-form-transfer.test.tsx tests/components/transfer-response-handling.test.tsx`                                                                                                            | `npx tsx testLocales/56-transfer-real.ts` + `npm run e2e:no-auth -- tests/e2e/22-transfer-canonical-flow.spec.ts`      | `.gitignore`, form/hook, #56 tests             |
| 2    | Durable recurring creation     | PR #57    | `npm test -- tests/node/api/recurring-transactions-route.test.ts tests/node/repositories/recurring-transactions-repository-impl.test.ts tests/node/api/recurring-transactions-cron.test.ts tests/components/recurring-page-client.test.tsx` | `npx tsx testLocales/57-recurring-real.ts` + `npm run e2e:auth-required -- tests/e2e/23-recurring-persistence.spec.ts` | recurring hook/API/types/repos/cron, #57 tests |
| 3    | Historical/live display policy | PR #58    | `npm test -- tests/unit/lib/currency-display-policy.test.ts tests/components/reports-display-policy.test.tsx`                                                                                                                               | `npx tsx testLocales/58-display-policy-real.ts` + `npm run e2e:no-auth -- tests/e2e/24-report-currency-policy.spec.ts` | policy seam, consumers, #58 tests              |

## Phase 1: Work Unit #56 — Canonical Transfer (RED → GREEN → REFACTOR)

- [x] 1.1 Add `testLocales/` to `.gitignore`; RED-test `tests/dom/components/forms/transaction-form-transfer.test.tsx` and `tests/dom/hooks/use-transaction-form.test.tsx` for redirect, no lone row, paired feedback, and failure.
- [x] 1.2 GREEN: update `components/forms/transaction-form.tsx` and `hooks/use-transaction-form.ts` for `router.replace('/transfers')` and a pre-mutation `TRANSFER_OUT` guard.
- [ ] 1.3 REFACTOR the guard; add guarded `tests/e2e/25-transfer-canonical-flow.spec.ts` (named 25- because 22- is taken by `22-debts-navigation.spec.ts`), run `testLocales/56-transfer-real.ts` against Dexie/Supabase and a beginner task; commit `feat(transfers): close generic transfer escape hatch`.
  - REFACTOR done; E2E spec added (`@auth-required`); `testLocales/56-transfer-real.ts` Part A (real Dexie) AND Part B (real Supabase `create_transfer` RPC + atomic failure) both PASS.
  - Corrective rerun 1 (gate FAIL): closed the third proven escape — `DesktopAddTransaction` local `handleSubmit` (bypassed both guards); selection now redirects to `TRANSFER_FLOW_PATH` (RED→GREEN in `tests/components/desktop-add-transaction.test.tsx`).
  - Corrective rerun 2 (blind-test defects): (A) one confirmation can no longer issue two POSTs — ref-based in-flight guard in Desktop/Mobile `handleTransfer` (RED→GREEN: `it.each` "desktop double activation" case in `tests/components/transfer-response-handling.test.tsx`); (B) GET `/api/transfers` 500 fixed — removed stale `pending` from `TRANSFER_TRANSACTION_LIST_PROJECTION` (RED→GREEN in `tests/node/repositories/transfer-projections.test.ts`). Root cause of the observed opposing pair: two separate RPC executions 13.6s apart (two transfer_ids) — the app's single-confirmation surface has one POST path; the 500 broke post-transfer verification and drove the retry.
  - PENDING: auth-required E2E execution is environment-blocked in this sandbox (Turbopack panics compiling any `/api/*` route — reproduced, not related to the change); must be re-run where the orchestrator ran it. Beginner observed validation not yet performed — cannot be fabricated. No commit in this batch (explicitly requested).

## Phase 2: Work Unit #57 — Durable Recurring (RED → GREEN → REFACTOR)

- [ ] 2.1 RED-test `tests/node/api/recurring-transactions-route.test.ts`, `tests/node/repositories/recurring-transactions-repository-impl.test.ts`, `tests/node/api/recurring-transactions-cron.test.ts`, and `tests/components/recurring-page-client.test.tsx` for rule-first ordering, both choices, Spanish failure, local honesty, and duplicate-free retries.
- [ ] 2.2 GREEN: implement `hooks/use-recurring-creation.ts`; wire `app/recurring/recurring-page-client.tsx`, `app/api/recurring-transactions/route.ts`, `types/recurring-transactions.ts`, `repositories/contracts/recurring-transactions-repository.ts`, `repositories/local/recurring-transactions-repository-impl.ts`, `repositories/supabase/recurring-transactions-repository-impl.ts`, and `app/api/cron/recurring-transactions/route.ts` for explicit dates and atomic `executeDue`.
- [ ] 2.3 REFACTOR existing Repository → Hook → Component seams; add guarded auth E2E and `testLocales/57-recurring-real.ts` for Supabase create/failure/retry and a beginner task; commit `feat(recurring): persist rules before success`.

## Phase 3: Work Unit #58 — Currency Display Policy (RED → GREEN → REFACTOR)

- [ ] 3.1 RED-test `DisplayMoneyDTO` branches in `tests/unit/lib/currency-display-policy.test.ts` and `tests/components/reports-display-policy.test.tsx` for stable base amounts, live provenance, minor units, and unavailable—not `0,00`.
- [ ] 3.2 GREEN: add the DTO/helper beside `lib/money.ts`/`lib/currency-ves.ts`; update `components/reports/{mobile-reports,desktop-reports}.tsx`, `components/dashboard/mobile-dashboard.tsx`, and `components/transfers/transfer-history.tsx` without a unified service.
- [ ] 3.3 REFACTOR ad-hoc formatting; run `testLocales/58-display-policy-real.ts`, guarded `tests/e2e/24-report-currency-policy.spec.ts`, and beginner comparison; commit `feat(reports): disclose historical and live totals`.

## Phase 4: Verification and Rollback

- [ ] 4.1 Run `npm run type-check`, `npm run lint`, focused tests, `npm run test:ci`, and guarded E2E lanes; record exact results per commit.
- [ ] 4.2 Verify each diff stays under 400 lines, child bases exclude prior slices after the chain decision, and rollback is independent; all threat rows are `N/A`.
