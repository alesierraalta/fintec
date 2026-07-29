# Tasks: Historical Transaction Rates Display

## Phase 1: Core Component Logic & Layout Update

- [x] 1.1 Update `TransactionDetailPanel` effect to query rates for `txDate` without silent `getLatestRate()` fallback.
- [x] 1.2 Update section header label to "Tasas al {fecha}" (e.g. `Tasas al 22/06/2026`) in desktop and mobile views of `components/transactions/transaction-detail-panel.tsx`.
- [x] 1.3 Update fallback UI message when historical rates are unavailable for `txDate` ("No hay tasas registradas para el {fecha}").

## Phase 2: Testing & Verification

- [x] 2.1 Add/Update tests in `tests/components/transactions/transaction-detail-panel.test.tsx` verifying exact date rate display and missing rate message.
- [x] 2.2 Run Jest tests for `TransactionDetailPanel` and related transaction services to confirm clean passing test suite.

## Phase 3: Archive & Sync

- [x] 3.1 Run `sdd-archive` to sync spec updates.
