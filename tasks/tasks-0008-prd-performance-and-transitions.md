# Tasks: Page Transitions & Performance Optimization

## Relevant Files
- `components/layout/sidebar.tsx` - Main navigation component to refactor.
- `components/layout/mobile-nav.tsx` - Mobile navigation component to check for routing issues.
- `components/ui/skeleton.tsx` - Base skeleton primitive.
- `components/skeletons/dashboard-skeleton.tsx` - Composition of skeletons for the home page.
- `components/skeletons/accounts-skeleton.tsx` - Composition of skeletons for the accounts list.
- `app/template.tsx` - File for handling route transition animations.
- `app/loading.tsx` - Global Suspense fallback.
- `app/accounts/page.tsx` - Main accounts page to optimize data fetching.
- `repositories/supabase/accounts-repository-impl.ts` - Repository to optimize.

## Tasks

- [x] 1.0 Navigation & Routing Optimization
  - [x] 1.1 Analyze `components/layout/sidebar.tsx` and identify any `window.location.href` or standard `<a>` tags.
  - [x] 1.2 Replace identified tags with Next.js `<Link>` components or `router.push()` for client-side navigation.
  - [x] 1.3 Verify `components/layout/mobile-nav.tsx` (and any other nav components) for similar full-reload issues and fix them.
  - [x] 1.4 Ensure critical navigation links have `prefetch={true}` (default in Next.js) and test navigation speed.

- [x] 2.0 Skeleton Component System
  - [x] 2.1 Create/Refine `components/ui/skeleton.tsx` to ensure it uses Tailwind's `animate-pulse` and matches the dark theme (muted colors).
  - [x] 2.2 Create `components/skeletons/dashboard-skeleton.tsx`:
      - Include a Header placeholder.
      - Include a Grid placeholder for stats cards.
      - [x] Include a List placeholder for recent transactions.
  - [x] 2.3 Create `components/skeletons/accounts-skeleton.tsx`:
      - Replicate the layout of `AccountsPage` (Header + Grid of Cards + List).
      - [x] Use `SkeletonStatCard` styles as a reference.
  - [x] 2.4 Create `components/skeletons/transactions-skeleton.tsx`:
      - Create a table-like structure with repeating rows of shimmering lines.

- [x] 3.0 Global & Route-Specific Loading States
  - [x] 3.1 Create `app/loading.tsx` (Global) that exports the `DashboardSkeleton`. This ensures the user sees the skeleton immediately while the route segment loads.
  - [x] 3.2 Create `app/accounts/loading.tsx` that exports `AccountsSkeleton`.
  - [x] 3.3 Create `app/transactions/loading.tsx` that exports `TransactionsSkeleton`.
  - [x] 3.4 Remove manual spinner overlays (`isLoading` states that block the whole screen) from `app/page.tsx` or `app/accounts/page.tsx` in favor of these Suspense boundaries.

- [x] 4.0 Page Transition Animations
  - [x] 4.1 Create `components/layout/page-transition.tsx` using `framer-motion`.
      - Use `AnimatePresence` with `mode="wait"` or `mode="sync"`.
      - Define variants for `initial` (opacity 0, y: 10), `animate` (opacity 1, y: 0), and `exit` (opacity 0, y: -10).
  - [x] 4.2 Create/Update `app/template.tsx`.
      - Import `PageTransition`.
      - Wrap `{children}` with the transition component.
      - *Note: Using `template.tsx` ensures the animation plays on every route change.*

- [x] 5.0 Data Fetching Strategy (Accounts Page)
  - [x] 5.1 Refactor `app/accounts/page.tsx`:
      - Remove the `useEffect` that triggers `loadAccounts` on mount if possible, OR move it to a custom hook that implements SWR-like behavior (return cached data first, then fetch).
  - [x] 5.2 Implement Parallel Fetching:
      - If staying client-side: Ensure `loadAccounts`, `checkAlerts`, and `repository.transactions.findAll()` calls are grouped in `Promise.all` where they don't depend on each other.
  - [x] 5.3 (Optional/Advanced) Server Component Migration:
      - Convert `AccountsPage` to a Server Component (`async function`).
      - Fetch initial data on the server.
      - Pass data to a Client Component (e.g., `AccountsView`) for interactivity.
      - *Decision: Stick to optimized Client Fetching for now to avoid massive refactor, unless performance is still poor.*

- [x] 6.0 Backend Query Optimization
  - [x] 6.1 Review `repositories/supabase/accounts-repository-impl.ts`.
      - Ensure `select('*')` is only used if all fields are needed.
  - [x] 6.2 Review `repositories/supabase/transactions-repository-impl.ts`.
      - Verify pagination logic is efficient.
  - [x] 6.3 Verify Indexes (Manual Check):
      - Ensure Supabase has indexes on `accounts(user_id)` and `transactions(user_id, account_id, date)`.
