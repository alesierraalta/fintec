# Proposal: Full Integration and Repository Persistence for Budgets and Goals Systems

## Intent

Integrate the Budgets and Goals systems with the persistence layer (Supabase) to ensure functional synergy and state persistence. Currently, `app/budgets/page.tsx` handles saves in local state only, and `app/goals/page.tsx` uses mocked data. This creates a fragmented user experience where financial planning does not reflect real-time transaction data.

## Scope

### In Scope

- Define domain models for `Budget` and `Goal` in `types/domain.ts`.
- Create Supabase schema for `budgets` and `goals` tables.
- Implement `SupabaseBudgetRepository` and `SupabaseGoalRepository`.
- Refactor `app/budgets/page.tsx` to persist budgets in Supabase.
- Refactor `app/goals/page.tsx` to load goals and accounts from Supabase repositories.
- Link budgets and goals to actual transactions/account balances for progress tracking.
- Add unit tests for repositories and integration tests for Budgets-Transactions interaction.

### Out of Scope

- Advanced financial forecasting or planning algorithms beyond current mocked logic.
- Complex recurring budget rules (keep it simple as per current mocks for now).

## Approach

1. **Domain & Schema**: Align domain types with `money-handling` skill (using minor units/centavos). Create SQL migrations for Supabase.
2. **Repositories**: Implement standard repository patterns already established for Transactions and Accounts.
3. **Logic Integration**: Update the UI logic to fetch data from repositories. Implement server-side or client-side aggregations to calculate budget/goal progress relative to real transactions.
4. **Testing**: Use the `testing-strategy` to ensure all new repositories and UI integrations are verified.

## Affected Areas

| Area                   | Impact   | Description                                              |
| ---------------------- | -------- | -------------------------------------------------------- |
| `types/domain.ts`      | Modified | Add `Budget` and `Goal` types.                           |
| `lib/repositories/`    | New      | `SupabaseBudgetRepository` and `SupabaseGoalRepository`. |
| `app/budgets/page.tsx` | Modified | Replace local state with repository calls.               |
| `app/goals/page.tsx`   | Modified | Replace `mockGoals`/`mockAccounts` with repository data. |
| `tests/integration/`   | New      | Integration tests for planning-transaction synergy.      |

## Risks

| Risk                                                    | Likelihood | Mitigation                                                      |
| ------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| Data inconsistency between budgets and transactions     | Medium     | Use robust SQL queries or shared logic for balance aggregation. |
| Performance overhead on dashboard with multiple budgets | Low        | Optimize queries for progress calculation.                      |

## Rollback Plan

1. Revert `app/budgets/page.tsx` and `app/goals/page.tsx` to their previous state (local state/mocks).
2. Delete the `budgets` and `goals` tables in Supabase if necessary.

## Dependencies

- Supabase project access.
- Existing `AccountRepository` and `TransactionRepository`.

## Success Criteria

- [ ] Budgets created in the UI are saved to Supabase and persist on refresh.
- [ ] Goals display progress based on real account balances or linked transactions.
- [ ] Global test coverage for Budgets and Goals exceeds 80%.
