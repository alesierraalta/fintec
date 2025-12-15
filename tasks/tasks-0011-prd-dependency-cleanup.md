# Task List: Dependency Cleanup (Paddle & Lemon Squeezy) (PRD-0011)

This document outlines the step-by-step process for removing `paddle` and `lemonsqueezy` dependencies and cleaning up the codebase. This plan integrates the PRD requirements with insights from the codebase investigation.

## Phase 1: Code Deletion (The "Leaf" Nodes)

**Task 1.1: Remove API Routes**
*   **Description:** Delete the backend API routes dedicated to Paddle and Lemon Squeezy integration.
*   **Actions:**
    *   Delete directory `app/api/paddle/`
    *   Delete directory `app/api/lemonsqueezy/`
*   **Verification:** Ensure no other API routes import from these folders.

**Task 1.2: Remove Hooks and Utilities**
*   **Description:** Delete the custom hooks and utility libraries used for these services.
*   **Actions:**
    *   Delete `hooks/use-paddle.ts`
    *   Delete `hooks/use-paddle-products.ts`
    *   Delete `hooks/use-lemon-squeezy-products.ts`
    *   Delete directory `lib/paddle/`
    *   Delete directory `lib/lemonsqueezy/`
*   **Verification:** `grep` for imports to these files to prepare for Phase 2.

## Phase 2: Refactoring Consuming Components (The "Roots")

**Task 2.1: Clean up `app/layout.tsx`**
*   **Description:** Remove the global script injection for Paddle and any associated environment variable reading (e.g., `NEXT_PUBLIC_PADDLE_VENDOR_ID`).
*   **Actions:**
    *   Remove the `<Script>` tag that loads `https://cdn.paddle.com/paddle/paddle.js` (or similar).
    *   Remove the environment variable check for Paddle vendor ID.

**Task 2.2: Refactor `lib/subscriptions`**
*   **Description:** This module currently abstracts subscription logic but likely imports directly from `lib/paddle`. This is a critical breaking point.
*   **Files:** `lib/subscriptions/check-limit.ts`, `lib/subscriptions/feature-gate.ts`, and others in that folder.
*   **Actions:**
    *   Replace imports from `@/lib/paddle/subscriptions` with local stubs or a generic interface.
    *   Ensure `getUserTier` and similar functions return a valid default state (e.g., "free" tier) instead of crashing due to missing Paddle functions.

**Task 2.3: Remove/Refactor Checkout Page**
*   **Description:** `app/checkout/page.tsx` relies heavily on `usePaddle`.
*   **Actions:**
    *   **Option A (Chosen):** Delete `app/checkout/page.tsx` entirely if checkout is no longer supported via this route.
    *   **Option B (Fallback):** If the route must exist, replace the content with a "Under Maintenance" or generic placeholder and remove all Paddle imports.

**Task 2.4: Update Pricing Components**
*   **Description:** `components/subscription/pricing-cards.tsx` likely uses `usePaddleProducts` or `useLemonSqueezyProducts`.
*   **Actions:**
    *   Remove the hook usage.
    *   Hardcode the pricing data (tiers, features, prices) directly in the component or fetch from a generic source, ensuring the UI still renders.

## Phase 3: Cleanup Types and Tests

**Task 3.1: Clean `types/subscription.ts`**
*   **Description:** Remove specific fields related to Paddle/Lemon Squeezy from the TypeScript interfaces.
*   **Actions:**
    *   Remove fields like `paddleSubscriptionId`, `paddleCustomerId`, `lemonSqueezyId`, etc.

**Task 3.2: Remove Obsolete Tests**
*   **Description:** Delete tests that specifically target the removed functionality.
*   **Actions:**
    *   Delete `tests/hooks/use-lemon-squeezy-products.test.ts`
    *   Delete `tests/components/subscription/pricing-cards.test.tsx` (or refactor if the component was kept).
    *   Update `tests/24-checkout-flow-complete.spec.ts` to remove Lemon Squeezy/Paddle flows or delete the file if the flow is gone.

## Phase 4: Package Removal and Final Verification

**Task 4.1: Uninstall Dependencies**
*   **Description:** Remove the packages from `package.json`.
*   **Command:** `npm uninstall @paddle/paddle-node-sdk @paddle/paddle-mcp` (and any Lemon Squeezy packages if present).

**Task 4.2: Final Build and Test**
*   **Description:** Verify system integrity.
*   **Actions:**
    *   Run `npm run build`. (Must pass with exit code 0).
    *   Run `npm run test`. (Must pass with exit code 0).
    *   Run `npx depcheck` (optional) to see if other dependencies are now unused.
