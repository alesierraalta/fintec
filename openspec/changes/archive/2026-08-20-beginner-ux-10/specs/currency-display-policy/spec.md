# Currency Display Policy Specification

## Purpose

Define the user-facing contract separating transaction-time historical amounts from current-rate projections and preventing fabricated monetary values.

## Requirements

### Requirement: Distinguishable historical and live values

Every converted total MUST be classified as historical or live. Historical values SHALL use the transaction-time base amount; live values MUST identify source and freshness and MUST NOT imply equivalence.

#### Scenario: User compares totals across screens

- GIVEN the same transactions and period appear in historical and live views
- WHEN the user compares their converted totals
- THEN the historical value remains stable and the live value is labeled with source and freshness

### Requirement: Honest unavailable conversion state

The system MUST show unavailable, pending, or insufficient-data when an amount or rate is absent, and MUST NOT substitute `0,00` for missing data.

#### Scenario: Rate or base amount is unavailable

- GIVEN a conversion lacks its required amount or rate
- WHEN the value is rendered
- THEN the UI shows the honest state and does not present zero as the result
