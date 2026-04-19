# Transactions Specification

## Purpose

Definir el comportamiento observable para clasificar deudas dentro de transacciones existentes, mantener intacta la semantica de cashflow basada en `INCOME`/`EXPENSE`, y exponer totales confiables de deudas (`debo` y `me deben`) sin regresiones sobre datos historicos.

## Requirements

### Requirement: Debt Classification Is Explicit in Transactions

The system MUST allow a transaction to be marked as debt with an explicit direction (`OWE` or `OWED_TO_ME`) that is stored as transaction metadata and used as the source of truth for debt classification.

#### Scenario: Registrar deuda con direccion explicita desde captura de entrada

- GIVEN a user creates a transaction from an `INCOME` capture flow
- WHEN the user marks the transaction as debt and selects direction `OWED_TO_ME`
- THEN the transaction is persisted as debt metadata with direction `OWED_TO_ME`
- AND debt summaries classify that amount under "me deben"

#### Scenario: Registrar deuda con direccion explicita desde captura de salida

- GIVEN a user creates a transaction from an `EXPENSE` capture flow
- WHEN the user marks the transaction as debt and selects direction `OWE`
- THEN the transaction is persisted as debt metadata with direction `OWE`
- AND debt summaries classify that amount under "debo"

#### Scenario: Transaccion marcada como deuda sin direccion

- GIVEN a user marks a transaction as debt
- WHEN no debt direction is provided
- THEN the system MUST reject the operation with a validation error

### Requirement: Cashflow Semantics Remain Type-Driven

The system SHALL preserve cashflow semantics where `INCOME` increases income totals and `EXPENSE` increases expense totals regardless of debt metadata.

#### Scenario: Deuda de entrada mantiene semantica de ingreso

- GIVEN an `INCOME` transaction marked as debt with any valid debt direction
- WHEN cashflow totals are calculated
- THEN that transaction contributes to income totals according to existing `INCOME` rules

#### Scenario: Deuda de salida mantiene semantica de gasto

- GIVEN an `EXPENSE` transaction marked as debt with any valid debt direction
- WHEN cashflow totals are calculated
- THEN that transaction contributes to expense totals according to existing `EXPENSE` rules

#### Scenario: Transferencias no alteran semantica por metadata de deuda

- GIVEN a transfer transaction (`TRANSFER_IN` or `TRANSFER_OUT`) without debt metadata
- WHEN cashflow totals are calculated
- THEN transfer handling remains unchanged from existing behavior

### Requirement: Debts Section Exposes Directional Totals

The system MUST provide a debts section with at least two directional totals: total amount the user owes (`OWE`) and total amount owed to the user (`OWED_TO_ME`).

#### Scenario: Mostrar totales de deudas abiertos por direccion

- GIVEN a user has multiple open debt transactions with both directions
- WHEN the debts section is rendered
- THEN the UI shows a "debo" total equal to sum of open `OWE` debt amounts
- AND the UI shows a "me deben" total equal to sum of open `OWED_TO_ME` debt amounts

#### Scenario: Sin deudas abiertas

- GIVEN a user has no open debt transactions
- WHEN the debts section is rendered
- THEN both directional totals are shown as zero values in the configured currency formatting

### Requirement: Debt Status Controls Inclusion in Displayed Debt Totals

The system MUST support debt status values `OPEN` and `SETTLED`, and only `OPEN` debt amounts SHALL be included in the primary directional totals displayed in the debts section.

#### Scenario: Deuda abierta incluida en totales principales

- GIVEN a debt transaction with status `OPEN` and direction `OWE`
- WHEN the debts section totals are calculated
- THEN its amount is included in the displayed "debo" total

#### Scenario: Deuda saldada excluida de totales principales

- GIVEN a debt transaction with status `SETTLED` and direction `OWED_TO_ME`
- WHEN the debts section totals are calculated
- THEN its amount is excluded from the displayed "me deben" total

#### Scenario: Cambio de estado actualiza totales mostrados

- GIVEN a debt transaction currently counted in open totals
- WHEN its status changes from `OPEN` to `SETTLED`
- THEN the next totals calculation no longer counts that amount in primary directional totals

### Requirement: Existing Transactions Without Debt Metadata Remain Backward Compatible

The system MUST treat transactions with absent or null debt metadata as non-debt transactions to prevent regressions in existing data.

#### Scenario: Transaccion historica sin metadata de deuda

- GIVEN an existing transaction created before debt metadata existed
- WHEN it is read by repositories and shown in transaction lists
- THEN it is treated as non-debt by default
- AND no debt badge, debt direction, or debt status is inferred implicitly

#### Scenario: Reportes existentes con datos historicos

- GIVEN a dataset containing only transactions without debt metadata
- WHEN reports and cashflow summaries are generated
- THEN results match pre-change behavior for totals and category breakdowns

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

### Requirement: Sanitize Supabase Error Messages

The repository MUST sanitize error messages from Supabase to prevent HTML leakage (e.g., Cloudflare 5xx errors). If the error message starts with `<html>` or contains common HTML tags, it MUST be replaced with a generic "Database Unavailable" message.

#### Scenario: Sanitize HTML error

- GIVEN Supabase returns a 521 error with HTML body
- WHEN `listBCVRatesSince` is called
- THEN the thrown Error message MUST NOT contain HTML
- AND the Error message SHOULD be "Database Unavailable (521)"

### Requirement: Automatic Stale Cache Fallback

If Supabase is unreachable (ENOTFOUND, ETIMEDOUT) or returns 5xx, the repository MUST attempt to return the last known good value from the shared cache, even if the cache entry is technically expired (if the cache implementation supports stale-if-error).

#### Scenario: Fallback to cache on ENOTFOUND

- GIVEN Supabase is down (DNS ENOTFOUND)
- AND the shared cache contains a previously stored value for `rates_history:bcv:since:2026-01-01`
- WHEN `listBCVRatesSince("2026-01-01")` is called
- THEN it MUST return the cached value instead of throwing an error

### Requirement: Exponential Backoff Retry Policy

For transient 5xx errors, the repository SHOULD implement a retry policy (e.g., 3 attempts with exponential backoff). This MUST NOT be applied to 4xx errors.

#### Scenario: Retry on 503

- GIVEN Supabase returns a 503 error
- WHEN `getLatestExchangeRateSnapshot` is called
- THEN it MUST retry up to 3 times before failing or falling back to cache

## Testability Guidance

The system SHOULD provide deterministic fixtures that combine debt and non-debt transactions across `INCOME` and `EXPENSE`, and tests SHOULD verify: directional debt totals, status-based inclusion/exclusion (`OPEN` vs `SETTLED`), and non-regression parity for legacy transactions without debt metadata.
