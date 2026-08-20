# Design: Beginner Financial-Integrity Chain (#56 → #57 → #58)

## Technical Approach

Deliver three autonomous, stacked slices, each preserving the existing Repository → Hook → Component direction and `Money` minor-unit handling. #56 closes the generic transfer escape hatch and delegates to `/transfers`; #57 makes recurring creation rule-first and idempotent; #58 adds a narrow display-policy DTO consumed by existing screens, not a unified financial service.

## Architecture Decisions

| Decision                 | Alternatives / tradeoff                                                                          | Choice and rationale                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical transfer entry | Keep `TRANSFER_OUT` and validate later risks phantom expenses.                                   | On transfer selection, `transaction-form.tsx` calls `router.replace('/transfers')`; `use-transaction-form.ts` rejects `TRANSFER_OUT` before repository mutation. Next.js 16.1.6 confirms `replace` avoids a misleading back-stack entry. Existing local Dexie transaction and Supabase `create_transfer` RPC remain canonical atomic adapters. |
| Recurring orchestration  | Component-only sequencing duplicates persistence logic; a speculative service adds one consumer. | Add one focused hook: POST the rule, then optionally create the first transaction, then PATCH the rule’s next date. The component owns the explicit choice; repository/API own persistence.                                                                                                                                                    |
| Schedule semantics       | `next_execution_date = start_date` duplicates an immediate operation.                            | Compute the first due date before rule creation: use `startDate` when no immediate operation; use the next frequency occurrence when immediate is requested. Cron keeps `findDueForExecution` plus atomic `executeDue`; retries return the existing execution/no-op through the RPC uniqueness boundary.                                       |
| Display policy boundary  | One global conversion service would couple unrelated screens.                                    | Add a small discriminated DTO/helper beside `lib/money.ts`; each existing hook/repository supplies facts and each component renders the policy. Historical values require `amountBaseMinor`; live values require rate provenance/freshness.                                                                                                    |

## Data Flow

```text
#56 TransactionForm → useTransactionForm guard → /transfers → transfer UI → repository → Dexie transaction | create_transfer RPC
#57 RecurringPage → useRecurringCreation → POST rule → optional transaction create → PATCH next date → due cron → executeDue RPC
#58 repository/hook facts → DisplayMoneyDTO → report/dashboard/history component
```

## File Changes

| Slice | Files                                                                                                                                                                                                                                                                                    | Action                                                                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #56   | `components/forms/transaction-form.tsx`, `hooks/use-transaction-form.ts`                                                                                                                                                                                                                 | Redirect and enforce a mutation guard; preserve canonical transfer components/repositories.                                                                                               |
| #57   | `hooks/use-recurring-creation.ts`, `app/recurring/recurring-page-client.tsx`, `app/api/recurring-transactions/route.ts`, `types/recurring-transactions.ts`, `repositories/{contracts,local,supabase}/recurring-transactions-repository*`, `app/api/cron/recurring-transactions/route.ts` | Create focused hook; carry explicit next date; make local behavior honest (supported persistence or explicit unsupported response, never mock success); retain Supabase atomic execution. |
| #58   | `lib/money.ts`, `lib/currency-ves.ts`, `components/reports/{mobile-reports,desktop-reports}.tsx`, `components/dashboard/mobile-dashboard.tsx`, `components/transfers/transfer-history.tsx`                                                                                               | Add DTO/helper and replace ad-hoc/live-zero formatting.                                                                                                                                   |

## Interfaces / Contracts

```ts
type DisplayMoneyDTO =
  | { kind: 'historical'; amountBaseMinor: number; currencyCode: string }
  | {
      kind: 'live';
      amountMinor: number;
      currencyCode: string;
      rate: number;
      source: string;
      observedAt: string;
      freshness: 'fresh' | 'stale';
    }
  | {
      kind: 'unavailable';
      reason: 'pending' | 'missing-amount' | 'missing-rate';
    };
```

Recurring create accepts `registerFirstOperation: boolean`; responses distinguish `rule-created`, `first-operation-created`, and `partial-failure`. If rule creation fails, nothing follows. If the optional operation fails, retain the rule, report the partial state and corrective action, and allow retry; do not claim full success. Structured logs include rule/transaction IDs, stage, execution date, and outcome—never amounts or user data.

## Testing Strategy

| Layer       | Minimal versioned behavior                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Transfer guard; schedule calculation; DTO historical/live/unavailable branches and integer minor units.                                   |
| Integration | Recurring route/repositories: rule-first ordering, partial failure, local unsupported behavior, Supabase `executeDue` retry/no duplicate. |
| E2E         | One guarded-lane critical path per slice; no snapshot/structure tests.                                                                    |

Run intensive local real-runs separately: Dexie and real Supabase transfer pairs; recurring with/without first operation plus repeated cron; cross-screen historical/live comparisons, stale/missing rates, and beginner-observed acceptance. Keep exploratory scripts in gitignored `testLocales/`.

## Threat Matrix

| Boundary                 | Applicability | Reason                        |
| ------------------------ | ------------- | ----------------------------- |
| Documentation-like paths | N/A           | No executable classification. |
| Git repository selection | N/A           | No Git command execution.     |
| Commit state             | N/A           | No commit automation.         |
| Push state               | N/A           | No push automation.           |
| PR commands              | N/A           | No PR command composition.    |

## Migration / Rollout

No schema migration. Stack #56 → #57 → #58; each is independently revertible. Before each child, reconcile against its parent and inspect overlaps: `fix/transfer-error-executes` owns transfer response handling, so preserve its error parsing while applying #56; `feat/daily-rates-cron-fallback-s1` changes only rate cron/scrapers, so do not import its rate engine into #58. Rebase/retarget until child diffs exclude prior slices. Rollback by reverting one slice; #57-created rules remain valid and can be disabled rather than deleted.

## Open Questions

None.
