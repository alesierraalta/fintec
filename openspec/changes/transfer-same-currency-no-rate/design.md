# Design: Same-Currency Transfers Without Exchange Rates and Optional Commissions

## Technical Approach

Retain the existing transfer endpoint and cross-currency calculations, but centralize transfer policy and strict minor-unit validation. Equal currencies are identity movements. `commissionMinor` is optional, denominated in source currency, and is debited atomically by `create_transfer`. The existing `amount`/`amountMajor` transport is retained for cross-currency compatibility; it is converted exactly to source minor units before balance arithmetic.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|---|---|---|
| Create `lib/transfers/transfer-policy.ts` with `isSameCurrencyTransfer`, effective-rate, target-minor, and total-debit helpers; make `isExchangeableTransferPair` exclude equal currencies. | Guards duplicated in desktop/mobile or embedded in JSX. | One pure domain seam is testable and prevents policy drift; existing exchange math remains reusable. |
| Use `commissionMinor` in application contracts and map it only to DB `fee_minor`; add only `p_commission_minor` to the RPC. | A second fee column or `p_fee_minor` overload. | One source of truth avoids ambiguous reads and the existing PostgREST overload problem. |

## Data Flow

```text
Desktop/Mobile policy + exact UI conversion
 -> POST /api/transfers { amount, commissionMinor }
 -> validation -> TransfersRepository.create
 -> create_transfer(p_commission_minor)
 -> locked accounts, total-debit check, two legs + transfers row atomically
 -> aggregate projection -> API/history (null fee = absent)
```

Both forms derive `ratesEnabled = Boolean(from && to && !isSameCurrencyTransfer(...))` and call `useBCVRates({ enabled: ratesEnabled })` and `useBinanceRates({ enabled: ratesEnabled })`. Equal currencies therefore start no provider fetch, skip rate validation/recalculation, clear obsolete source/rate state, force rate `1`, and derive `targetMinor = sourceMinor`; the target is display-only. Cross-currency keeps current rate validation, rounding, and conversion functions.

## Interfaces / Contracts

- `types/domain.ts`: `CreateTransferDTO`, `Transfer`, and the transfer read/result types use `commissionMinor?: number` in source-currency minor units. `fee_minor` is a persistence name, not a second domain field.
- `lib/validations/transfers.ts`: shared exact major-to-minor parser and safe `totalDebitMinor` helper. Blank becomes `undefined`; zero remains `0`. Reject negative, non-finite, fractional/over-precision, unsafe, and overflowing values.
- `app/api/transfers/route.ts`: validate positive amount and integer-safe `commissionMinor`; pass `commissionMinor ?? undefined`. Do not reject an obsolete same-currency rate; backend policy normalizes it.
- `repositories/contracts/transfers-repository.ts`: add `commissionMinor` to `CreateTransferInput`; return `commissionMinor` and `totalDebitMinor`.
- Supabase adapter: revalidate, send `p_commission_minor` (null when absent), batch-read the aggregate, and merge by transaction `transfer_id`. Add an aggregate projection in `transfer-projections.ts`; make `SupabaseTransfer.fee_minor` nullable and mappers null-safe.
- Local parity: when local transfer creation is exercised, update `LocalTransactionsRepository.createTransfer` and its `FinanceDB` record inside one Dexie transaction. The server transfers factory remains Supabase-only.

## File Changes

| File | Action | Description |
|---|---|---|
| `lib/transfers/transfer-policy.ts` | Create | Shared identity, rate, target, and total-debit policy. |
| `exchange-calculations.ts`, `desktop-transfer.tsx`, `mobile-transfer.tsx` | Modify | Consume policy; disable hooks; add visible `Comisión (opcional)`, exact UI→minor conversion, identity preview, and total-debit summary/validation. |
| `lib/validations/transfers.ts`, `types/domain.ts`, repository contracts | Create/modify | Strict monetary contracts. |
| API, Supabase adapter/types/mappers/projections, `transfer-history.tsx` | Modify | Propagation and nullable read projection. |
| `supabase/migrations/<new-transfer-commission>.sql`, `supabase/schemas/baseline.sql` | Create/modify | Canonical RPC/schema snapshot, grants, and comments. |

## Testing Strategy

Unit tests cover identity/cross-currency policy, exact parsing, blank/zero, precision, safe-integer, and total-debit overflow. Desktop/mobile tests assert disabled hooks and zero provider calls for equal currencies, hidden rate controls, visible commission UX, minor propagation, and source total preview. Route/repository tests assert validation, RPC arguments, aggregate mapping, and historical null. Postgres integration tests assert source debit `amount + commission`, destination credit `amount`, shared IDs, and rollback. Authenticated E2E remains local/disposable-Supabase coverage for desktop/mobile submit.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary.

## Migration / Rollout

Add `fee_minor BIGINT NULL` idempotently with a non-negative check/comment. Drop known old `create_transfer` signatures, create the canonical signature with `p_commission_minor BIGINT DEFAULT NULL`, normalize equal currencies to rate `1`/identity target, and insert `transfers(id = v_transfer_id, ...)` after both legs. The RPC locks/checks `amount + commission`, subtracts total, credits only amount, and refreshes PostgREST. Update baseline function/grants. Never backfill historical fees; null remains absent.

## Open Questions

None; the spec resolves accounting, currency, persistence, validation, and UX policy.
