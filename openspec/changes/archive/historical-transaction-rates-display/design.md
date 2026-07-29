# Design: Historical Transaction Rates Display

## Technical Approach

Modify `TransactionDetailPanel` (`components/transactions/transaction-detail-panel.tsx`) to query historical exchange rates for the exact transaction date (`transaction.date.split('T')[0]`) using `bcvHistoryService` and `binanceHistoryService`. If no records are found for that date, do NOT fall back to `getLatestRate()`. Instead, set rate values to `null` and render a clear indication to the user that historical rate data is not recorded for that date. Also update the section title dynamically to `"Tasas al " + formattedDate` (e.g. `Tasas al 22/06/2026`).

## Architecture Decisions

### Decision 1: Explicit Date Rate Lookup without Silent Fallback

**Choice**: Query `bcvHistoryService.getRatesForDate(txDate)` and `binanceHistoryService.getRatesForDate(txDate)`. Remove the `if (!bcvRecord) { bcvRecord = await bcvHistoryService.getLatestRate(); }` fallback logic.
**Alternatives considered**: Keep silent fallback to latest rates.
**Rationale**: Silent fallback causes confusion when viewing past transactions, giving users the impression that today's rate was effective on the transaction date. Showing an explicit "rate unavailable for date" state is truthful and audit-compliant.

### Decision 2: Clear Date Labeling in Header

**Choice**: Display `Tasas al DD/MM/YYYY` in both desktop and mobile layouts.
**Alternatives considered**: Keeping static text "Tasas del día".
**Rationale**: "Tasas del día" is ambiguous and implies today's rate. "Tasas al 22/06/2026" explicitly connects the rates shown to the specific transaction date.

## Data Flow

```
Transaction ──→ Extract Date (YYYY-MM-DD) ──→ bcvHistoryService.getRatesForDate(date)
                                           ──→ binanceHistoryService.getRatesForDate(date)
                                                       │
                                  ┌────────────────────┴────────────────────┐
                                  ▼                                         ▼
                         Record Found                             Record Not Found
                                  │                                         │
                         Render "Tasas al DD/MM/YYYY"               Render "Tasas al DD/MM/YYYY"
                         + Equivalent Amounts                       + "No hay tasas registradas"
```

## File Changes

| File | Action | Description |
| ---- | ------ | ----------- |
| `components/transactions/transaction-detail-panel.tsx` | Modify | Remove `getLatestRate` fallback, update header date formatting, update empty state message |
| `tests/components/transactions/transaction-detail-panel.test.tsx` | Create/Modify | Add tests for transaction date rate display and missing historical rate message |

## Interfaces / Contracts

No change to global interfaces. `vesRates` state structure in `TransactionDetailPanel`:
```ts
const [vesRates, setVesRates] = useState<{
  dateStr: string; // Formatted date string (e.g. "22/06/2026")
  bcvUsd: number | null;
  bcvEur: number | null;
  binanceUsd: number | null;
  equivalentUsdBcv: string | null;
  equivalentEurBcv: string | null;
  equivalentUsdBinance: string | null;
  hasHistoricalData: boolean;
} | null>(null);
```

## Testing Strategy

- Unit test `TransactionDetailPanel` using React Testing Library & Jest:
  - Render with transaction on date `2026-06-22` with historical rate mock returning rates -> assert header "Tasas al 22/06/2026" and amounts.
  - Render with transaction on date `2026-06-22` with historical rate mock returning null -> assert header "Tasas al 22/06/2026" and message "No hay tasas registradas para esta fecha".
