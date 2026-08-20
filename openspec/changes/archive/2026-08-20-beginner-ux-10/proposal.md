# Proposal: Beginner Financial-Integrity Chain (#56 → #57 → #58)

## Intent

#56 "Transferencia" persists a lone `TRANSFER_OUT` row (phantom expense) not the paired transfer; #57 recurring shows success without persisting a rule; #58 the same period shows different VES/USD totals per screen plus invented `0,00` values. Fixes all three; #53–#55, #59–#61 deferred.

## Scope

### In Scope

- **#56** Transfer selection redirects to canonical flow; form/hook never persist a lone `TRANSFER_OUT`; toast distinguishes "Transferencia creada" (pair) from "Gasto registrado".
- **#57** Recurring creation persists via `POST /api/recurring-transactions`; rule first, then choice to register first operation now; never success without persistence; Spanish errors; empty-state CTAs.
- **#58** Reports keep transaction-time `amountBaseMinor`; live-rate projections labeled with source + freshness, never presented as same total; honest empty states replace `formatCurrency(0,…)`.
- Beginner observed validation per slice (gate); auto-chain >400 lines.

### Out of Scope

- Deferred: #53–#55, #59–#61; rate engine/cache/cron (in branch); schema/backfill; `/transfers` redesign; Server Functions; unified financial service.

## Capabilities

### New Capabilities

- `currency-display-policy`: user-facing conversion contract for totals (historical vs. live, provenance).

### Modified Capabilities

- `backend`: transfer selection never produces a lone `TRANSFER_OUT`; recurring rule + first-operation choice become real persistence.
- `reports`: preserve transaction-time amounts; labeled totals; honest empty states.

## Approach

Reuse canonical flows (Approach 1). **#56**: drop `TRANSFER_OUT` from creation paths (`transaction-form.tsx`, `use-transaction-form.ts`); route to existing `/transfers` flow; `createTransfer` RPC untouched. **#57**: shared hook calls existing recurring API; persist rule → ask → optionally register; cron due-only. **#58**: policy via smallest seam (`lib/money.ts`/`lib/currency-ves.ts`); update consumers.

## Affected Areas

- **Modified**: `components/forms/transaction-form.tsx`, `hooks/use-transaction-form.ts`, `app/recurring/recurring-page-client.tsx`, `components/dashboard/mobile-dashboard.tsx`, `components/reports/*`, `components/transfers/transfer-history.tsx`.
- **Reused**: `components/transfers/*`, `app/transfers/*`, `app/api/recurring-transactions/route.ts`, `repositories/supabase/recurring-transactions-repository-impl.ts`, `lib/money.ts`, `lib/currency-ves.ts`.

## Risks

- `fix/transfer-error-executes` divergent on transfer UI — Med; diff before apply
- `feat/daily-rates-cron-fallback-s1` divergent (rates cron) — Low; #58 excludes rate engine
- `next_execution_date = start_date` → cron duplicate — Med; first-operation choice + next-date modeling
- Local recurring stub → false test pass — Med; exercise real Supabase path
- Form + hook both active — Med; change both callers per slice

## Rollback Plan

Per-slice revert: restore Transfer option, flag-gate recurring, revert label edits. No schema/RPC changes → no migration rollback.

## Dependencies

Existing `create_transfer` RPC + adapter; recurring API/repository; money utilities. Reconcile divergent branches before apply.

## Success Criteria

- [ ] No path creates a lone `TRANSFER_OUT` from the form
- [ ] Transfer pair: two rows, same `transferId`, both balances updated
- [ ] Recurring save → rule appears in `/recurring`; failure → Spanish, actionable
- [ ] Same data + date → same total or visible rate label (source/freshness)
- [ ] No `formatCurrency(0,…)` for missing data
- [ ] Beginner observed task per slice (gate); each PR ≤ 400 lines
