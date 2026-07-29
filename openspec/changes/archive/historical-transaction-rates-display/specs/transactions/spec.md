# Delta for Transactions

## MODIFIED Requirements

### Requirement: Historical Exchange Rates Display in Transaction Detail

The `TransactionDetailPanel` component MUST display exchange rates corresponding strictly to the transaction date (`transaction.date`). The UI header MUST explicitly state the date for which rates are evaluated (e.g., `Tasas al DD/MM/YYYY`). The component MUST NOT silently substitute current (today's) rates when historical rate data for the transaction date is missing.

(Previously: The component header displayed a generic title "Tasas del día" and automatically fell back to calling `bcvHistoryService.getLatestRate()` and `binanceHistoryService.getLatestRate()` whenever historical rates for `transaction.date` were null.)

#### Scenario: Rates available for transaction date

- GIVEN a transaction with currency `VES` and date `2026-06-22`
- AND historical BCV / Binance exchange rates exist for `2026-06-22`
- WHEN the user opens the transaction detail panel
- THEN the rates section header SHALL display `Tasas al 22/06/2026`
- AND the rates displayed SHALL correspond to the rates recorded for `2026-06-22`
- AND equivalent monetary amounts in USD and EUR SHALL be calculated using `2026-06-22` rates

#### Scenario: Rates unavailable for transaction date

- GIVEN a transaction with currency `VES` and date `2026-06-22`
- AND no historical exchange rates exist in storage for `2026-06-22`
- WHEN the user opens the transaction detail panel
- THEN the system MUST NOT display today's current exchange rate
- AND the rates section SHALL display a message indicating `No hay tasas registradas para el 22/06/2026`
