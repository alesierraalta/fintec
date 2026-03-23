# Tasks: Full Integration and Repository Persistence for Budgets and Goals Systems

## Setup & Scaffolding

- [x] Implement `MapSupabaseGoalToDomain` and `MapDomainGoalToSupabase` in `repositories/supabase/mappers.ts`. [id: task-1]
- [x] Implement `MapSupabaseBudgetToDomain` and `MapDomainBudgetToSupabase` in `repositories/supabase/mappers.ts` if missing or incomplete. [id: task-2]
- [x] Update `AppRepository` interface in `repositories/contracts/index.ts` to include `budgets` and `goals`. [id: task-3]
- [x] Update `SupabaseAppRepository` in `repositories/supabase/index.ts` to instantiate `SupabaseBudgetsRepository` and `SupabaseGoalsRepository`. [id: task-4]
- [x] Update `createServerAppRepository` and `createClientAppRepository` in `repositories/factory.ts` to include the new repositories. [id: task-5]

## Budgets Persistence Implementation

- [x] Complete `findAll`, `findById`, `create`, `update`, `delete` in `SupabaseBudgetsRepository`. [id: task-6]
- [x] Implement `getBudgetsWithProgress(monthYYYYMM)` using Supabase aggregation logic. [id: task-7]
- [x] Implement `getBudgetWithProgress(budgetId)` with progress calculation. [id: task-8]
- [x] Implement `getMonthlyBudgetSummary(monthYYYYMM)` for stats cards. [id: task-9]
- [x] Implement `updateSpentAmount(budgetId)` if keeping redundant storage, or ensure it's calculated. [id: task-10]
- [x] Implement `getOverBudgetCategories(monthYYYYMM)`. [id: task-11]
- [x] Implement `copyBudgetsToNextMonth(fromMonth, toMonth)`. [id: task-12]

## Goals Persistence Implementation

- [x] Complete `findAll`, `findById`, `create`, `update`, `delete` in `SupabaseGoalsRepository`. [id: task-13]
- [x] Implement `getGoalsWithProgress()` fetching linked account balances or contributions. [id: task-14]
- [x] Implement `addContribution(goalId, amountMinor, description)` for manual contributions. [id: task-15]
- [x] Implement `getGoalsSummary()` for overall progress card. [id: task-16]
- [x] Implement `getGoalsNearingDeadline(days)` and `getOffTrackGoals()`. [id: task-17]

## UI Integration - Budgets

- [x] Refactor `app/budgets/page.tsx` to use `repository.budgets.getBudgetsWithProgress(selectedMonth)`. [id: task-18]
- [x] Update `handleSaveBudget` to use `repository.budgets.create` or `update`. [id: task-19]
- [x] Update `handleDeleteBudget` to use `repository.budgets.delete`. [id: task-20]
- [x] Ensure budget summary cards use `repository.budgets.getMonthlyBudgetSummary(selectedMonth)`. [id: task-21]

## UI Integration - Goals

- [x] Refactor `app/goals/page.tsx` to use `repository.goals.getGoalsWithProgress()`. [id: task-22]
- [x] Update `handleSaveGoal` to use `repository.goals.create` or `update`. [id: task-23]
- [x] Update `handleDeleteGoal` to use `repository.goals.delete`. [id: task-24]
- [x] Update `handleAddMoney` to use `repository.goals.addContribution`. [id: task-25]
- [x] Ensure overall progress card uses `repository.goals.getGoalsSummary()`. [id: task-26]

## Testing & Verification

- [x] Create `tests/unit/mappers/budgets-goals-mappers.test.ts` for data transformation. [id: task-27]
- [ ] Create `tests/integration/repos/supabase-budgets-repo.test.ts` for CRUD and progress. [id: task-28]
- [ ] Create `tests/integration/repos/supabase-goals-repo.test.ts` for CRUD and progress. [id: task-29]
- [ ] Perform manual verification of progress bars in dev server. [id: task-30]
- [ ] Run Playwright E2E tests for budget and goal flows. [id: task-31]
