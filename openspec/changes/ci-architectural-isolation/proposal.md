## Intent

The test suite output is currently polluted with warnings, errors, and unhandled side-effects (e.g., `act()` warnings, missing API keys, and raw console errors). The intent of this change is to clean up test output and improve system architecture by strictly adhering to Architectural Isolation (Clean Architecture) principles. This ensures components and repositories are testable, decoupled from third-party services, and use standardized logging.

## Scope

### In Scope

- Extracting an `EmbeddingService` interface and injecting it into `TransactionsRepository`.
- Replacing raw `console.error` calls with the application's structured logger in `app/goals/page.tsx`.
- Refactoring tests for asynchronous components to correctly use `waitFor` to handle microtasks and resolve `act()` warnings (e.g., in `use-accounts-page.ts`).

### Out of Scope

- Implementing the pragmatic test-mock approach (explicitly rejected by the user).
- Modifying business logic or adding new features unrelated to test cleanup and architectural isolation.
- Refactoring repositories other than `TransactionsRepository`.

## Approach

We will use Architectural Isolation to address the test output pollution:

1. **Dependency Injection**: Define an `EmbeddingService` interface. Implement the real service for production and a mock service for tests. Inject this interface into `TransactionsRepository` to prevent it from failing due to missing API keys (`[ai-rag]`) during test runs.
2. **Standardized Logging**: Update `app/goals/page.tsx` to use a structured logger instance instead of `console.error` for `invalid_account_fk` logs. In tests, the logger can be silenced or asserted against cleanly.
3. **Async Test Handling**: Update the testing setup for `use-accounts-page.ts` and related components to correctly use `waitFor` or appropriate async test utilities, ensuring all state updates complete before assertions and resolving `act()` warnings.

## Affected Areas

| Area                                            | Impact   | Description                                                                 |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `repositories/transactions-repository-impl.ts`  | Modified | Inject `EmbeddingService` dependency to decouple from concrete AI services. |
| `services/embedding-service.ts`                 | New      | Create `EmbeddingService` interface and concrete implementations.           |
| `app/goals/page.tsx`                            | Modified | Replace `console.error` with structured logger.                             |
| `tests/use-accounts-page.test.ts` (or relevant) | Modified | Update tests to properly await async operations using `waitFor`.            |

## Risks

| Risk                            | Likelihood | Mitigation                                                                                          |
| ------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Dependency Injection complexity | Low        | Ensure the IoC container or injection pattern is simple and well-documented.                        |
| Uncaught async test errors      | Low        | Carefully review test output locally before committing to ensure all `act()` warnings are resolved. |

## Rollback Plan

Revert the commits introducing the interface and test refactorings. Since these changes primarily affect dependency injection and test utilities, the rollback is safe and should not impact production data.

## Dependencies

- Existing structured logging utility.

## Success Criteria

- [ ] Test suite runs cleanly with zero `act()` warnings.
- [ ] Test suite runs without missing Google Key (`[ai-rag]`) errors.
- [ ] Test suite runs without raw `console.error` logs from `app/goals/page.tsx`.
- [ ] `TransactionsRepository` relies on an injected `EmbeddingService` rather than a hardcoded third-party integration.
