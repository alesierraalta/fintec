## Exploration: beginner-ux-10

### Current State

The backlog (#53–#61) is a cross-cutting beginner-experience change, but the first autonomous chain should be the financial-integrity cluster: #56 transfers, #57 recurring rules, and #58 VES/USD consistency. The worktree is on `feat/beginner-ux-10`, clean, and has an existing CodeGraph index.

The generic `components/forms/transaction-form.tsx` exposes `TRANSFER_OUT` as “Transferencia” and submits it through `repository.transactions.create`, which can persist only the outgoing row. The repository already has a canonical `createTransfer` path backed by the atomic `create_transfer` RPC, including account ownership, integer minor-unit validation, exchange-rate validation, paired rows, and balance updates. The same generic behavior is duplicated in `hooks/use-transaction-form.ts`, used by shared mobile/desktop flows and quick actions.

Recurring infrastructure exists but is uneven. `RecurringTransactionsRepository` has Supabase CRUD, `createFromTransaction`, `executeDue`, and a cron-facing due-execution path. The local adapter is intentionally a stub. The shared transaction hook currently prepares recurring data, logs it, and shows a success alert without persisting a rule. The existing repository creation sets `next_execution_date` to `start_date`, so creating a rule and executing its first operation must be an explicit product decision rather than an accidental cron side effect. The binding decision is to create the rule first and explicitly ask whether to register the first operation now.

VES/USD values already use integer minor units (`amountMinor`) and existing utilities such as `Money`, `formatCurrencyWithBCV`, `VESCurrency`, and transaction `amountBaseMinor`/`exchangeRate` fields. However, dashboard and recurring summaries use a live selectable rate while reports use historical base amounts, and transfer history displays VES USD equivalents using the current BCV rate. A policy boundary is therefore missing; merely adding formatting helpers would not make totals consistent.

OpenSpec is configured with Jest plus unit, integration, E2E, performance, mutation, type-check, lint, and strict-TDD capabilities. Existing repository tests cover transfer projections, ownership, and create errors; recurring repository tests exist but do not cover all DTO/create contracts. Existing OpenSpec specs concern prior debt and report changes and should be treated as constraints, not overwritten.

Current Next.js documentation for v16.1.6 confirms that App Router page and route-handler `params`/`searchParams` are Promises and must be awaited. React 19 documentation confirms `useActionState`/`useFormStatus` can model pending and returned error state for form actions, but the current architecture is client form → Hook → Repository/API; introducing Server Functions would be unnecessary unless an existing route requires it.

### Affected Areas

- `components/forms/transaction-form.tsx` — generic type selection currently persists transfer as a normal transaction; must redirect Transfer to the canonical flow, not duplicate it.
- `hooks/use-transaction-form.ts` — shared submission path contains the same transfer risk and a false recurring success path.
- `components/transfers/*`, `app/transfers/*`, `hooks/*transfer*` — canonical origin→destination UX and its callers must be reused by the generic form and quick actions.
- `repositories/contracts/transfers-repository.ts` — existing transfer port accepts major-unit input but returns paired transaction identifiers; preserve its contract unless a concrete mismatch is proven.
- `repositories/supabase/transactions-repository-impl.ts` — `createTransfer` is the atomic adapter boundary and already enforces positive integer minor amounts and deterministic destination amounts.
- `repositories/contracts/recurring-transactions-repository.ts` — rule creation/execution contract; likely needs an application-level orchestration decision, not a second repository abstraction.
- `repositories/supabase/recurring-transactions-repository-impl.ts` — persists rules, creates from a transaction, and executes due rules through RPCs; inspect idempotency and first-operation semantics before changing migrations.
- `repositories/local/recurring-transactions-repository-impl.ts` — stub behavior means local/no-auth lanes cannot prove real recurring persistence without an intentionally scoped adapter decision.
- `app/api/recurring-transactions/route.ts`, `app/api/cron/recurring-transactions/route.ts` — API contract, auth, cron execution, next-date advancement, exchange-rate sourcing, and duplicate-execution risk.
- `components/dashboard/mobile-dashboard.tsx`, `components/reports/desktop-reports.tsx`, `components/reports/mobile-reports.tsx`, `app/recurring/recurring-page-client.tsx` — inconsistent conversion policies and unlabeled aggregate totals.
- `lib/money.ts`, `lib/currency-ves.ts`, `types/domain.ts`, `types/recurring-transactions.ts` — monetary contracts; all persisted amounts remain integer minor units, while rates remain explicitly documented numeric values.
- `supabase/migrations/*` and RPC definitions — only change schema/RPCs if existing contracts cannot satisfy the slice; #58 explicitly excludes schema/backfill changes.
- `tests/dom`, `tests/node`, `tests/e2e`, `tests/performance`, `jest.config.js`, `playwright.config.ts`, `package.json` — use existing Jest projects and guarded Playwright lanes; each slice also requires observed beginner validation.
- `.husky/*`, CI workflows, repository PR policy — pre-push requires `.env.local`; PRs over 400 lines must be auto-chained into reviewable units.

### Approaches

1. **Reuse canonical flows with a thin orchestration seam** — make Transfer selection navigate/open the existing origin→destination flow; route recurring creation through the existing API/repository contract, then show a post-create first-operation choice; centralize only the conversion policy/calculation used by dashboard, reports, and recurring summaries.
   - Pros: preserves Repository→Hook→Component layering, prevents duplicate transfer logic, keeps monetary invariants at existing boundaries, and produces small autonomous slices.
   - Cons: requires tracing modal/navigation state and defining one explicit conversion-policy contract; local recurring mode remains a testability constraint.
   - Effort: Medium

2. **Expand the generic transaction form to own transfers and recurring rules** — add destination, recurrence scheduling, and first-operation behavior directly to the generic form and submit multiple repository operations from it.
   - Pros: one visible entry point.
   - Cons: duplicates canonical transfer rules, increases coupling and validation branches, risks non-atomic writes, and makes the first-operation choice ambiguous.
   - Effort: High

3. **Create a new unified financial application service** — introduce a new use-case/service layer coordinating transfer, recurring, and conversion behavior across all screens.
   - Pros: could formalize orchestration boundaries.
   - Cons: no demonstrated second caller or existing seam requires it; it would violate right-size and add a speculative abstraction while the repository ports already exist.
   - Effort: High

### Recommendation

Use Approach 1. Slice the work in this order: (1) #56 redirect Transfer selection to the canonical origin→destination flow and prove exactly two linked rows plus balanced accounts; (2) #57 make recurring creation real through the existing API/repository, create the rule first, and explicitly ask whether to register the first operation now, with cron remaining responsible only for due rules; (3) #58 choose and document a single displayed-total policy, preferably preserving historical transaction-time conversion for historical reports and labeling any live-rate projections rather than silently comparing them, then route all affected screens through the smallest existing utility/selector seam.

Do not introduce React 19 Server Functions solely for these client interactions. If a form action is needed, retain the current Hook boundary and use React 19 pending/error primitives locally. Any Next.js route changes must await Promise-based params/searchParams. Reuse existing `Money`/minor-unit utilities; never add float persistence or manual cent conversion.

### Risks

- The current CodeGraph snapshot shows the transfer repository contract and canonical transaction repository path, but not every UI/API symbol due capped exploration; verify exact route and hook wiring before implementation.
- Generic form and shared hook may both be active callers; fixing only one leaves a mobile/desktop regression.
- A recurrence with `startDate = today` can be executed by cron after rule creation unless the first-operation choice and next execution date are modeled explicitly; duplicate operations are the primary integrity risk.
- `createFromTransaction` uses an RPC and `create` sets the first execution date automatically; changing semantics may require a migration/RPC contract review, but #57 should avoid schema changes unless necessary.
- Live-rate and historical-rate totals are not mathematically interchangeable. A single policy must distinguish stored transaction-time conversion from current valuation; otherwise consistency claims remain false.
- The local recurring repository is a stub, so no-auth tests may falsely pass unless the real Supabase path is exercised or the slice explicitly limits local behavior.
- Existing rate-related worktrees/branches (`feat/daily-rates-cron-fallback-s1`, `fix/bcv-source-contract`, `fix/ves-calculator-zero`) overlap #58. Rebase/compare before selecting files to avoid duplicating or reverting rate contracts.
- Existing `fix/transfer-error-executes` and transfer repository tests overlap #56; inspect their intent and ancestry before changing transfer behavior.
- Existing recurring/rate/performance changes on `main` may already contain cron optimizations; do not reimplement them in the UX slice.
- Automated tests cannot establish beginner comprehension. Each slice requires an observed real task with a beginner, alongside focused behavioral tests; avoid structure-only or duplicate tests.
- Keep each PR under the 400-line review threshold where practical; auto-chain larger changes by dependency order.

### Ready for Proposal

Yes. The first proposal should be limited to the #56→#57→#58 financial-integrity chain, with #53–#55 and #59–#61 explicitly deferred. Before proposal, confirm the exact overlapping worktree diffs and the existing recurring API contract, then state the conversion policy as a user-visible contract. Include real beginner validation as a delivery gate, not as a test substitute.

### References

- GitHub issues: #53–#61; first chain #56, #57, #58.
- OpenSpec configuration: `openspec/config.yaml`.
- Existing specs: `openspec/specs/backend/spec.md`, `openspec/specs/database/spec.md`, `openspec/specs/reports/spec.md`.
- CodeGraph call paths: `TransactionForm` → `repository.transactions.create`; `SupabaseTransactionsRepository.createTransfer` → `create_transfer` RPC; recurring repositories → recurring API/cron/RPCs; dashboard/reports/recurring UI → separate conversion paths.
- Current docs consulted: Next.js 16.1.6 App Router route/page Promise params and revalidation; React 19 `useActionState`, `useFormStatus`, and form actions.
