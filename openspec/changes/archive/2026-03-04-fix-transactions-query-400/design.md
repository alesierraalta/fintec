# Design: Fix Transactions Query 400 Runtime Stability

## Technical Approach

Implement a focused runtime-stability refactor across data-access, branding image rendering, and motion policy boundaries.

For data access, replace `accounts!inner(user_id)` ownership filtering in transaction-like paths with explicit account ownership scoping (`account_id IN ownedAccountIds`) resolved from `accounts` first, then applied consistently in repositories and subscription usage counting. This preserves RLS as the final guardrail while avoiding fragile PostgREST embedded join shapes.

For UI, standardize `/finteclogodark.jpg` rendering behind one reusable Next/Image contract so all logo contexts use compatible sizing instructions and avoid width/height mismatch warnings.

For motion, move reduced-motion policy to a single top-level `MotionConfig` boundary in app providers so auth/app/marketing routes inherit the same behavior and route-local duplicates can be removed.

This design satisfies delta specs in:

- `openspec/changes/fix-transactions-query-400/specs/transactions/spec.md`
- `openspec/changes/fix-transactions-query-400/specs/ui/spec.md`

## Architecture Decisions

### Decision: Use Explicit Owned-Account Scoping For Transaction-Like Reads

**Choice**: Introduce a shared Supabase helper to resolve owned account IDs for a user, then scope queries with `.in('account_id', ownedAccountIds)` (plus intersection with user-provided account filters).
**Alternatives considered**: Keep embedded joins (`accounts!inner(user_id)`), or rely on RLS only with no explicit account filter.
**Rationale**: Embedded join request-shape has proven fragile (400 failures). RLS-only can be correct but less explicit and may cause broader scans. Explicit account scoping keeps behavior deterministic, debuggable, and consistent across transactions/transfers/usage paths.

### Decision: Add A Shared Account-Scope Utility In Supabase Repository Layer

**Choice**: Create a small utility module in `repositories/supabase/` (and a thin server-use helper where needed) with functions for owned account lookup, filter intersection, and safe-empty handling.
**Alternatives considered**: Duplicate account-id fetch logic in each repository method.
**Rationale**: The codebase already duplicates account lookup in multiple repositories. Centralizing this logic reduces drift and ensures transactions/transfers/subscription usage use the same ownership semantics.

### Decision: Standardize Logo Rendering With A Reusable Fill-Based Contract

**Choice**: Create a shared logo component (or shared logo primitive) that always renders `/finteclogodark.jpg` with `fill` + `object-contain`, while container dimensions control display size per context.
**Alternatives considered**: Keep per-file ad hoc `Image` usage, or standardize on intrinsic `width/height` in every callsite.
**Rationale**: Existing callsites are mostly fill-based already; sidebar is the outlier using intrinsic props plus inline width/height overrides. A shared fill-based contract removes mismatch risk and keeps responsive behavior predictable.

### Decision: Centralize Reduced-Motion Policy In Route-Aware Providers

**Choice**: Wrap `RouteAwareProviders` children with one top-level `MotionConfig reducedMotion="user"`, then remove local `MotionConfig` wrappers from `MainLayout`, `PageTransition`, and landing page client.
**Alternatives considered**: Keep route-local wrappers, or move wrapper into `app/layout.tsx` outside route-aware providers.
**Rationale**: `RouteAwareProviders` already governs cross-route provider boundaries and includes landing bypass logic. Adding `MotionConfig` there ensures consistent inheritance for auth, app, and marketing routes with minimal tree churn.

## Data Flow

Ownership-scoped transaction-like read:

    UI/Server caller
      -> repository method (transactions/transfers/subscriptions)
      -> resolve userId
      -> load ownedAccountIds from accounts table
            |
            +-- none -> return [] / 0 (safe empty)
            |
            +-- some -> query transactions with account_id IN ownedAccountIds
                        (+ additional business filters)
      -> map rows to domain
      -> return scoped result

Centralized motion + logo rendering path:

    app/layout.tsx
      -> RouteAwareProviders
            -> MotionConfig(reducedMotion="user") [single boundary]
            -> route content (auth/app/landing)
      -> pages/components render motion.* without local policy wrappers

    UI logo callsites
      -> shared FinTec logo component
      -> consistent Next/Image fill contract
      -> no conflicting width/height instructions

## File Changes

| File                                                           | Action | Description                                                                                                                                     |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `repositories/supabase/account-scope.ts`                       | Create | Shared helper for owned account ID lookup, account filter intersection, and safe-empty guards.                                                  |
| `repositories/supabase/transactions-repository-impl.ts`        | Modify | Replace embedded join ownership filters with account-id scoping in all read/count/search paths; keep `ensureAccountOwned` for write validation. |
| `repositories/supabase/transfers-repository-impl.ts`           | Modify | Apply owned account scoping to list/delete transfer paths instead of `accounts!inner(user_id)` filters.                                         |
| `lib/supabase/subscriptions.ts`                                | Modify | Update monthly usage count path to owned-account scoping before transaction count query.                                                        |
| `components/branding/fintec-logo.tsx`                          | Create | Reusable logo component encapsulating Next/Image sizing contract and fallback behavior.                                                         |
| `components/layout/sidebar.tsx`                                | Modify | Replace inline width/height override logo usage with shared logo contract for expanded/collapsed states.                                        |
| `components/layout/header.tsx`                                 | Modify | Align header logo usage with shared logo contract to keep consistent sizing behavior.                                                           |
| `app/landing/landing-page-client.tsx`                          | Modify | Replace local logo image instances with shared logo contract; remove local `MotionConfig`.                                                      |
| `app/waitlist/page.tsx`                                        | Modify | Align logo rendering with shared logo contract.                                                                                                 |
| `app/route-aware-providers.tsx`                                | Modify | Introduce single top-level `MotionConfig reducedMotion="user"` boundary.                                                                        |
| `components/layout/main-layout.tsx`                            | Modify | Remove duplicate local `MotionConfig` wrapper and rely on inherited policy.                                                                     |
| `components/layout/page-transition.tsx`                        | Modify | Remove duplicate local `MotionConfig` wrapper and keep transition logic only.                                                                   |
| `tests/node/lib/subscriptions-usage.test.ts`                   | Modify | Move from embedded-join string assertions to behavior-focused account-scoping expectations.                                                     |
| `tests/app/route-aware-providers.test.tsx`                     | Modify | Assert centralized motion policy boundary behavior for landing and non-landing routes.                                                          |
| `tests/**/logo*.spec.ts`                                       | Modify | Assert contract outcomes (logo renders without distortion/warnings) without brittle class-shape coupling.                                       |
| `tests/node/repositories/transactions-ownership-scope.test.ts` | Create | Validate owned/unowned isolation behavior and safe-empty handling for repository query refactor.                                                |
| `tests/node/repositories/transfers-ownership-scope.test.ts`    | Create | Validate transfer list/delete ownership scoping behavior and isolation.                                                                         |

## Interfaces / Contracts

```ts
// repositories/supabase/account-scope.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface OwnedAccountScope {
  userId: string;
  accountIds: string[];
}

export async function getOwnedAccountScope(
  client: SupabaseClient,
  userId: string
): Promise<OwnedAccountScope>;

export function intersectOwnedAccountIds(
  ownedAccountIds: string[],
  requestedAccountIds?: string[]
): string[];

export function hasOwnedAccounts(scope: OwnedAccountScope): boolean;
```

```tsx
// components/branding/fintec-logo.tsx
type FinTecLogoProps = {
  alt?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  containerClassName: string;
  fallbackText?: string;
};

// Contract:
// - Uses next/image with fill + object-contain only.
// - Container defines size; component never mixes intrinsic width/height with
//   CSS width/height overrides.
// - Emits same fallback behavior across callsites.
```

Behavioral data contract:

- Transaction-like reads/deletes MUST filter by owned account IDs (or return safe empty when none).
- User-provided account filters MUST be intersected with owned account IDs before querying.
- No transaction-like path in this change may depend on `accounts!inner(user_id)` for ownership filtering.

Behavioral motion contract:

- One centralized `MotionConfig reducedMotion="user"` boundary wraps all route content.
- Route components using `motion.*` must inherit policy without local wrappers.

## Testing Strategy

| Layer       | What to Test                               | Approach                                                                                                                                          |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Account-scope helper behavior              | Add tests for owned IDs resolution, empty-account handling, and filter intersection semantics.                                                    |
| Unit        | Transaction repository ownership isolation | Mock Supabase responses and verify result isolation for owned vs unowned account datasets, including zero-account user path.                      |
| Unit        | Transfer repository ownership isolation    | Verify list/delete paths only operate on transactions tied to owned account IDs.                                                                  |
| Unit        | Subscription usage query behavior          | Update `tests/node/lib/subscriptions-usage.test.ts` to validate account-scoped count behavior rather than exact embedded select strings.          |
| Integration | Centralized reduced-motion inheritance     | Update route-aware provider tests to assert single policy boundary presence and behavior across landing/non-landing routes.                       |
| E2E         | Logo rendering contract outcomes           | Validate logo visibility and aspect-ratio consistency in sidebar/header/landing/waitlist, and capture console to fail on image mismatch warnings. |
| E2E         | Runtime stability regression check         | Verify authenticated transactions load flow no longer produces `/rest/v1/transactions` 400 in primary app path.                                   |

## Migration / Rollout

No schema migration required.

Rollout plan:

1. Land shared account-scope utility and refactor transactions/transfers/subscription usage paths.
2. Land shared logo component and swap logo callsites.
3. Land top-level `MotionConfig` boundary and remove local duplicates.
4. Update unit/integration/E2E tests to contract-level assertions.
5. Validate in staging with browser console capture and Supabase API logs.

Rollback plan:

- Revert the change set to previous repository query construction, local logo render callsites, and local `MotionConfig` wrappers.
- Re-run transaction loading and UI smoke tests to confirm prior behavior restoration.

Observability checks:

- Monitor Supabase API logs for `/rest/v1/transactions` 400 reductions after deployment.
- Track frontend console errors/warnings for Next/Image dimension mismatch and reduced-motion noise in test runs.
- Add targeted logging context in repository error paths (method + user scope state) to speed incident triage without exposing sensitive data.

## Open Questions

- [ ] `openspec/config.yaml` was referenced by context but is not present in the workspace; confirm whether any `rules.design` constraints exist outside repository files.
