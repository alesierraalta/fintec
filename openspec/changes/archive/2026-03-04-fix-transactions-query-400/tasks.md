# Tasks: Fix Transactions Query 400 Runtime Stability

## Phase 1 (Batch 1): Data Ownership Scoping Foundation

- [x] 1.1 Create `repositories/supabase/account-scope.ts` with `getOwnedAccountScope`, `intersectOwnedAccountIds`, and `hasOwnedAccounts`, including safe-empty behavior when a user owns no accounts. (Design: Decision shared account-scope utility, Interfaces/Contracts; Transactions Spec: safe empty scenario)
- [x] 1.2 Refactor `repositories/supabase/transactions-repository-impl.ts` transaction-like read/count/search methods to resolve owned account IDs first, apply `.in('account_id', ownedIds)`, and intersect optional account filters before querying. (Design: Decision explicit owned-account scoping, Behavioral contract; Transactions Spec: owned data only, no embedded-join 400 shape)
- [x] 1.3 Refactor `repositories/supabase/transfers-repository-impl.ts` list/delete ownership enforcement to use owned account ID scoping instead of `accounts!inner(user_id)` query filters. (Design: File Changes transfers repository, Behavioral contract; Transactions Spec: ownership isolation)
- [x] 1.4 Update `lib/supabase/subscriptions.ts` monthly usage-count query path to compute owned account scope first and return `0` for no-account users without querying unscoped data. (Design: File Changes subscriptions, Data Flow safe-empty; Transactions Spec: safe empty scenario)
- [x] 1.5 Add `tests/node/repositories/transactions-ownership-scope.test.ts` covering: owned-account inclusion, unowned-account exclusion, and no-owned-accounts safe-empty behavior with behavior-focused assertions. (Design: Testing Strategy unit repository isolation; Transactions Spec: behavior-focused tests)
- [x] 1.6 Add `tests/node/repositories/transfers-ownership-scope.test.ts` covering transfer list/delete isolation for owned vs unowned account datasets. (Design: Testing Strategy transfer isolation; Transactions Spec: ownership regression detection)
- [x] 1.7 Update `tests/node/lib/subscriptions-usage.test.ts` to assert scoped usage-count outcomes and remove brittle assertions tied to embedded select/filter string internals. (Design: Testing Strategy subscription usage behavior; Transactions Spec: no query-string coupling)

## Phase 2 (Batch 2): Logo Rendering Contract Refactor

- [x] 2.1 Create `components/branding/fintec-logo.tsx` as the shared logo primitive using `next/image` with `fill` + `object-contain`, container-driven sizing, and consistent fallback behavior. (Design: Decision reusable fill-based contract, Interfaces/Contracts; UI Spec: single sizing contract)
- [x] 2.2 Replace logo rendering in `components/layout/sidebar.tsx` with `FinTecLogo`, preserving expanded/collapsed sidebar states through container size classes only (no intrinsic width/height overrides). (Design: File Changes sidebar; UI Spec: responsive consistency scenario)
- [x] 2.3 Replace logo rendering in `components/layout/header.tsx`, `app/landing/landing-page-client.tsx`, and `app/waitlist/page.tsx` with the shared `FinTecLogo` contract to remove per-file sizing drift. (Design: File Changes header/landing/waitlist; UI Spec: no mismatch warning across surfaces)
- [x] 2.4 Update or add logo-focused tests under existing logo test locations (`tests/**/logo*.spec.ts`) to verify rendered contract outcomes (aspect preservation and no distortion) rather than class-tree internals. (Design: Testing Strategy E2E logo outcomes; UI Spec: contract-stable tests)

## Phase 3 (Batch 3): Centralized Reduced-Motion Policy

- [x] 3.1 Wrap route content in `app/route-aware-providers.tsx` with one top-level `MotionConfig reducedMotion="user"` boundary that applies to landing and non-landing branches. (Design: Decision centralized policy in RouteAwareProviders; UI Spec: global reduced-motion inheritance)
- [x] 3.2 Remove redundant local `MotionConfig` wrappers from `components/layout/main-layout.tsx`, `components/layout/page-transition.tsx`, and `app/landing/landing-page-client.tsx` while preserving route transition behavior. (Design: File Changes main-layout/page-transition/landing; UI Spec: routes remain compliant without local wrappers)
- [x] 3.3 Update `tests/app/route-aware-providers.test.tsx` to validate inherited reduced-motion behavior across auth, app, and marketing routes without asserting fragile provider placement details. (Design: Testing Strategy integration policy inheritance; UI Spec: centralized policy refactor stability)

## Phase 4 (Batch 4): Cleanup and Verification Gates

- [x] 4.1 Run focused automated checks for touched areas (repository/unit tests, route-aware provider tests, and logo-related UI tests) and record results in change verification notes. (Design: Rollout plan step 4, Observability checks)
- [ ] 4.2 Execute authenticated runtime regression verification for primary transactions flow to confirm `/rest/v1/transactions` no longer returns 400 and data remains ownership-scoped. (Proposal Success Criteria #1/#2; Design: Testing Strategy E2E runtime stability)
- [ ] 4.3 Capture browser console verification for sidebar/header/landing/waitlist routes to confirm no `/finteclogodark.jpg` width-height mismatch warnings and reduced-motion noise regressions. (Proposal Success Criteria #3/#4; UI Spec: no runtime warning outcomes)
- [x] 4.4 Update acceptance checklist in `openspec/changes/fix-transactions-query-400/proposal.md` with pass/fail evidence for each success criterion and note any deferred manual checks. (Proposal: Success Criteria, Rollback/Observability readiness)

### Batch 4 Notes

- Verification evidence recorded in `openspec/changes/fix-transactions-query-400/verification.md`.
- Auth-required runtime verification is currently blocked because Playwright auth lane setup does not produce an authenticated session in this workspace run; dashboard checks land on `/auth/login`.
- Console verification completed for public marketing routes (`/landing`, `/waitlist`) via Playwright; app shell routes (`sidebar`/`header`) remain deferred pending authenticated runtime access.
