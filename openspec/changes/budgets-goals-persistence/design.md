# Design: Full Integration and Repository Persistence for Budgets and Goals Systems

## Technical Approach

The goal is to move the Budgets and Goals systems from local state/mocks to a robust Supabase-backed persistence layer. We will implement the `SupabaseBudgetRepository` and `SupabaseGoalRepository` following the existing repository pattern and integrate them into the `AppRepository` factory. Progress tracking for budgets will be calculated by aggregating transactions in the repository layer, ensuring real-time accuracy. Goals progress will be linked to account balances or manual contributions.

## Architecture Decisions

### Decision: Repository Aggregation vs. Database Triggers

**Choice**: Calculate budget and goal progress in the repository layer using Supabase queries.
**Alternatives considered**: Background cron jobs, Supabase triggers, or edge functions.
**Rationale**: Calculating at the repository layer ensures that the UI always shows the most current data without the complexity of managing triggers or external jobs. It also simplifies the testing of the aggregation logic in unit/integration tests.

### Decision: Reuse of Existing Transaction/Account Repository Patterns

**Choice**: Follow the established `SupabaseRepository` pattern using `SupabaseClient` and mappers.
**Alternatives considered**: Direct Supabase calls in components.
**Rationale**: Consistency with the rest of the codebase (Transactions, Accounts, Categories) is paramount for maintainability and testability.

### Decision: Budget Month-Year Storage

**Choice**: Use `YYYY-MM` format string for `month_year` in the database, mapping to `YYYYMM` in the domain if necessary, or standardizing on `YYYY-MM`.
**Alternatives considered**: Storing as `DATE` (first day of month), or `INTEGER`.
**Rationale**: The existing schema in `types.ts` uses `TEXT` for `month_year` with a comment `-- YYYY-MM format`. We will stick to this for consistency.

## Data Flow

### Budget Progress Calculation

    BudgetRepository ──→ Supabase.budgets (fetch active budgets)
         │
         └─────────────→ Supabase.transactions (sum(amount_base_minor) WHERE category_id AND month_year match)
         │
         └─────────────→ Domain.BudgetWithProgress (merged result)

### Goal Progress Calculation

    GoalRepository ──→ Supabase.goals (fetch active goals)
         │
         └─────────────→ Supabase.accounts (if linked: fetch current balance)
         │
         └─────────────→ Domain.GoalWithProgress (merged result)

## File Changes

| File                                               | Action | Description                                                                                               |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `repositories/contracts/index.ts`                  | Modify | Add `budgets` and `goals` to `AppRepository` interface (avoiding `any`).                                  |
| `repositories/supabase/budgets-repository-impl.ts` | Modify | Complete implementation of all `BudgetsRepository` methods.                                               |
| `repositories/supabase/goals-repository-impl.ts`   | Modify | Complete implementation of all `GoalsRepository` methods.                                                 |
| `repositories/supabase/index.ts`                   | Modify | Update `SupabaseAppRepository` to instantiate the new repositories.                                       |
| `repositories/factory.ts`                          | Modify | Ensure `createServerAppRepository` and `createClientAppRepository` return fully implemented repositories. |
| `app/budgets/page.tsx`                             | Modify | Use `repository.budgets.create/update/delete` instead of local state.                                     |
| `app/goals/page.tsx`                               | Modify | Initialize `goals` from `repository.goals.findAll()` and use repository for actions.                      |
| `tests/integration/budgets-persistence.test.ts`    | Create | Test saving budgets and verifying transaction aggregation.                                                |
| `tests/integration/goals-persistence.test.ts`      | Create | Test goal tracking against account balances.                                                              |

## Interfaces / Contracts

The contracts are already defined in `repositories/contracts/budgets-repository.ts` and `repositories/contracts/goals-repository.ts`. We will strictly adhere to them.

## Testing Strategy

| Layer       | What to Test       | Approach                                                                             |
| ----------- | ------------------ | ------------------------------------------------------------------------------------ |
| Unit        | Repository Mappers | Verify `mapSupabaseBudgetToDomain` and others correctly handle snake_case/camelCase. |
| Unit        | Repository Logic   | Mock `SupabaseClient` to verify queries (filtering by `user_id`, `active`, etc).     |
| Integration | Progress Logic     | Use `canonical-fixtures` to seed transactions and verify budget spent calculation.   |
| E2E         | Budgets Flow       | Playwright test: Create budget, add transaction, verify progress bar updates.        |

## Migration / Rollout

No data migration required as the tables are currently empty or only contain development test data. A manual SQL migration (`SUPABASE_SCHEMA`) should be applied if not already present in the target environment.

## Open Questions

- [ ] Should we implement a "contribution" transaction for goals not linked to a specific account? (Currently planned as manual contribution in the repo).
- [ ] How to handle recurring budgets? (Out of scope for this change, but the design should allow future integration).
