# Proposal: Historical Transaction Rates Display

## Intent

Fix exchange rate display in transaction detail view so that it clearly reflects rates for the transaction date rather than generic/today's exchange rates. Currently, `TransactionDetailPanel` shows a generic title "Tasas del día" and silently falls back to today's rates (`getLatestRate()`) when historical rate data for `transaction.date` is not locally found, misleading users about the conversion value on the specific date of the transaction (e.g. 2026-06-22).

## Scope

### In Scope

- Update `TransactionDetailPanel` (desktop and mobile layouts) to display explicit header "Tasas al {fecha}" (e.g. `Tasas al 22/06/2026`).
- Ensure rate queries target historical rates for `transaction.date`.
- Handle cases where historical rate data is missing for that specific date gracefully, showing an informative status indicator ("Sin tasa registrada para esta fecha") instead of silently substituting today's rates.
- Maintain existing rate calculation logic (BCV USD, BCV EUR, Binance USDT equivalents) based on the exact historical rate of the transaction date.
- Add unit/component tests for `TransactionDetailPanel` verifying correct header formatting, historical rate fetching, and fallback UI state when historical rate is missing.

### Out of Scope

- Modifying the underlying database schema for transactions (e.g., storing rate snapshots per transaction row).
- Modifying scraper services or external rate providers.

## Approach

1. Extract and format transaction date cleanly for header display (e.g., `Tasas al DD/MM/YYYY`).
2. Update state and effect in `TransactionDetailPanel` to fetch historical rates for `txDate` via `bcvHistoryService` and `binanceHistoryService`.
3. If no historical record exists for `txDate`, do NOT call `getLatestRate()`. Mark the state as missing for that date and render a clear indicator ("No hay tasa disponible para el DD/MM/YYYY").
4. Update desktop and mobile view layouts in `transaction-detail-panel.tsx` to keep UI consistent and clean.
5. Add unit tests for `TransactionDetailPanel` covering date formatting and missing historical rate handling.

## Affected Areas

| Area | Impact | Description |
| ---- | ------ | ----------- |
| `components/transactions/transaction-detail-panel.tsx` | Modified | Update date header, historical rate fetch effect, and empty rate state |
| `tests/components/transactions/transaction-detail-panel.test.tsx` | New/Modified | Test component rendering with transaction date rates and missing date rates |

## Risks

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Date parsing mismatch between ISO date string and YYYY-MM-DD key | Low | Use standard date splitting or `formatCaracasDayKey` helper |
| User confusing fallback rates with transaction date rates | Low | Eliminate silent fallback to latest rates; explicitly show date and state |

## Rollback Plan

Revert changes to `components/transactions/transaction-detail-panel.tsx` and unit tests via git checkout.

## Dependencies

- Existing `bcvHistoryService` and `binanceHistoryService`.

## Success Criteria

- [ ] Header displays "Tasas al DD/MM/YYYY" matching `transaction.date`.
- [ ] Historical rates for `transaction.date` are displayed when present in history.
- [ ] If rates for `transaction.date` are unavailable, UI displays "No hay tasas disponibles para el DD/MM/YYYY" instead of showing today's rate.
- [ ] Unit tests pass clean.
