status: completed
skill_resolution: injected

# Architecture Decision

## Conditional Root Entry via Server-Side Auth Check

The root page (`app/page.tsx`) will transition from unconditional auth gating to **conditional branching** based on Supabase session state. Instead of calling `requireAuthenticatedUser()` — which has a side-effect of `redirect('/auth/login')` on failure — the page will call `createClient()` directly and inspect `supabase.auth.getUser()`. This is a deliberate choice to keep the page as a Server Component while gaining control over the render decision.

**Why this approach (Option A)**: The proposal explicitly chose Option A — auth decision lives in `app/page.tsx` — rather than moving gating logic to `proxy.ts` (Option B). This keeps `proxy.ts` as session-refresh-only (R6), avoids splitting auth responsibility across middleware and pages, and preserves the existing `requireAuthenticatedUser()` function for all other protected routes without modification.

**Component-level decision tree**:

1. `app/page.tsx` creates Supabase server client
2. Calls `supabase.auth.getUser()` (NOT `requireAuthenticatedUser()`)
3. If `user` is truthy → render `MainLayout` + `LazyDashboardContent` (existing dashboard)
4. If `user` is null/undefined AND `FRONTEND_AUTH_BYPASS` is enabled → render dashboard with bypass user
5. If `user` is null/undefined AND bypass is NOT enabled → render `LandingPageClient` (public landing)

**Why not create a new `getUser()` wrapper**: The existing `requireAuthenticatedUser()` already calls `createClient()` + `getUser()` internally. We will inline this pattern directly in `app/page.tsx` rather than extracting a new utility, because: (a) it's a single call site, (b) it avoids creating a function that could be misused elsewhere, (c) the logic is trivially simple and self-documenting. If a third call site emerges later, extraction becomes justified.

**Server Component preservation**: `app/page.tsx` must NOT gain the `'use client'` directive. The auth check happens at the server level, and the `LandingPageClient` is already a `'use client'` component that can be rendered as a child of a Server Component. This follows Next.js Pattern 1 (Server Components by Default) from `nextjs-patterns`.

# Component Flow

```
                    +----------------------------------------------+
                    |         app/page.tsx (Server)                 |
                    |                                               |
                    |  1. createClient()                            |
                    |  2. supabase.auth.getUser()                   |
                    |  3. isFrontendAuthBypassEnabled()?            |
                    +----------------------+-----------------------+
                                           |
                    +----------------------v-----------------------+
                    |           Decision Branch                     |
                    |                                               |
                    |  user exists? ---YES---> Dashboard path       |
                    |     |                                         |
                    |     NO                                        |
                    |     |                                         |
                    |  bypass enabled? --YES--> Dashboard path      |
                    |     |           (with mock user)              |
                    |     NO                                        |
                    |     |                                         |
                    |     v                                         |
                    |  Landing path                                 |
                    +----------------------+-----------------------+
                                           |
              +----------------------------+----------------------------+
              |                            |                            |
    +---------v----------+      +----------v-------+      +------v--------+
    |  Dashboard Path     |      | Landing Path     |      | Bypass Path   |
    |                     |      |                  |      |               |
    |  LocalProviders     |      | LandingPage      |      | LocalProviders|
    |    > MainLayout     |      |   Client         |      |   > MainLayout|
    |      > LazyDash     |      |  ('use client')  |      |     > LazyDash|
    +---------+----------+      +----------+-------+      +------+--------+
              |                            |                     |
              v                            v                     v
    +-----------------+        +------------------+    +-----------------+
    | RouteAware-     |        | RouteAware-      |    | RouteAware-     |
    | Providers       |        | Providers        |    | Providers       |
    |  (bypassed for  |        |  (bypassed for   |    |  (bypassed for  |
    |   "/" path)     |        |   "/" path)      |    |   "/" path)     |
    +-----------------+        +------------------+    +-----------------+
              |                            |                     |
              v                            v                     v
    +-----------------+        +------------------+    +-----------------+
    | LocalProviders  |        | NO Providers     |    | LocalProviders  |
    |  > MotionConfig |        |  > MotionConfig  |    |  > MotionConfig |
    |  > AuthProvider |        |  (bypassed)      |    |  > AuthProvider |
    |  > RepoProvider |        |                  |    |  > RepoProvider |
    +-----------------+        +------------------+    +-----------------+
```

**Data flow for authenticated path**:

```
Server: createClient() -> getUser() -> { user } -> render LocalProvidersForRootDashboard > MainLayout > LazyDashboardContent
Client: RouteAwareProviders detects pathname="/" -> shouldBypassAppProviders("/") returns true -> bypasses providers
       LocalProvidersForRootDashboard mounts providers locally -> dashboard works normally
```

**Data flow for unauthenticated path**:

```
Server: createClient() -> getUser() -> { user: null } -> render LandingPageClient
Client: RouteAwareProviders detects pathname="/" -> shouldBypassAppProviders("/") returns true -> skips AuthProvider + RepositoryProvider
       LandingPageClient renders with no auth/repository overhead
```

# Provider Strategy

## The Core Problem

`RouteAwareProviders` is a **client component** that only knows the pathname, not the auth state. The auth state is determined **server-side** in `app/page.tsx`. If we add `/` to the bypass list unconditionally, authenticated users visiting `/` would lose their providers and the dashboard would break.

## Resolution: Local Providers for Root Dashboard

**Step 1**: Extend `shouldBypassAppProviders()` in `app/route-aware-providers.tsx` to include `/`:

```typescript
function shouldBypassAppProviders(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  // Root path bypass: landing renders at "/" for unauthenticated users.
  // When "/" renders dashboard (authenticated), providers are mounted
  // locally via LocalProvidersForRootDashboard in app/page.tsx.
  return (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname.startsWith('/landing/')
  );
}
```

**Step 2**: Create `app/_lib/local-providers-for-root-dashboard.tsx` — a client component that re-provides the auth/repository context when the root renders dashboard:

```typescript
'use client';

import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';

interface LocalProvidersForRootDashboardProps {
  children: React.ReactNode;
}

export function LocalProvidersForRootDashboard({ children }: LocalProvidersForRootDashboardProps) {
  const reducedMotionSetting =
    process.env.NODE_ENV === 'development' ? 'never' : 'user';

  return (
    <MotionConfig reducedMotion={reducedMotionSetting}>
      <AuthProvider>
        <RepositoryProvider>{children}</RepositoryProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
```

**Why this works**:

- `RouteAwareProviders` bypasses for `/` (no providers from layout level)
- `LocalProvidersForRootDashboard` provides them for the dashboard branch only (page level)
- Landing branch gets no providers at all (satisfies NFR4 — no auth bundle on landing)
- Authenticated root gets providers via local wrapper (dashboard works correctly)
- The `MotionConfig` is duplicated but consistent — both paths use the same reducedMotion policy

**Why not use React Context to signal auth state**: Overly complex. A server-to-client context signal would require creating a new context, a server component to set it, and modifying `RouteAwareProviders` to read it. The local providers approach is simpler, more explicit, and easier to test.

# Metadata Strategy

## Root Page (`app/page.tsx`) — Conditional Metadata via `generateMetadata()`

Since `app/page.tsx` renders different content based on auth state, metadata must also be conditional. Use `generateMetadata()` which runs server-side:

**When rendering landing (unauthenticated)**:

- `canonical: '/'` — declares `/` as the primary public entry
- `og:url: '/'` — Open Graph URL matches canonical
- Full landing SEO metadata (title, description, OG image, Twitter card)

**When rendering dashboard (authenticated)**:

- `title: 'Dashboard | FinTec'` — dashboard-specific title
- `robots: 'noindex, nofollow'` — prevent search engines from indexing authenticated content
- No OG tags — authenticated pages should not be shareable via social previews

**Implementation pattern**:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const authState = await getRootAuthState();

  if (authState === 'authenticated') {
    return {
      title: 'Dashboard | FinTec',
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: 'FinTec - Finanzas Personales con Tasas Actualizadas',
    description:
      'Controla tus finanzas con tasas del BCV y Binance en tiempo real...',
    alternates: { canonical: '/' },
    openGraph: {
      title: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
      description: 'La app financiera para Venezuela con tasas en vivo...',
      url: '/',
      siteName: 'FinTec',
      locale: 'es_VE',
      type: 'website',
      images: [{ url: '/finteclogodark.jpg', alt: 'FinTec' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
      description: 'Accede a tasas oficiales y P2P en tiempo real...',
      images: ['/finteclogodark.jpg'],
    },
  };
}
```

## Landing Page (`app/landing/page.tsx`) — Alias Metadata

Update to reference `/` as canonical while keeping `/landing` as the current page URL:

```typescript
export const metadata: Metadata = {
  title: 'FinTec Landing - Finanzas Personales con Tasas Actualizadas',
  description:
    'Controla tus finanzas con tasas del BCV y Binance en tiempo real...',
  alternates: {
    canonical: '/', // Changed from '/landing' — points to primary entry
  },
  openGraph: {
    // ... same content ...
    url: '/landing', // Current page URL (not canonical)
  },
};
```

**Rationale**: `canonical` tells search engines "the authoritative version of this content is at `/`". `og:url` tells social platforms "this specific page is at `/landing`". This avoids duplicate content penalties while preserving correct social sharing for `/landing` links.

# Test Architecture

## Test File Structure

```
tests/
├── node/
│   ├── app/
│   │   ├── page.test.tsx              # NEW: Root page unit tests (R1, R3, R8, NFR4)
│   │   └── landing/
│   │       └── page.test.tsx          # NEW: Landing metadata tests (R3)
│   ├── app/_lib/
│   │   ├── root-auth-state.test.ts    # NEW: Auth state logic (R1, E5)
│   │   └── require-authenticated-user.test.ts  # EXISTING: unchanged
│   └── proxy.test.ts                  # NEW: Proxy unchanged verification (R6)
├── app/
│   └── route-aware-providers.test.tsx # EXISTING: extended with "/" tests (R2)
└── e2e/
    ├── root-entry.spec.ts             # NEW: Root entry E2E tests (R1, R5, R7, E3, E7, NFR1)
    ├── login-return-path.spec.ts      # NEW: Login redirect contract (R4)
    └── auth-bypass-protected-routes.spec.ts  # EXISTING: unchanged (R5)
```

## Unit Tests (Jest)

### `tests/node/app/page.test.tsx` — Root Page Rendering

| Test Case                                                | Requirement | Assertion                                    |
| -------------------------------------------------------- | ----------- | -------------------------------------------- |
| `renders landing when no user is authenticated`          | R1          | LandingPageClient in tree, no MainLayout     |
| `renders dashboard when user is authenticated`           | R1          | MainLayout + LazyDashboardContent in tree    |
| `renders landing when getUser returns null`              | R1 (E1)     | LandingPageClient, no error thrown           |
| `renders dashboard when FRONTEND_AUTH_BYPASS is enabled` | R1          | Dashboard with bypass user                   |
| `metadata has canonical / when rendering landing`        | R3          | generateMetadata() returns canonical: '/'    |
| `metadata has noindex when rendering dashboard`          | R3          | generateMetadata() returns robots: 'noindex' |
| `page is a server component (no use client)`             | R8          | File does not contain 'use client' directive |
| `no auth provider code in landing bundle`                | NFR4        | Landing branch does not import AuthProvider  |

**Mocking strategy**:

- Mock `@/lib/supabase/server` → `createClient()` returns configurable user/error
- Mock `@/lib/auth/is-frontend-auth-bypass-enabled` → returns configurable boolean
- Mock `@/components/landing/landing-page-client` → stub component
- Mock `@/components/layout/main-layout` → stub component
- Mock `@/components/dashboard/lazy-dashboard-content` → stub component

### `tests/node/app/_lib/root-auth-state.test.ts` — Auth State Logic

| Test Case                                               | Requirement | Assertion                               |
| ------------------------------------------------------- | ----------- | --------------------------------------- |
| `returns authenticated when user exists`                | R1          | Returns 'authenticated'                 |
| `returns landing when no user and no bypass`            | R1          | Returns 'landing'                       |
| `returns authenticated when no user but bypass enabled` | R1          | Returns 'authenticated'                 |
| `returns landing when getUser returns error`            | R1 (E1)     | Returns 'landing', no throw             |
| `rejects bypass in production`                          | E5          | Returns 'landing' even with bypass flag |

### `tests/app/route-aware-providers.test.tsx` — Extended Provider Tests

| Test Case                                      | Requirement | Assertion                                  |
| ---------------------------------------------- | ----------- | ------------------------------------------ |
| `bypasses providers for root path /`           | R2          | No AuthProvider/RepositoryProvider for "/" |
| `bypasses providers for /landing (existing)`   | R2          | Preserved existing behavior                |
| `bypasses providers for /landing/* (existing)` | R2          | Preserved existing behavior                |
| `mounts providers for /transactions`           | R2          | AuthProvider + RepositoryProvider present  |
| `mounts providers for /auth/login`             | R2          | AuthProvider + RepositoryProvider present  |
| `handles null pathname safely`                 | E2          | Returns false, providers mounted           |

### `tests/node/proxy.test.ts` — Proxy Unchanged

| Test Case                        | Requirement | Assertion                                   |
| -------------------------------- | ----------- | ------------------------------------------- |
| `proxy only calls updateSession` | R6          | Source contains only updateSession call     |
| `proxy has no redirect logic`    | R6          | No redirect/NextResponse.redirect in source |

## E2E Tests (Playwright)

### `tests/e2e/root-entry.spec.ts` — Root Entry Behavior

| Test Case                                          | Requirement | Steps                                                                         |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `/ renders landing without redirecting to login`   | R1          | Navigate to `/` with no auth -> verify landing content visible, URL stays `/` |
| `/ renders dashboard for authenticated user`       | R1          | Login first -> navigate to `/` -> verify dashboard content                    |
| `/landing renders landing page`                    | R7          | Navigate to `/landing` -> verify landing content                              |
| `/transactions redirects unauthenticated to login` | R5          | Navigate to `/transactions` with no auth -> verify redirect to `/auth/login`  |
| `/ with query params renders landing`              | E7          | Navigate to `/?utm_source=google` -> verify landing renders, params preserved |
| `/ returns 200 with landing HTML for crawler`      | E3          | Set crawler user-agent -> verify 200 + landing HTML                           |
| `landing FCP is within threshold`                  | NFR1        | Measure FCP via Performance API -> assert <= 1500ms                           |

### `tests/e2e/login-return-path.spec.ts` — Login Redirect Contract

| Test Case                                         | Requirement | Steps                                                                                               |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `redirects to stored redirectUrl after login`     | R4          | Navigate to protected route -> AuthGuard sets redirectUrl -> login -> verify redirect to stored URL |
| `redirects to / when no redirectUrl is stored`    | R4          | Navigate to `/auth/login` directly -> login -> verify redirect to `/`                               |
| `authenticated user visiting login is redirected` | R4          | Login first -> visit `/auth/login` -> verify redirect to `/` or stored URL                          |

# Migration Path

1. **Create `app/_lib/root-auth-state.ts`** — Server-only module with `getRootAuthState()` function. Calls `createClient()` + `getUser()` + `isFrontendAuthBypassEnabled()`. Returns `'authenticated'` or `'landing'`. Add unit tests immediately.

2. **Create `app/_lib/local-providers-for-root-dashboard.tsx`** — Client component wrapping children with `MotionConfig`, `AuthProvider`, and `RepositoryProvider`. Thin wrapper, no logic. No tests needed (composition only).

3. **Update `app/page.tsx`** — Replace `requireAuthenticatedUser()` with `getRootAuthState()`. Branch: authenticated -> `LocalProvidersForRootDashboard` > `MainLayout` > `LazyDashboardContent`; landing -> `LandingPageClient` directly. Add `generateMetadata()` for conditional metadata. Remove `requireAuthenticatedUser` import.

4. **Update `app/landing/page.tsx`** — Change `canonical` from `/landing` to `/`. Keep `og:url` as `/landing`.

5. **Update `app/route-aware-providers.tsx`** — Add `pathname === '/'` to `shouldBypassAppProviders()` bypass list. Add comment explaining local providers pattern.

6. **Add unit tests** — `tests/node/app/page.test.tsx`, `tests/node/app/_lib/root-auth-state.test.ts`, `tests/node/proxy.test.ts`. Extend `tests/app/route-aware-providers.test.tsx` with "/" test cases.

7. **Add E2E tests** — `tests/e2e/root-entry.spec.ts`, `tests/e2e/login-return-path.spec.ts`.

8. **Verify no regression** — Run full test suite. Confirm `proxy.ts` unchanged. Confirm existing protected routes still redirect unauthenticated users.

9. **Performance verification** — Run Lighthouse on `/` to verify FCP <= 1.5s. Verify bundle analysis shows no auth code in landing branch.

# Alternatives Considered

| Alternative                                                             | Why Rejected                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Option B: Move auth gating to `proxy.ts` (middleware)**               | Violates R6 explicitly. Would duplicate auth logic between middleware and pages. Increases complexity and makes `proxy.ts` responsible for both session refresh AND routing decisions.         |
| **Add `/` to `shouldBypassAppProviders()` without local providers**     | Would break dashboard at `/` because `MainLayout` and `LazyDashboardContent` depend on `useAuth()` and repository context. Providers would be missing, causing runtime errors.                 |
| **Create route groups `(landing)/page.tsx` and `(dashboard)/page.tsx`** | Next.js doesn't support two `page.tsx` files resolving to the same URL path. Route groups create the same URL, causing a build conflict.                                                       |
| **Client-side auth check in `page.tsx` (add `'use client'`)**           | Violates R8 and Next.js Pattern 1. Would cause flash of landing -> dashboard transition for authenticated users. Increases bundle size. Loses server-side rendering benefits.                  |
| **Create new `/home` route for authenticated, redirect `/` to landing** | Changes URL structure. Breaks existing bookmarks. Creates confusion between `/` and `/home`. Doesn't solve the core problem of root being the entry point.                                     |
| **Use cookies/headers to signal auth state to `RouteAwareProviders`**   | Overly complex. Client components can read cookies but it adds latency and race conditions. The local providers approach is simpler and more maintainable.                                     |
| **Keep `requireAuthenticatedUser()` but catch the redirect**            | `redirect()` in Next.js throws a special error that cannot be caught meaningfully. The function's purpose is to redirect, not return state. Using it for conditional logic is an anti-pattern. |
| **Extract `getUser()` as shared utility function**                      | Premature abstraction. Only one call site (`app/page.tsx`). If a third call site emerges, extraction becomes justified. For now, inline the pattern via `getRootAuthState()`.                  |

# Artifacts

- Engram topic saved: `sdd/landing-first-entry/design`

next_recommended: sdd-tasks
