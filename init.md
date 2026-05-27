# SDD Init — FinTec

## Change

rates scraper recovery task 1 — confirm production scheduler owner

## Status

completed

## Executive summary

- `openspec/config.yaml` already exists. No destructive rewrite done.
- Project stack confirmed: Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres.
- Test runners confirmed: Jest (`test:ci`), Playwright (`e2e:no-auth`, `e2e:auth-required`), k6 (`perf:smoke`).
- Source docs reviewed:
  - `docs/prd-rates-scraper-recovery.md`
  - `docs/architecture/rates-scraper-architecture.md`
  - `docs/architecture/rates-scraper-tasks.md`
- `.atl/skill-registry.md` exists and is current.

## SDD/testing configuration snapshot

From `openspec/config.yaml`:

- schema: `spec-driven`
- strict testing expectations already encoded in apply/verify rules
- verify requires:
  - `npm run test:ci`
  - lane-specific Playwright run
  - `npm run perf:smoke`
- proposal/spec/design/tasks/apply/verify/archive rules already aligned with full SDD flow

## Task 1 decision (codified)

**Production scheduler owner (confirmed for this change):**

- **External platform cron -> protected scheduler endpoint/job handler -> shared scrape use case**

Why this owner:

- Architecture doc already defines preferred shape as external cron/platform scheduler with single trigger path.
- Current in-app `background-scraper/start` route is admin-triggered runtime control, not reliable production scheduler ownership.
- Single external owner best matches requirement: one production owner, observable heartbeat, lock/idempotency, no duplicate app-instance loops.

## Evidence observed in current code

- `app/api/background-scraper/start/route.ts` starts scraper only via admin-triggered POST and process-local singleton.
- `lib/services/background-scraper-manager.ts` runs in-process loop; no committed production cron binding.
- `supabase/functions/sync-exchange-rates/index.ts` exists as executable job target, but no scheduler binding committed in repo.

## Implementation guardrails for next phase

- Enforce single scheduler owner only (no dual-owner overlap between in-process manager and cron job).
- Add scheduler heartbeat field into health payload.
- Route scheduled trigger into same scrape pipeline as on-demand/manual flows.
- Keep strict TDD: tests first for scheduler heartbeat, duplicate lock skip, stale-state alert thresholds.

## Risks

- Existing process-local background manager can conflict with new owner if left active in production.
- Repo currently lacks explicit committed scheduler wiring; infra config drift risk.
- Without heartbeat contract first, false negatives on "scheduler dead vs scrape failing" remain likely.

## Next recommended

1. Create OpenSpec change folder for this recovery stream and record this scheduler-owner ADR-style decision in proposal/design.
2. Add explicit scheduler endpoint contract + auth secret contract.
3. Write RED tests for scheduler heartbeat + lock skip before wiring cron.
4. Implement owner path; disable/feature-gate legacy in-process production loop.

## Skill resolution

- `skill_resolution`: `fallback-path`
- Reason: no `## Skills to load before work` paths injected by parent. Used project artifacts directly; did not perform broad skill discovery beyond required registry existence check.

## Notes on memory persistence

- Engram tools unavailable in this tool environment. Could not execute `mem_save`/`mem_session_summary` directly.
- Decisions persisted in file artifacts (`init.md`, `progress.md`) for parent session pickup.
