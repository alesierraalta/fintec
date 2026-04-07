status: completed
skill_resolution: injected

# Requirements

## R1: Root Entry (`/`) Renders Landing for Unauthenticated Users

**Priority**: MUST
**Description**: When an unauthenticated user visits `/`, the server component `app/page.tsx` must NOT redirect to `/auth/login`. Instead, it must render the landing experience inline at the root URL. The page must remain a Server Component and must determine auth state by calling `supabase.auth.getUser()` directly (or a thin wrapper) rather than calling `requireAuthenticatedUser()`.
**Rationale**: The current unconditional `await requireAuthenticatedUser()` in `app/page.tsx` causes a server-side redirect to `/auth/login` for every unauthenticated visitor, preventing landing from being the first entry point.
**Scenarios**:

- **Given** no active Supabase session exists **When** a user navigates to `/` **Then** the landing UI (equivalent to `/landing`) renders at `/` without any redirect.
- **Given** an active Supabase session exists **When** a user navigates to `/` **Then** the dashboard (`MainLayout` + `LazyDashboardContent`) renders at `/` as it does today.
- **Given** the Supabase session cookie is expired or invalid **When** a user navigates to `/` **Then** the landing UI renders (treated as unauthenticated).
- **Given** the `FRONTEND_AUTH_BYPASS` environment variable is enabled in non-production **When** a user navigates to `/` **Then** the dashboard renders (bypass behavior preserved for development/testing).

## R2: Provider Bypass Covers Root Landing Entry

**Priority**: MUST
**Description**: The `shouldBypassAppProviders()` function in `app/route-aware-providers.tsx` must return `true` for pathname `/` when the root route is rendering landing content. This ensures `AuthProvider` and `RepositoryProvider` are NOT mounted for unauthenticated root entry, matching the current bypass behavior for `/landing`.
**Rationale**: `RouteAwareProviders` currently bypasses providers only for `/landing` and subroutes. If landing renders at `/` without extending this rule, the landing UI will mount auth/repository providers unnecessarily, potentially causing side effects (auth state subscriptions, repository initialization) on a public page.
**Scenarios**:

- **Given** `usePathname()` returns `/` **When** `RouteAwareProviders` renders **Then** `AuthProvider` and `RepositoryProvider` are NOT in the component tree.
- **Given** `usePathname()` returns `/landing` **When** `RouteAwareProviders` renders **Then** `AuthProvider` and `RepositoryProvider` are NOT in the component tree (existing behavior preserved).
- **Given** `usePathname()` returns `/landing/features` **When** `RouteAwareProviders` renders **Then** `AuthProvider` and `RepositoryProvider` are NOT in the component tree (existing behavior preserved).
- **Given** `usePathname()` returns `/transactions` **When** `RouteAwareProviders` renders **Then** `AuthProvider` and `RepositoryProvider` ARE in the component tree.
- **Given** `usePathname()` returns `/auth/login` **When** `RouteAwareProviders` renders **Then** `AuthProvider` and `RepositoryProvider` ARE in the component tree.

## R3: Canonical and Open Graph Metadata Define `/` as Primary Entry

**Priority**: MUST
**Description**: The metadata in `app/page.tsx` (when rendering landing) must declare `/` as the canonical URL. The metadata in `app/landing/page.tsx` must reference `/` as canonical (via `canonical: '/'`) to avoid duplicate SEO signals, while `/landing` remains accessible as a public alias.
**Rationale**: Currently `app/landing/page.tsx` declares `canonical: '/landing'` and `og:url: '/landing'`. After this change, `/` becomes the primary public entry. Search engines must not treat `/` and `/landing` as duplicate content with competing canonical signals.
**Scenarios**:

- **Given** a request to `/` rendering landing **When** the page metadata is inspected **Then** `canonical` is `/`, and Open Graph `url` is `/`.
- **Given** a request to `/landing` **When** the page metadata is inspected **Then** `canonical` is `/` (pointing to primary entry), and Open Graph `url` is `/landing` (the current page).
- **Given** a request to `/` rendering dashboard **When** the page metadata is inspected **Then** metadata reflects the authenticated dashboard context (not landing metadata).

## R4: Login Redirect Target Contract

**Priority**: MUST
**Description**: After a successful login, the user must be redirected to the stored `redirectUrl` (if present) or to `/` as the default. The redirect target contract must be consistent across all login entry points: the login page (`app/auth/login/page.tsx`), the login form component (`components/auth/login-form.tsx`), and the client-side `AuthGuard`.
**Rationale**: The exploration phase identified a gap: server-side redirects to `/auth/login` (from `requireAuthenticatedUser`) do NOT set `sessionStorage.redirectUrl`, so deep-link return-path recovery is incomplete. This spec does NOT fix the server-side gap (that is out of scope), but it defines the contract that all client-side login paths must follow, and tests must verify the existing contract works.
**Scenarios**:

- **Given** a user was redirected to login via `AuthGuard` (which set `sessionStorage.redirectUrl`) **When** the user logs in successfully **Then** they are redirected to the stored `redirectUrl`.
- **Given** a user navigates directly to `/auth/login` with no stored redirect **When** the user logs in successfully **Then** they are redirected to `/` (which renders dashboard for authenticated users).
- **Given** a user logs in via the `LoginForm` component directly **When** login succeeds **Then** `router.push('/')` is called (existing behavior).
- **Given** a user is already authenticated and visits `/auth/login` **When** the login page loads **Then** they are redirected to `sessionStorage.redirectUrl || '/'` and the `redirectUrl` key is cleared from `sessionStorage`.

## R5: Protected Routes (Other Than `/`) Continue Redirecting Unauthenticated Users

**Priority**: MUST
**Description**: All routes other than `/` and `/landing` that use `requireAuthenticatedUser()` or `AuthGuard` must continue to redirect unauthenticated users to `/auth/login`. The landing-first change must not weaken protection on any authenticated route.
**Rationale**: Changing the root entry must not create a regression where protected routes become publicly accessible.
**Scenarios**:

- **Given** no active session **When** a user navigates to `/transactions` **Then** they are redirected to `/auth/login`.
- **Given** no active session **When** a user navigates to `/accounts` **Then** they are redirected to `/auth/login`.
- **Given** an active session **When** a user navigates to `/transactions` **Then** the transactions page renders normally.
- **Given** no active session **When** a user navigates to `/landing` **Then** the landing page renders (no redirect, existing behavior preserved).

## R6: `proxy.ts` Remains Session-Refresh-Only

**Priority**: MUST
**Description**: The `proxy.ts` file must NOT be modified to include landing-first or auth-gating logic. It must continue to call only `updateSession(request)` and return the response.
**Rationale**: The proposal explicitly chose to keep landing-first logic in `app/page.tsx` (Option A) to avoid splitting auth responsibility between proxy and pages. Moving auth gating to `proxy.ts` would duplicate concerns and increase complexity.
**Scenarios**:

- **Given** the implementation is complete **When** `proxy.ts` is inspected **Then** it contains only the `updateSession` call and the existing matcher config.
- **Given** a request to any path **When** it passes through `proxy.ts` **Then** no redirect decisions are made at the proxy level.

## R7: `/landing` Remains a Functional Public Alias

**Priority**: SHOULD
**Description**: The `/landing` route must continue to render the same landing UI as before. It remains a publicly accessible route with provider bypass, serving as an alias to the root landing entry.
**Rationale**: Preserving `/landing` avoids breaking any external links, bookmarks, or marketing materials that reference this URL. It also provides a fallback if product decides to consolidate routes later.
**Scenarios**:

- **Given** a user navigates to `/landing` **When** the page loads **Then** the same `LandingPageClient` component renders as before.
- **Given** a user navigates to `/landing` **When** the page loads **Then** no auth redirect occurs.
- **Given** an authenticated user navigates to `/landing` **When** the page loads **Then** the landing page still renders (authenticated users can view the public landing).

## R8: Root Page Component Structure

**Priority**: SHOULD
**Description**: `app/page.tsx` must remain a Server Component. It must call `createClient()` from `@/lib/supabase/server` and `supabase.auth.getUser()` to determine auth state. If authenticated, it renders `MainLayout` + `LazyDashboardContent`. If not authenticated, it renders the `LandingPageClient` component (or an equivalent server-side wrapper). The `requireAuthenticatedUser()` function must NOT be called in the landing branch.
**Rationale**: Keeping the root page as a Server Component aligns with Next.js App Router best practices (skill: nextjs-patterns, Pattern 1). Directly calling `supabase.auth.getUser()` avoids the redirect side-effect of `requireAuthenticatedUser()`.
**Scenarios**:

- **Given** `app/page.tsx` is compiled **When** the component tree is inspected **Then** the file does NOT have the `'use client'` directive.
- **Given** an unauthenticated request **When** `app/page.tsx` executes **Then** `requireAuthenticatedUser()` is NOT called.
- **Given** an authenticated request **When** `app/page.tsx` executes **Then** `MainLayout` and `LazyDashboardContent` are rendered.

# Edge Cases

## E1: Race Condition During Session Refresh

When `proxy.ts` is refreshing the session cookie and `app/page.tsx` simultaneously calls `supabase.auth.getUser()`, the user object may be in a transitional state. The page must handle `getUser()` returning `null` gracefully (render landing) without throwing errors.

## E2: `usePathname()` Returns `null`

In Next.js App Router, `usePathname()` can return `null` during initial render or in certain edge cases. The `shouldBypassAppProviders()` function must handle `null` safely (current implementation already returns `false` for `null`, which is correct — the root `/` should bypass providers only when explicitly matched).

## E3: Bot/Crawler Requests

Search engine crawlers and social media scrapers may request `/` without cookies. These requests must receive the landing HTML with proper metadata (R3), not a redirect to `/auth/login`. This is critical for SEO and social sharing.

## E4: Mobile App Deep Links

If the mobile shell or external deep links target `/` directly, the behavior must be consistent: landing for unauthenticated, dashboard for authenticated. No intermediate redirect flashes should occur.

## E5: FRONTEND_AUTH_BYPASS in Production

The `isFrontendAuthBypassEnabled()` check must NEVER enable bypass in production. If `NODE_ENV === 'production'`, the bypass flag must be ignored and unauthenticated requests must render landing (not dashboard). This is enforced by the existing `requireAuthenticatedUser()` logic and must be preserved.

## E6: Concurrent Landing and Dashboard Rendering

During the brief window when a user is logging in and the session is being established, if they navigate to `/`, the page must not render a hybrid state (partial landing + partial dashboard). The auth check is server-side and atomic, so this is inherently handled, but tests must verify no hydration mismatch occurs.

## E7: `/` with Query Parameters

Requests to `/?utm_source=google` or `/?ref=twitter` must render landing for unauthenticated users without stripping query parameters. The landing page must be accessible with any query string.

# Non-Functional Requirements

## NFR1: Performance — Landing First Contentful Paint

**Target**: The landing page at `/` must achieve a First Contentful Paint (FCP) of ≤ 1.5s on a simulated 3G connection (Lighthouse). The `LandingPageClient` already uses `dynamic()` with `ssr: false` for rate cards, which defers heavy JavaScript. This pattern must be preserved.

## NFR2: SEO — Indexable Landing Content

**Target**: The landing HTML at `/` must be server-rendered (not client-only) so that search engine crawlers can index the content. The `LandingPageClient` is a `'use client'` component, so the server component in `app/page.tsx` must render it as a child — the HTML shell will be present, but interactive content depends on JS execution. Metadata (title, description, canonical, OG tags) must be present in the server-rendered `<head>`.

## NFR3: Accessibility — Landing Page WCAG 2.1 AA

**Target**: The landing page at `/` must meet WCAG 2.1 AA standards. Existing landing elements (logo, CTAs, feature cards) must have proper `alt` text, ARIA labels, and keyboard navigation. The `reducedMotion` setting in `RouteAwareProviders` must respect user preferences (already implemented via `MotionConfig`).

## NFR4: Bundle Size — No Auth Bundle on Landing

**Target**: When `/` renders landing, the `AuthProvider` and `RepositoryProvider` code must NOT be included in the client bundle for that route. The provider bypass in `RouteAwareProviders` must prevent these providers from being imported, reducing the initial JavaScript payload for unauthenticated visitors.

## NFR5: Security — No Auth Data Leakage

**Target**: The landing page at `/` must not expose any user-specific data, session tokens, or internal API responses in the HTML source or client-side JavaScript. All data fetching on the landing page must be public-only (BCV rates, Binance rates).

## NFR6: Mobile Responsiveness

**Target**: The landing page at `/` must render correctly on viewports from 320px (mobile) to 1920px (desktop). The existing `LandingPageClient` already uses responsive Tailwind classes (`sm:`, `md:`, `lg:`); these must be preserved.

# Test Mapping

| Requirement                        | Test File                                            | Test Name                                                            |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| R1 (no-auth → landing)             | `tests/node/app/page.test.tsx`                       | `renders landing when no user is authenticated`                      |
| R1 (auth → dashboard)              | `tests/node/app/page.test.tsx`                       | `renders dashboard when user is authenticated`                       |
| R1 (expired session → landing)     | `tests/node/app/page.test.tsx`                       | `renders landing when getUser returns null`                          |
| R1 (bypass flag → dashboard)       | `tests/node/app/page.test.tsx`                       | `renders dashboard when FRONTEND_AUTH_BYPASS is enabled`             |
| R1 (E2E no-auth)                   | `tests/e2e/root-entry.spec.ts`                       | `/ renders landing without redirecting to login`                     |
| R1 (E2E auth)                      | `tests/e2e/root-entry.spec.ts`                       | `/ renders dashboard for authenticated user`                         |
| R2 (bypass for `/`)                | `tests/app/route-aware-providers.test.tsx`           | `bypasses providers for root path /`                                 |
| R2 (bypass for `/landing`)         | `tests/app/route-aware-providers.test.tsx`           | `bypasses providers for /landing (existing)`                         |
| R2 (no bypass for `/transactions`) | `tests/app/route-aware-providers.test.tsx`           | `mounts providers for /transactions`                                 |
| R3 (canonical `/`)                 | `tests/node/app/page.test.tsx`                       | `metadata has canonical / when rendering landing`                    |
| R3 (canonical `/landing` → `/`)    | `tests/node/app/landing/page.test.tsx`               | `metadata canonical points to /`                                     |
| R4 (stored redirect)               | `tests/e2e/login-return-path.spec.ts`                | `redirects to stored redirectUrl after login`                        |
| R4 (no stored redirect → `/`)      | `tests/e2e/login-return-path.spec.ts`                | `redirects to / when no redirectUrl is stored`                       |
| R4 (already authenticated)         | `tests/e2e/login-return-path.spec.ts`                | `authenticated user visiting login is redirected`                    |
| R5 (protected route redirect)      | `tests/e2e/auth-bypass-protected-routes.spec.ts`     | `redirects unauthenticated users when bypass is disabled` (existing) |
| R5 (protected route with auth)     | `tests/e2e/root-entry.spec.ts`                       | `/transactions loads for authenticated user`                         |
| R6 (proxy unchanged)               | `tests/node/proxy.test.ts`                           | `proxy only calls updateSession`                                     |
| R7 (`/landing` still works)        | `tests/e2e/logo-motion-console-verification.spec.ts` | `landing route stays free of warnings` (existing)                    |
| R7 (E2E `/landing` smoke)          | `tests/e2e/root-entry.spec.ts`                       | `/landing renders landing page`                                      |
| R8 (server component)              | `tests/node/app/page.test.tsx`                       | `page is a server component (no use client)`                         |
| E3 (bot/crawler)                   | `tests/e2e/root-entry.spec.ts`                       | `/ returns 200 with landing HTML for crawler user-agent`             |
| E7 (query params)                  | `tests/e2e/root-entry.spec.ts`                       | `/ with query params renders landing`                                |
| NFR1 (performance)                 | `tests/e2e/root-entry.spec.ts`                       | `landing FCP is within threshold`                                    |
| NFR4 (no auth bundle)              | `tests/node/app/page.test.tsx`                       | `no auth provider code in landing bundle`                            |

# Artifacts

- Engram topic saved: `sdd/landing-first-entry/spec`

next_recommended: sdd-design
