# Product Requirements Document: Page Transitions & Performance Optimization

## 1. Introduction
This PRD outlines the plan to optimize the perceived and actual performance of page transitions within the FinTec application (specifically between Home, Accounts, and Transactions). Currently, the application experiences "jank" or delays due to client-side data fetching blocking UI rendering, lack of loading states, and improper routing techniques (e.g., full page reloads).

## 2. Goals
- **Eliminate Full Reloads:** Ensure all internal navigation uses Next.js client-side routing.
- **Immediate Visual Feedback:** Reduce "Time to First Byte" (TTFB) perception by implementing Skeleton Loaders and Suspense boundaries.
- **Optimized Data Fetching:** Implement "Stale-While-Revalidate" (SWR) or efficient Server Component data fetching to allow instant navigation with background updates.
- **Smooth Animations:** Implement coherent entry/exit animations for page transitions using Framer Motion.
- **Backend Efficiency:** Optimize the critical database queries for Accounts and Transactions to ensure the backend is not the bottleneck.

## 3. User Stories
- **US-1:** As a user, when I click "Accounts" or "Transactions" in the sidebar, the new page structure should appear immediately (skeleton), followed quickly by the data.
- **US-2:** As a user, I should never see a full browser refresh (white flash) when navigating within the app.
- **US-3:** As a user, switching between tabs (e.g., Income/Expenses) should feel instant because data is cached.
- **US-4:** As a user, I want the interface to feel "app-like" with smooth sliding or fading transitions between views, rather than abrupt jumps.

## 4. Functional Requirements

### 4.1. Navigation & Routing Fixes
- **Refactor `window.location.href`:** Identify and replace all instances of `window.location.href` (found in Sidebar for "Add Transaction") with Next.js `router.push()` or `<Link>` components to prevent full app reloads.
- **Prefetching:** Ensure critical Sidebar links use Next.js default prefetching behavior.

### 4.2. Loading States (UX)
- **Implement `loading.tsx`:** Create a Global `loading.tsx` or section-specific loading states using React Suspense.
- **Skeleton Components:** Create specific skeleton screens for:
    - **Dashboard Skeleton:** Header + empty charts + list placeholders.
    - **Accounts List Skeleton:** Card placeholders with shimmering effect.
    - **Transactions Table Skeleton:** Table rows with shimmering lines.
- **Transition Wrapper:** Create a `PageTransition` component using Framer Motion (AnimatePresence) to wrap page content, providing a subtle fade-in/slide-up effect on navigation.

### 4.3. Data Strategy (Architecture)
- **Hybrid Approach:**
    - **Server Components (RSC):** Where possible (e.g., `page.tsx`), pre-fetch initial data on the server so the page arrives with data.
    - **Client Hydration:** If utilizing client-side fetching (current pattern in `accounts/page.tsx`), implement a caching strategy (like React Query or SWR) so that revisiting a page shows the *last known data* instantly while fetching new data in the background.
    - **Parallel Fetching:** Ensure `Accounts` and `Exchange Rates` are fetched in parallel, not sequentially.

### 4.4. Backend Optimization
- **Query Analysis:** Analyze Supabase queries for `getAccounts` and `getTransactions`.
- **Indexing:** Verify indexes exist on frequently queried columns (e.g., `user_id`, `created_at`, `account_id`).
- **Pagination:** Ensure Transactions list implements cursor-based pagination (infinite scroll) rather than fetching all history at once.

## 5. Non-Goals
- Rewriting the entire backend API (optimizations are targeted).
- changing the design system colors or branding (focus is on behavior/performance).

## 6. Technical Considerations
- **Current Stack:** Next.js 14+ (App Router), Supabase, Tailwind CSS, Framer Motion.
- **Key Files to Modify:**
    - `app/layout.tsx` (Global providers/suspense)
    - `app/template.tsx` (Optional, for per-route animations)
    - `components/layout/sidebar.tsx` (Fix routing links)
    - `app/accounts/page.tsx` (Optimize fetching)
    - `components/ui/skeleton.tsx` (New component)

## 7. Success Metrics
- **Navigation Speed:** < 100ms visual response time for all sidebar clicks.
- **LCP (Largest Contentful Paint):** < 1.2s on core pages.
- **CLS (Cumulative Layout Shift):** < 0.1 (achieved by fixed-height skeletons).
