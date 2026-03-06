## Exploration: fix-transactions-query-400

### Current State

Transactions data in the browser is loaded through `useOptimizedData` -> `repository.transactions.findAll(150)` (`hooks/use-optimized-data.ts`). The Supabase repository implementation builds many PostgREST queries using embedded joins (`accounts!inner(user_id)`) plus `.eq('accounts.user_id', userId)` (notably in `repositories/supabase/transactions-repository-impl.ts`, plus related patterns in `repositories/supabase/transfers-repository-impl.ts` and `lib/supabase/subscriptions.ts`). This aligns with the reported runtime 400 on `/rest/v1/transactions`.

`/finteclogodark.jpg` is rendered in several places, but the sidebar logo combines intrinsic `width`/`height` with dynamic inline `style` overrides (`width: ... | 'auto'`, `height: 'auto'`) in `components/layout/sidebar.tsx`, which matches the Next/Image ratio warning pattern.

Framer Motion is used across many components/routes. `MotionConfig reducedMotion="user"` is currently route-local (e.g., `components/layout/main-layout.tsx`, `components/layout/page-transition.tsx`, `app/landing/landing-page-client.tsx`) rather than globally enforced. Auth screens use `motion` components (e.g., `components/auth/login-form.tsx`) without an obvious global MotionConfig wrapper, which is a likely source of reduced-motion console noise.

### Affected Areas

- `repositories/supabase/transactions-repository-impl.ts` — primary source of 400-prone embedded-join query shape.
- `repositories/supabase/transfers-repository-impl.ts` — same ownership filtering pattern likely to fail similarly.
- `lib/supabase/subscriptions.ts` — monthly usage count depends on the same embedded join pattern.
- `hooks/use-optimized-data.ts` — browser entry-point that triggers failing transactions list query.
- `components/layout/sidebar.tsx` — direct Next/Image width/height ratio warning candidate.
- `components/layout/header.tsx` — same logo asset usage; should be kept consistent when normalizing image contract.
- `app/landing/landing-page-client.tsx` and `app/waitlist/page.tsx` — additional logo usages to keep behavior aligned.
- `app/route-aware-providers.tsx` and auth motion components such as `components/auth/login-form.tsx` — likely boundary for global reduced-motion handling.
- `tests/node/lib/subscriptions-usage.test.ts` — currently asserts the exact `accounts!inner(user_id)` select string and will require update if query strategy changes.

### Approaches

1. **Minimal hotfixes per warning** — patch only the exact failing transactions query and the sidebar logo CSS, leave motion and query patterns mostly as-is.
   - Pros: Fastest delivery; low immediate churn.
   - Cons: Leaves duplicated fragile query patterns in transfers/subscriptions and leaves motion warning risk on non-layout routes.
   - Effort: Low/Medium

2. **Scoped runtime-stability pass** — refactor user-scoped transaction-like queries away from embedded joins, normalize logo rendering contract for `/finteclogodark.jpg`, and introduce one global MotionConfig boundary.
   - Pros: Fixes all reported runtime issues at likely roots; reduces repeated regressions and console noise.
   - Cons: Touches multiple modules and snapshots/tests; requires focused regression checks.
   - Effort: Medium

### Recommendation

Choose **Scoped runtime-stability pass**.

Define the change scope as three tightly related tracks:

1. replace `accounts!inner(user_id)` ownership filtering in transactions/transfers/usage paths with resilient account-id scoping (or equivalent non-embedded strategy),
2. standardize logo rendering API for `/finteclogodark.jpg` (no mixed intrinsic dimensions + conflicting CSS overrides), and
3. move reduced-motion policy to a global app wrapper so motion components on auth/marketing/product routes inherit one configuration.

This is the best balance between fixing the current 400/warnings and preventing repeat runtime noise.

### Risks

- Query strategy change can alter result cardinality if account ownership filters are not consistently applied.
- Moving away from embedded joins may add one preliminary accounts lookup and impact latency under large account sets.
- Logo sizing normalization can introduce subtle layout shifts (especially sidebar minimized state).
- Global MotionConfig may slightly change animation behavior on routes that currently rely on implicit defaults.
- Existing tests that assert previous select strings or visual assumptions will need synchronized updates.

### Ready for Proposal

Yes — proceed with `/sdd:new` using this scope.
