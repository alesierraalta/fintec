# Proposal: Fix Transactions Query 400 Runtime Stability

## Intent

Resolve the reported `/rest/v1/transactions` 400 failures and related runtime warning noise by hardening ownership scoping in Supabase transaction-like queries, normalizing `/finteclogodark.jpg` image sizing usage, and enforcing a single reduced-motion policy boundary for Framer Motion. The goal is to remove recurring production console/runtime issues without broad architectural churn.

## Scope

### In Scope

- Replace fragile embedded ownership filtering (`accounts!inner(user_id)` + `accounts.user_id`) in transaction, transfer, and usage-count paths with resilient account-id scoping that remains RLS-safe.
- Update `/finteclogodark.jpg` rendering contract to eliminate Next/Image width/height mismatch warnings, including sidebar behavior and consistency across shared logo usages.
- Introduce a centralized app-level Framer Motion reduced-motion policy so auth, app, and marketing routes inherit one configuration and warning/noise is reduced.
- Update and expand automated tests impacted by query-shape and motion/image policy changes, including string-level query assertions and relevant UI/runtime tests.

### Out of Scope

- Consolidating all browser Supabase client initialization paths into a single singleton source (tracked previously in `supabase-client-warning-and-transactions-400`).
- Broad animation redesign or timing/interaction polish beyond reduced-motion policy centralization.
- General UI restyling unrelated to `/finteclogodark.jpg` warning remediation.

## Approach

Implement a scoped runtime-stability pass across data, UI, and motion boundaries:

1. Introduce or reuse a shared account-id ownership scoping helper and refactor transaction-like repository queries to filter by `account_id` sets instead of embedded join aliases.
2. Standardize logo image sizing by removing conflicting intrinsic/CSS overrides and applying one consistent dimension strategy per context.
3. Move `MotionConfig` reduced-motion policy to a single top-level provider boundary and remove route-local policy duplication where redundant.
4. Synchronize test fixtures/assertions with the new query strategy and verify warning-free rendering/motion behavior.

## Affected Areas

| Area                                                    | Impact   | Description                                                                       |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `repositories/supabase/transactions-repository-impl.ts` | Modified | Replace embedded join ownership filter strategy with account-id scoped filtering. |
| `repositories/supabase/transfers-repository-impl.ts`    | Modified | Align transfer queries/deletes with resilient ownership scoping.                  |
| `lib/supabase/subscriptions.ts`                         | Modified | Update monthly usage-count query ownership filter strategy.                       |
| `hooks/use-optimized-data.ts`                           | Modified | Validate integration path for transaction loading after repository query changes. |
| `components/layout/sidebar.tsx`                         | Modified | Remove width/height override pattern causing Next/Image warnings.                 |
| `components/layout/header.tsx`                          | Modified | Keep shared logo rendering contract consistent with sidebar fix.                  |
| `app/landing/landing-page-client.tsx`                   | Modified | Align additional logo usage with normalized image sizing contract.                |
| `app/waitlist/page.tsx`                                 | Modified | Align additional logo usage with normalized image sizing contract.                |
| `app/route-aware-providers.tsx`                         | Modified | Centralize global Framer Motion reduced-motion policy boundary.                   |
| `components/layout/main-layout.tsx`                     | Modified | Remove/adjust route-local reduced-motion policy where superseded.                 |
| `components/layout/page-transition.tsx`                 | Modified | Remove/adjust route-local reduced-motion policy where superseded.                 |
| `components/auth/login-form.tsx`                        | Modified | Ensure motion usage inherits centralized reduced-motion policy.                   |
| `tests/node/lib/subscriptions-usage.test.ts`            | Modified | Update query-shape assertions tied to previous embedded select string.            |

## Risks

| Risk                                                       | Likelihood | Mitigation                                                                                                                  |
| ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Ownership scoping refactor changes result cardinality      | Med        | Add regression tests for user/account isolation and compare before/after fixture outputs.                                   |
| Additional account-id lookup increases latency             | Med        | Reuse cached account-id lookups per request path where possible and monitor query counts in tests.                          |
| Logo sizing normalization causes subtle layout shifts      | Low        | Verify responsive states (sidebar expanded/collapsed, header, landing, waitlist) with snapshot or visual checks.            |
| Centralized motion policy changes route animation behavior | Low/Med    | Keep policy equivalent to current `user` preference and validate key routes for expected animation enable/disable behavior. |
| Existing tests fail due to hardcoded query strings         | High       | Update assertions to behavior-focused checks and add targeted query-construction unit tests.                                |

## Rollback Plan

If regressions occur, revert this change set by restoring prior repository query construction, route-local motion config placement, and previous logo sizing props/styles. Re-run transaction-loading and UI warning verification checks to confirm pre-change behavior is restored.

## Dependencies

- Existing Supabase RLS/account ownership model must remain authoritative for final data access control.
- Existing Next.js Image and Framer Motion versions in the project (no dependency upgrade required for this scope).

## Success Criteria

- [ ] Transactions loading no longer returns 400 for authenticated users in the primary app flow (`useOptimizedData` path).
  - Evidence: `npm run e2e:auth-required -- tests/26-recent-transactions-display.spec.ts --reporter=line` executed, but runtime remained on `/auth/login` (no authenticated session), so `/rest/v1/transactions` 400 regression status is deferred to manual authenticated staging verification.
- [x] Query ownership filtering in transactions/transfers/subscriptions no longer depends on `accounts!inner(user_id)` embedding.
  - Evidence: `tests/node/repositories/transactions-ownership-scope.test.ts`, `tests/node/repositories/transfers-ownership-scope.test.ts`, and `tests/node/lib/subscriptions-usage.test.ts` passed; repository grep check in `repositories/supabase/*.ts` returned no `accounts!inner(user_id)` or `accounts.user_id` ownership filter usage.
- [ ] `/finteclogodark.jpg` no longer triggers Next/Image width/height mismatch warnings in known render locations.
  - Evidence: `tests/e2e/logo-motion-console-verification.spec.ts` passed for `/landing` and `/waitlist` (no relevant logo width/height warnings); sidebar/header routes are deferred pending authenticated runtime access.
- [x] Reduced-motion warning/noise is eliminated or materially reduced with one centralized policy boundary.
  - Evidence: `tests/app/route-aware-providers.test.tsx` passed (single inherited `MotionConfig reducedMotion="user"` behavior across landing/auth/app route branches); no reduced-motion warning output observed in landing/waitlist Playwright console capture.
- [x] Updated automated tests pass, including subscriptions usage test updates and any new coverage for ownership scoping/motion policy behavior.
  - Evidence: Focused checks passed: repository ownership tests, subscriptions usage unit tests, route-aware provider test, `tests/components/fintec-logo.test.tsx`, and `tests/e2e/logo-motion-console-verification.spec.ts`; `npm run type-check` and `npm run build` also passed.
