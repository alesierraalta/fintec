# Goal Specification

## Purpose

The Goals domain provides tools for users to set long-term financial objectives (like savings, large purchases, or retirement) and track their progress over time.

## Requirements

### Requirement: Goal Definition

The system MUST allow users to define a goal with a name, target amount (in centavos), a due date (estimated), and an associated account or category.

#### Scenario: Create a new savings goal

- GIVEN a user is on the goals page
- WHEN they enter "New Car" as the name, 2000000 centavos ($20,000) as the target, and a date 12 months from now
- THEN the system SHALL persist the goal in Supabase
- AND the goal SHALL appear in the list with a "Not Started" status (0% progress)

### Requirement: Progress Tracking

The system MUST calculate progress toward a goal based on actual account balances or linked transactions.

#### Scenario: Track goal progress

- GIVEN a "New Car" goal with a target of 2000000 centavos
- AND the linked "Savings" account balance is 500000 centavos
- WHEN the user views the goal details
- THEN the system SHALL display 500000 centavos saved (25% progress toward the goal)
- AND the monthly target SHALL be calculated based on the remaining 1500000 centavos and months left

### Requirement: Goal Completion

The system SHOULD notify the user when a goal is 100% complete.

#### Scenario: Goal completed

- GIVEN a goal with a target of 1000000 centavos
- AND the actual progress reaches 1000000 centavos
- WHEN the user views the goal
- THEN the system SHALL mark the goal as "Reached"
- AND the UI SHALL show a celebratory or completion state
