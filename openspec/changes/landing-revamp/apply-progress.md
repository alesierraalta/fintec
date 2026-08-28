# Apply Progress: landing-revamp

## Status

- **Status:** blocked before implementation
- **Change:** `landing-revamp`
- **Workspace:** `/home/alesierraalta/documents/projects/fintec-worktrees/landing-revamp`
- **Branch:** `fix/landing-revamp`
- **Artifact store:** `openspec` (authoritative)
- **Action context:** `repo-local`; target workspace is the only edit root used
- **Structured status consumed:** reconstructed from the project status contract because the native `gentle-ai` package is unavailable.
- **Next recommended:** `resolve-delivery-path`

## Workload gate

`tasks.md` requires a delivery decision before apply:

- Decision needed before apply: Yes
- Chained PRs recommended: Yes
- Chain strategy: pending
- 400-line budget risk: High

No implementation work was started. The exact required decision is one of:

- `auto-chain` (or an explicitly chosen stacked/feature-branch chain), with the assigned work-unit slice identified; or
- `exception-ok` / `size:exception`, explicitly accepting the over-400-line single-PR exception.

## Task progress

No implementation-owned tasks were completed. All implementation task checkboxes remain unchanged. The parent-owned lifecycle task remains deferred unchanged.

## Files changed

- `openspec/changes/landing-revamp/apply-progress.md` (this blocked-phase record)

## Verification

Not run because the workload gate blocked implementation before code changes.

## Tooling warnings

- Context-Mode MCP was unavailable (`MCP not initialized`) for the required `ctx_batch_execute` / `ctx_execute` family; source reads used the documented degraded fallback.
- CodeGraph MCP was unavailable (`MCP not initialized`); no structural index query was possible.
- Native `gentle-ai sdd-status` was unavailable through the package registry; status was reconstructed using the project contract.

## Remaining work

All implementation tasks remain pending, including:

- [ ] **T1 RED — rate state:** Test `lib/rates/landing-rate-state.ts` in `tests/lib/rates/landing-rate-state.test.ts`: exact 15m, invalid/future age, fallback, `isLive`, retained error/retry. **Deps:** none; **Est:** 0.5d; **Done:** branches fail pre-code. <!-- sdd-owner: implementation -->
- [ ] **T2 RED — contracts:** Test analytics, one Binance owner, lazy observer fallback, tabs/a11y and state actions in `tests/lib/analytics/landing-events.test.ts` and `tests/components/rate-cockpit.test.tsx`. **Deps:** none; **Est:** 0.75d; **Done:** no PII/duplicate events; keyboard/retry cases fail pre-code. <!-- sdd-owner: implementation -->
- [ ] **T3 GREEN — state seams:** Implement `lib/rates/landing-rate-state.ts`, `hooks/use-landing-rates.ts`, `hooks/use-container-layout.ts`; minimally extend `hooks/use-binance-rates.ts`. **Deps:** T1; **Est:** 1d; **Done:** honest five states, 15m policy, stacked fallback/960px split, one snapshot. <!-- sdd-owner: implementation -->
- [ ] **T4 GREEN — cockpit:** Create `app/(public)/components/rate-cockpit.tsx`, `rate-cockpit-skeleton.tsx`, `components/currency/bcv-rate-panel.tsx`; adapt `live-rates-section.tsx`, `bcv-rates.tsx`, `binance-rates.tsx`. **Deps:** T2–T3; **Est:** 1.5d; **Done:** one lazy cockpit, BCV/P2P tabs, shared Binance, disclosure, freshness/loading/error/retry, external warning/link. <!-- sdd-owner: implementation -->
- [ ] **T5 GREEN — narrative:** Replace hero mock with labelled movement→budget→decision canvas/pulse; add `evidence-strip.tsx`; remove rate feature and update `data.ts`, `landing-page.tsx`. **Deps:** T2; **Est:** 0.75d; **Done:** management CTA primary, rates secondary, no repeated rates or invented evidence, reduced motion. <!-- sdd-owner: implementation -->
- [ ] **T6 GREEN — funnel:** Add `lib/analytics/landing-events.ts` and optional `components/analytics/landing-event-link.tsx`; wire `landing-nav.tsx`, pricing/CTA, `register-form.tsx`, `contexts/auth-context.tsx`. **Deps:** T2; **Est:** 0.75d; **Done:** `landing.v1` allowlisted events emit once; `register_complete` means confirmed account creation. <!-- sdd-owner: implementation -->
- [ ] **T7 TRIANGULATE — responsive:** Add `tests/e2e/landing-revamp.spec.ts` and component coverage for all states, keyboard/motion, one fetch, overflow/overlap, 44px targets and 16px inputs at 320/375/390/430 plus iPad portrait/landscape; manually check Safari/no observer. **Deps:** T4–T6; **Est:** 1d; **Done:** matrix passes. <!-- sdd-owner: implementation -->
- [ ] **T8 REFACTOR — release:** Remove dead `StatsSection` wiring; document rollback/entry slugs; run Prettier, lint, type-check, Jest, E2E, performance and mutation gates. **Deps:** T7; **Est:** 0.5d; **Done:** configured thresholds pass; global/authenticated consumers unchanged. <!-- sdd-owner: implementation -->

## Deferred parent action

- [ ] Start or reuse a bounded review for spec traceability, privacy, final diff size and chain decision. <!-- sdd-owner: parent -->
