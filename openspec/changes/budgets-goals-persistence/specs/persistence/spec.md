# Persistence Specification (Budgets and Goals)

## Purpose

The Persistence domain defines the Supabase-backed repositories for budgets and goals, ensuring data is stored accurately and in alignment with the `money-handling` skill (centavo-based integers).

## Requirements

### Requirement: Supabase Budget Storage

The system MUST provide a `SupabaseBudgetRepository` that saves and retrieves budgets from the `budgets` table in Supabase.

#### Scenario: Save a budget in Supabase

- GIVEN a budget object with 50000 centavos ($500)
- WHEN the repository's `save()` method is called
- THEN the system SHALL insert a new record into the `budgets` table with the amount as a `BIGINT` (50000)

#### Scenario: Retrieve budgets by user

- GIVEN a user with id "user_123" with three budgets in Supabase
- WHEN the repository's `getAll()` method is called for that user
- THEN it SHALL return exactly those three budget objects

### Requirement: Supabase Goal Storage

The system MUST provide a `SupabaseGoalRepository` that saves and retrieves goals from the `goals` table in Supabase.

#### Scenario: Save a savings goal in Supabase

- GIVEN a goal object with a target of 1000000 centavos ($10,000)
- WHEN the repository's `save()` method is called
- THEN it SHALL insert a record into the `goals` table with the target as a `BIGINT` (1000000)

### Requirement: Progress Calculation (SQL/Repository Level)

The system MUST allow retrieving budget and goal progress by aggregating associated transaction and account balance records.

#### Scenario: Calculate budget spent total

- GIVEN a budget with the "Food" category for the current month
- AND transactions totaling 20000 centavos for that category and month
- WHEN the repository's `getSpentAmount()` method is called for that budget
- THEN it SHALL return exactly 20000 centavos as the result

#### Scenario: Calculate goal current progress

- GIVEN a goal linked to account "acc_456"
- AND account "acc_456" has a balance of 500000 centavos
- WHEN the repository's `getProgress()` method is called for that goal
- THEN it SHALL return exactly 500000 centavos as the current progress
