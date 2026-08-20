# Delta for Reports

## ADDED Requirements

### Requirement: Historical totals use transaction-time amounts

Historical reports MUST calculate totals from transaction-time `amountBaseMinor`. The same data and period SHALL produce the same total regardless of the current rate.

#### Scenario: Current rate changes after transactions

- GIVEN transactions have stored `amountBaseMinor` values and the current rate changes
- WHEN the same report period is opened again
- THEN the total uses stored transaction-time amounts and does not change

### Requirement: Live projections disclose provenance and freshness

Live projections MUST be distinguished from historical totals and MUST show rate source and freshness. They MUST NOT be presented as historical totals.

#### Scenario: Dashboard or report shows a live projection

- GIVEN a projection uses a current exchange rate
- WHEN it is displayed beside or instead of a historical value
- THEN its live nature, source, and freshness are visible and the label does not imply historical accuracy

### Requirement: Missing data is represented honestly

Reports MUST show unavailable, pending, or insufficient-data when an amount or rate is missing. They MUST NOT render missing data as `0,00`.

#### Scenario: Required conversion data is absent

- GIVEN a report cannot obtain the amount or rate required for a total
- WHEN the report renders
- THEN it shows an honest missing-data state, not zero
