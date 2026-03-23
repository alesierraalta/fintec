# Budget Specification

## Purpose

The Budgets domain allows users to set spending limits for specific categories or time periods and track their progress against actual transactions.

## Requirements

### Requirement: Budget Definition

The system MUST allow defining a budget with a name, a target amount (in centavos), a category, and a period (e.g., monthly).

#### Scenario: Define a new monthly budget

- GIVEN a user is on the budgets page
- WHEN they enter "Food" as the name, 50000 centavos ($500) as the amount, and "Food" as the category
- THEN the system SHALL save the budget in Supabase
- AND the budget SHALL be displayed in the budget list

### Requirement: Progress Tracking

The system MUST calculate the current spending for each budget by aggregating actual transactions that match the budget's category and period.

#### Scenario: View budget progress

- GIVEN a budget for "Food" with a limit of 50000 centavos
- AND there are transactions in the "Food" category totaling 20000 centavos for the current period
- WHEN the user views their budgets
- THEN the system SHALL display 20000 centavos as spent (40% progress)
- AND the remaining balance SHALL show 30000 centavos

### Requirement: Over-budget Alert

The system SHOULD visually indicate when a budget's spending exceeds its target amount.

#### Scenario: Budget exceeded

- GIVEN a budget with a limit of 10000 centavos
- AND transactions totaling 12000 centavos
- WHEN the user views the budget
- THEN the system SHALL display a warning or alert (e.g., progress bar in red)
- AND the progress SHALL be 120%
