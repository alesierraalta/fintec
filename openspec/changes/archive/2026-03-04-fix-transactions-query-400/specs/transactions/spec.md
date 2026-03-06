# Delta for Transactions

## ADDED Requirements

### Requirement: Ownership Scoping for Transaction-Like Data Access Is Resilient

Transaction, transfer, and usage-count reads and deletes MUST enforce user ownership through resilient account ownership scoping that does not depend on fragile embedded join filter patterns that can produce request-shape 400 failures.

#### Scenario: Owned accounts return transaction-like data without query-shape failures

- GIVEN an authenticated user with one or more owned accounts and transaction-like records
- WHEN the user loads transactions, transfers, or usage counts
- THEN the system returns only records that belong to the user's owned accounts
- AND the request completes without query-shape 400 failures caused by embedded ownership join filters

#### Scenario: User with no owned accounts receives safe empty results

- GIVEN an authenticated user with no owned accounts
- WHEN the user loads transactions, transfers, or usage counts
- THEN the system returns an empty result (or zero usage count) for those paths
- AND no records from other users are returned

### Requirement: Repository Ownership Tests Validate Access Behavior

Automated tests for transaction-like ownership logic MUST validate observable access behavior and isolation outcomes, and MUST NOT rely on brittle assertions of exact internal query-shape strings.

#### Scenario: Behavior-focused isolation test passes across query refactors

- GIVEN tests that exercise owned and unowned account datasets
- WHEN repository ownership logic is refactored without changing expected behavior
- THEN tests continue to pass if ownership and isolation behavior is preserved

#### Scenario: Ownership regression is detected without query-string assertions

- GIVEN an implementation change that leaks data from unowned accounts
- WHEN behavior-focused repository tests run
- THEN tests fail due to incorrect returned results
- AND test failure does not depend on matching internal select/filter string literals
