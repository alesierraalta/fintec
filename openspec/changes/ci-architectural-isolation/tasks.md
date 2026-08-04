## Phase 1: Architectural Isolation (Embedding Service)

- [x] Task 1: Create `EmbeddingService` interface and concrete implementation.
  - Extract the `EmbeddingService` interface and create the actual production implementation to handle AI-RAG logic.
- [x] Task 2: Inject `EmbeddingService` into `TransactionsRepository`.
  - Refactor `TransactionsRepository` to accept `EmbeddingService` via dependency injection.
  - Fix the instantiation of `TransactionsRepository` and update the DI container/usage accordingly.

## Phase 2: Standardized Logging

- [x] Task 3: Standardize logging in `app/goals/page.tsx`.
  - Replace raw `console.error` calls with the application's structured logger (`logger.error` or similar) to handle `invalid_account_fk` logs.
- [x] Task 4: Clean up test output for Goals page.
  - Update `tests/dom/app/goals/page.test.tsx` to properly handle or mock the structured logger, ensuring clean execution without raw console errors.

## Phase 3: Test Cleanup

- [x] Task 5: Resolve `act()` warnings in account tests.
  - Update component tests related to `useAccountsPage` (e.g., `tests/use-accounts-page.test.ts` or relevant tests).
  - Refactor async test handling to properly use `waitFor` instead of leaking `act()` warnings during state updates.
