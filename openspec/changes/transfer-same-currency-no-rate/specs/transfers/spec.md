# Transfers Specification

## Purpose

Define same-currency identity transfers and optional commissions across UI, API, persistence, and reads.

## Contracts and Invariants

- `amountMinor` and optional `commissionMinor` MUST be integer minor-unit values; commission uses source currency. Blank means absent; zero is valid.
- `totalDebitMinor = amountMinor + (commissionMinor ?? 0)` MUST be safe, and source-balance validation MUST use it.
- `transfers.fee_minor` stores the transfer-level commission in source-currency minor units. Its id MUST equal both legs’ `transactions.transfer_id`.

## Requirements

### Requirement: Same-currency transfers are identity movements

The shared policy MUST classify equal currencies with `isSameCurrencyTransfer`, force effective rate `1`, and preserve the source amount as the destination amount in minor units. Obsolete client rates MUST be ignored.

#### Scenario: Equal currencies

- GIVEN USD source and destination accounts and source amount 1250 minor units
- WHEN the transfer is previewed or submitted
- THEN effective rate is 1 and destination amount is 1250 minor units

#### Scenario: Provider bypass

- GIVEN equal currencies are selected
- WHEN the form recalculates
- THEN BCV/Binance fetching, rate validation, and exchange recalculation do not run

### Requirement: Cross-currency transfers retain existing conversion

Different currencies MUST retain existing rate calculation, validation, rounding, and destination conversion; commission MUST NOT require a separate conversion rate.

#### Scenario: Different currencies

- GIVEN different currencies and a valid exchange rate
- WHEN the source amount changes
- THEN the destination follows existing cross-currency behavior

### Requirement: Commission changes the source debit

The API, repository, and domain contracts MUST carry an optional commission. A successful transfer MUST debit `amountMinor + commissionMinor` from the source and credit only `amountMinor` to the destination.

#### Scenario: Commission debit

- GIVEN amountMinor 10,000, commissionMinor 250, and balance 10,250
- WHEN creation succeeds
- THEN source debit is 10,250 and destination credit is 10,000

#### Scenario: Insufficient total

- GIVEN the same amounts and balance 10,100
- WHEN creation is attempted
- THEN it is rejected with no balance or transfer-record change

### Requirement: Monetary validation is strict at every boundary

UI, API, repository, and database contracts MUST reject negative, non-finite, over-precision, fractional-minor, overflowed, or unsafe values. Invalid input MUST not partially write.

#### Scenario: Optional values

- GIVEN blank or exact-minor commission, including zero
- WHEN normalized
- THEN blank is absent, zero remains zero, and both are accepted

#### Scenario: Invalid value

- GIVEN an invalid commission value
- WHEN it reaches any boundary
- THEN a validation failure is returned

### Requirement: Persistence and projections are atomic and compatible

Creation MUST atomically commit both transaction legs, balances, and one `transfers` row with nullable `fee_minor`. Reads MUST expose the commission in minor units; historical null fees MUST read as absent.

#### Scenario: Atomic success or rollback

- GIVEN a valid request with commission
- WHEN the RPC succeeds, or any component fails
- THEN all components commit together, or none remain

### Requirement: UX makes the policy explicit

After both accounts are selected, desktop and mobile MUST show a visible `Comisión (opcional)` section with source-currency suffix and helper text explaining the additional debit. The summary MUST show commission and total source debit; same-currency forms MUST hide rate controls.

#### Scenario: Visible optional commission

- GIVEN VES source and destination accounts are selected
- WHEN the form is displayed
- THEN the section shows VES, accepts blank/zero, and explains the additional debit

## Acceptance Criteria

- [ ] Tests prove rate `1`, identity minor units, and zero BCV/Binance requests for equal currencies.
- [ ] Tests cover commission absence, zero, precision, safe-integer, negative, and total-debit balance rules.
- [ ] RPC tests prove atomicity, nullable `fee_minor`, and `transfer_id` linkage.
- [ ] Read, desktop, and mobile tests prove commission projection, visible UX, summary, and hidden rate controls.
- [ ] Different-currency regression tests remain green.
