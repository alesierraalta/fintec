# Delta for UI

## ADDED Requirements

### Requirement: Budget List (Supabase)

The UI MUST display a list of all budgets fetched from the `SupabaseBudgetRepository`.

#### Scenario: Display budgets from Supabase

- GIVEN a user with two budgets ("Food", "Rent") in Supabase
- WHEN the user navigates to the budgets page
- THEN the system SHALL fetch the budgets from the repository
- AND the list SHALL show both "Food" and "Rent" with their respective limits and progress

### Requirement: Goal Card (Supabase)

The UI MUST display individual goal performance cards based on data from the `SupabaseGoalRepository`.

#### Scenario: Display goal cards

- GIVEN a user with a "New Car" goal in Supabase
- WHEN the user navigates to the goals page
- THEN the system SHALL fetch the goals and account balances from Supabase
- AND the goal card SHALL display the progress as calculated from the actual balances

### Requirement: Real-time Budget Progress (Centavo Alignment)

The UI MUST display all monetary values in budgets and goals as formatted currency strings based on integer centavos, following the `money-handling` skill.

#### Scenario: Format budget and goal progress

- GIVEN a budget with a limit of 10000 centavos ($100.00)
- AND spent 2550 centavos ($25.50)
- WHEN the budget is displayed in the list
- THEN the system SHALL show "$100.00" as the limit and "$25.50" as the spent amount

## MODIFIED Requirements

### Requirement: Budget Page (from Mock to Real)

The budget page MUST replace its current local-only saving mechanism with a call to the `SupabaseBudgetRepository.save()` method.
(Previously: Saves budgets in a local React state variable `budgets`, which is lost on refresh.)

#### Scenario: Persist a new budget

- GIVEN the user is on the budgets page
- WHEN they fill the form and click "Save Budget"
- THEN the system SHALL call the repository's save method
- AND the budget SHALL persist in Supabase after a page refresh

### Requirement: Goals Page (from Mock to Real)

The goals page MUST replace the `mockGoals` data with a call to the `SupabaseGoalRepository.getAll()` method.
(Previously: Loaded static data from `mockGoals` in `app/goals/page.tsx`.)

#### Scenario: Load real goals

- GIVEN the goals page is initialized
- WHEN the page loads
- THEN it SHALL fetch all goals from Supabase
- AND the display SHALL reflect the live database state
