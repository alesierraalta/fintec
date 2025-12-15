# Product Requirements Document (PRD): Fix Transaction Creation Crash & Standardization

## 1. Introduction
This PRD addresses a critical "Client-side exception" (Error #185 - Maximum update depth exceeded) occurring specifically on the PC version of the "Create Transaction" page (`/transactions/add`). The error prevents users from creating transactions. The goal is to fix this crash, optimize the data loading strategy to prevent re-renders, and standardize the user experience across devices.

## 2. Goals
*   **Eliminate Crash:** Resolve the "Maximum update depth exceeded" error in `DesktopAddTransaction`.
*   **Optimize Performance:** Stop unnecessary re-renders by memoizing the Repository Provider and using cached data hooks.
*   **Standardize UI:** Ensure the Mobile version uses the same modern notification system as the Desktop version.
*   **Instant Loading:** Refactor data fetching to use the optimized cache, providing immediate access to accounts and categories.

## 3. User Stories
*   **As a User (PC)**, I want to open the "New Transaction" screen without the application crashing so I can log my expenses.
*   **As a User (Mobile)**, I want to see nice toast notifications instead of native browser alerts when I save a transaction.
*   **As a Developer**, I want the data layer to be stable so that components don't re-render infinitely when accessing the repository.

## 4. Functional Requirements

### 4.1. Fix Repository Provider Stability
*   **Context:** The `RepositoryProvider` currently creates a *new* instance of `SupabaseAppRepository` on every render. This triggers downstream effects (like `useEffect`) to re-run infinitely.
*   **Requirement:** Wrap the repository creation in `useMemo` (or a singleton pattern) within `providers/repository-provider.tsx` to ensure the instance remains stable across renders.

### 4.2. Refactor Data Loading (Desktop & Mobile)
*   **Context:** Currently, `DesktopAddTransaction` and `MobileAddTransaction` perform direct repository calls inside `useEffect`.
*   **Requirement:**
    *   Replace `useEffect` data fetching with the `useOptimizedData()` hook.
    *   Remove local `loadingAccounts` / `loadingCategories` states (rely on the hook's `loading`).
    *   This ensures data is loaded once and shared, preventing the "fetch-render-fetch" loop.

### 4.3. Optimize DesktopAddTransaction Component
*   **Requirement:**
    *   Wrap event handlers (`handleSubmit`, `handleCategorySaved`) in `useCallback`.
    *   Ensure the component handles the "loading" state from `useOptimizedData` gracefully without blocking the UI if data is already cached.

### 4.4. Standardize Mobile Notifications
*   **Context:** `MobileAddTransaction` currently uses `alert()`.
*   **Requirement:**
    *   Import `useNotifications` from `@/lib/store`.
    *   Replace all `alert()` calls with `addNotification({ type: 'success' | 'error', ... })`.
    *   Ensure the success redirection to `/transactions` happens *after* a brief delay to let the user see the success message (matching Desktop behavior).

## 5. Non-Goals
*   Redesigning the transaction form UI (visuals stay the same).
*   Changing the backend logic for transaction creation (zod validation remains as implemented in previous tasks).

## 6. Technical Considerations
*   **File:** `providers/repository-provider.tsx` needs `useMemo`.
*   **File:** `app/transactions/add/desktop-add-transaction.tsx` needs `useOptimizedData`.
*   **File:** `app/transactions/add/mobile-add-transaction.tsx` needs `useOptimizedData` and `useNotifications`.

## 7. Success Metrics
*   The PC "Create Transaction" page loads instantly without error.
*   No console errors regarding "Maximum update depth" or "React error #185".
*   Mobile users see toast notifications for success/error actions.
