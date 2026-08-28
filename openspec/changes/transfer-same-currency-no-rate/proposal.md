# Proposal: Same-Currency Transfers Without Exchange Rates and Optional Commissions

## Intent

Transfers between accounts with the same currency must behave as identity movements. Today `USD → USD` is classified as an exchangeable pair, so the form exposes rate controls, may fetch BCV/Binance data, and can recalculate the destination amount. This adds irrelevant decisions and can produce an incorrect transfer.

The change also adds an optional commission field to the transfer flow. The field must be propagated through the domain, validation, API, repository, RPC/migration, and transfer projections without becoming mandatory. The accounting meaning of that commission must be approved before implementation so the system does not silently alter balances or lose financial information.

## Scope

### In Scope

- Define and enforce a single same-currency transfer policy for desktop and mobile flows.
- Hide exchange-rate UX for same-currency transfers, use an effective rate of `1`, preserve the source amount as the destination amount, and avoid BCV/Binance requests and exchange recalculation.
- Add an optional commission value to the transfer contract end to end, using integer minor units for persistence and monetary validation.
- Extend the existing transfer persistence/projection path and atomic `create_transfer` RPC according to the approved commission policy.
- Add regression coverage for same-currency behavior, commission validation/propagation, and migration/RPC compatibility.

### Out of Scope

- New exchange-rate providers, rate schedules, or a general conversion-engine redesign.
- Automatic inference or backfill of commissions for historical transfers.
- Tax, percentage-based fee, or multi-component commission calculation.
- Redesign of unrelated transfer history or generic transaction flows.

## Approach

Use a pure shared transfer-policy seam rather than maintaining separate desktop/mobile rules. The policy will distinguish `isSameCurrencyTransfer` from pairs that genuinely require exchange rates; same-currency transfers will force rate `1`, derive the destination by identity in minor units, and bypass rate controls, validation, recalculation, and provider fetching. The API and RPC will remain defensive and normalize same-currency requests even if a client sends an obsolete rate.

Represent the optional commission as a typed monetary value, convert/validate it with the existing money/minor-unit conventions, and carry it through `CreateTransferInput`, the route, repository adapter, RPC result, and transfer reads. The recommended persistence direction is to activate the existing transfer aggregate rather than attach transfer-level metadata to only one transaction leg. The six decisions below are approval gates for the later spec/design phases.

## Decisions Required Before Implementation

### 1. Should the commission affect the source balance or remain metadata only?

**Option A — Metadata only (recommended)**

- **Pros:** Matches the literal request to record an optional commission; preserves current transfer balance semantics; avoids a hidden extra debit and a new ledger row; keeps this change small and reversible.
- **Cons:** The recorded fee will not change the account balance or ordinary transaction totals. It is correct only when the fee was already accounted for outside this transfer operation or is intentionally informational.

**Option B — Debit the commission from the source account**

- **Pros:** Models the actual cash cost and keeps the source balance financially accurate; supports a source-balance check for the complete debit.
- **Cons:** Changes existing balance behavior; requires atomic RPC semantics, an explicit ledger/reporting treatment, and a clear confirmation summary for transfer amount versus total source debit.

**Recommendation:** Choose metadata-only for this first slice because no balance side effect was requested. If the product means “charge this fee now,” approve Option B instead before the spec phase; the implementation must then debit and validate the total atomically, never in a client-only step.

### 2. Which currency should represent the commission?

**Option A — Always the source-account currency (recommended)**

- **Pros:** Matches where a transfer fee is normally charged; is unambiguous for same-currency transfers; avoids introducing another conversion or rate dependency; aligns with a possible source debit.
- **Cons:** Cannot directly represent a fee quoted only in the destination or base currency without a separate conversion decision.

**Option B — Let the user choose among source, destination, or base currency**

- **Pros:** Represents more external fee scenarios.
- **Cons:** Adds another control and validation path; requires conversion provenance and potentially a rate for the fee itself; makes same-currency simplicity less reliable and increases reporting ambiguity.

**Recommendation:** Use the source currency. Persist the currency explicitly if the aggregate schema does not otherwise guarantee it, and do not fetch a rate solely to convert a commission.

### 3. Where should same-currency rate logic and destination behavior live?

**Option A — One pure shared transfer policy utility (recommended)**

- **Pros:** Gives desktop and mobile identical invariants; makes the no-rate rule unit-testable; provides one place to enable/disable rate hooks and to separate identity transfers from exchangeable pairs.
- **Cons:** Requires updating both existing consumers and the shared calculation tests.

**Option B — Duplicate guards in `desktop-transfer.tsx` and `mobile-transfer.tsx`**

- **Pros:** Small local edits and no shared API change.
- **Cons:** The two large forms can drift again; provider calls, validation, and destination behavior may differ; the bug remains easy to reintroduce.

**Recommendation:** Add/use a pure `isSameCurrencyTransfer` policy beside the existing exchange calculations, make `isExchangeableTransferPair` mean “requires exchange handling,” and consume it from both forms. For same currency, the destination amount is the source amount in minor units and is display-only/derived; it must not be independently converted or recalculated through the exchange-rate functions. Rate hooks should use their existing `enabled` option so no BCV/Binance fetch starts for a selected same-currency pair.

### 4. What validation rules should apply to the optional commission?

**Option A — Minimal validation: optional finite non-negative number**

- **Pros:** Low friction and supports ordinary decimal input.
- **Cons:** Allows precision that the currency cannot store, creates rounding ambiguity, and leaves overflow/unsafe-integer cases to the database.

**Option B — Monetary validation at every boundary (recommended)**

- **Pros:** Requires blank/null to mean “no commission,” rejects negative/non-finite values, enforces the source currency’s minor-unit precision, keeps persisted values integer and storage-safe, and gives consistent client/API/RPC behavior.
- **Cons:** Rejects values that cannot be represented in the account currency; requires an explicit conversion error instead of silently rounding.

**Recommendation:** Use Option B, allow an explicit zero but persist absence as null/omitted, and avoid inventing an arbitrary business maximum until product supplies one. Enforce the safe `BIGINT`/JavaScript integer range. If balance impact is approved in Question 1, the source check must be `transfer amount + commission`; with metadata-only semantics, commission must not change the balance check.

### 5. Where should the commission be persisted?

**Option A — Add a commission column to the `TRANSFER_OUT` transaction**

- **Pros:** Minimal change to the current Supabase transfer listing, which already reads transaction projections; no need to make the currently underused aggregate table part of creation.
- **Cons:** A transfer-level value is attached to only one leg; pair integrity and future transfer metadata become harder to enforce; transaction consumers may miss the field; it conflicts with the existing `Transfer.feeMinor`/`transfers.fee_minor` scaffolding.

**Option B — Use the existing `transfers` aggregate as the canonical owner (recommended)**

- **Pros:** Matches the existing domain/table model and the local repository’s paired-transfer structure; keeps commission at transfer scope; gives one place for future transfer metadata; avoids pretending the fee is a property of only the outbound ledger leg.
- **Cons:** The Supabase RPC currently writes only paired transactions, so it must insert the aggregate atomically; `listByUserId`, projections, mappers, RLS-aware reads, and local schema parity must be updated; existing rows need a null-safe compatibility path.

**Recommendation:** Choose Option B and make the aggregate id equal the transactions’ `transfer_id`, inserting it in the same atomic operation. Reuse the existing `fee_minor` storage concept with a documented source-currency meaning (or map a consistently named commission field to it); do not create a second competing fee/commission source. The current Supabase RPC’s omission of the aggregate must be treated as a compatibility concern, not hidden by another transaction column.

### 6. How should the commission appear in the transfer UX?

**Option A — Dedicated optional section, visible after both accounts are selected (recommended)**

- **Pros:** Discoverable without making the field mandatory; keeps commission separate from amount and exchange concepts; works consistently in desktop and mobile layouts; supports a clear source-currency suffix and summary line.
- **Cons:** Adds vertical space to the form even when most transfers have no fee.

**Option B — Collapsed “Add commission” control**

- **Pros:** Keeps the default form compact.
- **Cons:** Hides a financially relevant field and adds an extra interaction; less discoverable and harder to test/accessibly explain.

**Option C — Inline with the transfer amount**

- **Pros:** Fewer sections on desktop.
- **Cons:** Crowds the primary amount input and is less suitable for the mobile form; blurs the distinction between transferred amount and commission.

**Recommendation:** Render a dedicated `Comisión (opcional)` section once source and destination exist, blank by default, with the source currency shown beside the input and helper text explaining the approved accounting effect. Keep it editable as a normal monetary input, use the existing FinTec responsive/touch-target conventions, and show the commission explicitly in the confirmation summary. If Question 1 selects a debit, also show the resulting total source debit; if metadata-only is retained, say that the commission is recorded without changing balances.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `components/transfers/desktop-transfer.tsx` | Modified | Consume the shared same-currency policy, suppress rate UX/provider loading, and add the optional commission section and submission field. |
| `components/transfers/mobile-transfer.tsx` | Modified | Mirror the shared policy and commission UX without duplicating business rules. |
| `hooks/use-bcv-rates.ts`, `hooks/use-binance-rates.ts` | Reused/possibly modified | Use the existing `enabled` seam so rate fetching is disabled for same-currency transfers. |
| `lib/transfers/exchange-calculations.ts` | Modified | Centralize same-currency detection and identity amount behavior; preserve cross-currency rounding. |
| `types/domain.ts`, `repositories/contracts/transfers-repository.ts` | Modified | Propagate the optional commission through domain and repository contracts using minor units. |
| `lib/validations/schemas.ts`, `app/api/transfers/route.ts` | Modified | Validate optional commission at the API boundary and pass it through unchanged after normalization. |
| `repositories/supabase/transfers-repository-impl.ts`, `repositories/supabase/mappers.ts`, `repositories/supabase/types.ts` | Modified | Map the commission and aggregate result across the Supabase adapter. |
| `repositories/supabase/transfer-projections.ts` | Modified | Include the approved transfer-level commission data in list/read projections. |
| `repositories/local/transactions-repository-impl.ts`, `repositories/local/db.ts` | Modified if local parity is required | Preserve the same optional commission and transfer aggregate behavior in the local backend. |
| `supabase/migrations/<new-transfer-commission>.sql`, `supabase/schemas/baseline.sql` | Modified | Add the approved schema/RPC contract without editing historical migrations; refresh PostgREST after deployment. |
| `tests/lib/transfer-exchange-calculations.test.ts`, `tests/components/*transfer-exchange-sync.test.tsx` | Modified | Cover same-currency identity behavior and the absence of rate recalculation/provider-dependent UI. |
| `tests/node/api/transfers-route.test.ts`, `tests/node/api/transfers-envelope.test.ts`, `tests/node/repositories/*transfer*.test.ts` | Modified | Cover optional commission validation, propagation, projections, and error compatibility. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Commission semantics cause an unintended balance side effect | High | Require Question 1 approval; encode the chosen invariant in the spec and RPC tests before implementation. |
| Same-currency handling still triggers a provider request through a duplicated path | Medium | Shared pure policy, hook `enabled: false`, and tests that assert no rate fetch for equal currencies. |
| Legacy `transfers` table and Supabase transaction pairs diverge | Medium | Use one aggregate id equal to `transfer_id`, write atomically, and keep null-safe reads for historical rows. |
| Decimal input is rounded differently in UI, API, and SQL | Medium | Convert once to integer minor units using existing money utilities, then revalidate at API/RPC boundaries. |
| RPC signature/schema cache becomes overloaded or stale | Medium | Add one canonical migration, remove no historical definitions casually, notify PostgREST, and retain migration/RPC availability tests. |

## Rollback Plan

Revert the application, contract, and projection changes while leaving previously stored null/commission metadata readable. Restore the prior canonical `create_transfer` RPC behavior through a forward migration if the new RPC has already been deployed; do not delete user transfer rows as part of rollback. If the aggregate schema was extended, leaving a nullable unused column is safer than destructive removal, and a later migration can clean it up after data ownership is confirmed.

## Dependencies

- Approval of the six decisions above, especially commission balance semantics and aggregate persistence.
- Existing `Money`/minor-unit utilities and the `enabled` options already exposed by the BCV/Binance hooks.
- A Supabase migration applied to the target environment plus PostgREST schema reload.
- Existing paired-transfer invariants: one `transfer_id`, atomic source/destination balance updates, and same-account rejection.

## Success Criteria

- [ ] Equal-currency transfers show no exchange-rate controls, do not request BCV/Binance rates, accept/normalize an effective rate of `1`, and preserve the source amount as the destination amount.
- [ ] Different-currency transfer behavior remains unchanged except for the newly approved commission contract.
- [ ] A blank commission remains valid and optional; a valid commission is represented as integer minor units and is visible through the approved transfer read/projection path.
- [ ] The approved commission policy is enforced atomically by the backend and is reflected accurately in balance and confirmation behavior, including the source-balance rule if applicable.
- [ ] Client, API, repository, RPC, schema/baseline, mapper, projection, and regression tests agree on the same contract.
- [ ] No historical commission values are invented, and rollback does not destroy transfer data.

## Next Step

This proposal is ready for human approval. After the six decisions are confirmed, continue to the SDD spec/design phases; this phase intentionally creates no `spec.md`, `design.md`, or `tasks.md`.
