## Exploration: supabase-client-warning-and-transactions-400

### Current State

The codebase currently initializes browser Supabase clients from two different modules: `repositories/supabase/client.ts` (exported singleton `supabase`) and `lib/supabase/client.ts` (factory `createClient()` that creates a new browser client per call). Client code paths use both patterns (`AuthProvider` uses the repository singleton, while `ApprovalListener` creates its own client instance), which can trigger the GoTrue multiple-instance warning in browser runtime.

Transaction data access heavily depends on PostgREST embedded joins like `accounts!inner(user_id)` plus `.eq('accounts.user_id', userId)` in `SupabaseTransactionsRepository`, `SupabaseTransfersRepository`, and usage-count logic in `lib/supabase/subscriptions.ts`. Runtime reports indicate this pattern is now returning 400 from Supabase REST for transactions queries.

Logo rendering for `/finteclogodark.jpg` is inconsistent across pages. In particular, `components/layout/sidebar.tsx` uses explicit `width`/`height` props and then overrides dimensions with inline CSS (`width`/`height: auto`), which matches the Next.js warning pattern about width/height mismatch.

### Affected Areas

- `lib/supabase/client.ts` — creates new browser clients without shared singleton state.
- `repositories/supabase/client.ts` — separate browser singleton, causing dual client initialization paths.
- `components/ai/approval/approval-listener.tsx` — creates browser client via `createClient()` during mount.
- `contexts/auth-context.tsx` — uses repository singleton and coexists with other client factory usage.
- `repositories/supabase/transactions-repository-impl.ts` — many queries rely on `accounts!inner(user_id)` embedding/filtering.
- `repositories/supabase/transfers-repository-impl.ts` — same embedding pattern for transfer lookup/deletion.
- `lib/supabase/subscriptions.ts` — usage count query also relies on `accounts!inner(user_id)`.
- `components/layout/sidebar.tsx` — likely source of `/finteclogodark.jpg` width/height warning.
- `components/layout/header.tsx` — additional logo usage to keep behavior aligned after fix.
- `app/landing/landing-page-client.tsx` and `app/waitlist/page.tsx` — other `/finteclogodark.jpg` render paths that should stay consistent.

### Approaches

1. **Targeted Stabilization** — fix each runtime issue with minimal architectural change.
   - Pros: Fastest path; low blast radius; minimal refactor risk.
   - Cons: Leaves fragmented Supabase client ownership and repeated query patterns.
   - Effort: Medium

2. **Consolidated Supabase Access Pattern** — standardize browser client to one shared source and refactor user-scoped transaction queries to avoid embedded join dependency.
   - Pros: Removes root cause for GoTrue warning; avoids fragile PostgREST embed dependency; improves consistency.
   - Cons: Broader touch surface across repositories and client components; requires regression checks.
   - Effort: Medium/High

### Recommendation

Choose **Consolidated Supabase Access Pattern** with a phased implementation:

1. make `lib/supabase/client.ts` and `repositories/supabase/client.ts` resolve to one singleton source for browser runtime, 2) replace `accounts!inner(user_id)` ownership filters with a resilient user-scoping strategy (for example: fetch user account IDs once and filter by `account_id`, preserving auth/RLS checks), and 3) normalize `/finteclogodark.jpg` rendering by removing one-dimension CSS overrides and using consistent intrinsic or container-based sizing.

This addresses all reported warnings/errors at their likely roots instead of patching symptoms in isolated files.

### Risks

- Query refactor may change performance (extra account-ids lookup) and should be validated on high-volume accounts.
- Ownership filtering changes can accidentally broaden/narrow result sets if not consistently applied.
- UI logo sizing changes can cause subtle layout shifts on mobile/sidebar states.
- Existing tests mock current select strings (e.g., subscriptions usage); tests will need coordinated updates.

### Ready for Proposal

Yes — propose a scoped change covering (a) single browser Supabase client source, (b) transaction/transfer/usage query ownership refactor away from `accounts!inner`, and (c) unified logo image sizing contract for `/finteclogodark.jpg`.
