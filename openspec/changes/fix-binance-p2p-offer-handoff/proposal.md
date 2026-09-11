# Proposal: Fix Binance P2P Offer Handoff

## Intent

Make `/p2p-offers` the single offer-discovery surface and make every displayed live offer trustworthy and actionable through the correct Binance identifiers. The integrated Binance rates calculator currently duplicates P2P search behavior and sends users to a generic Binance market URL, while the dedicated page rewrites native USDT input as VES and permits actions from stale data.

## Executive Summary

- Replace the integrated calculator's interactive Buy/Sell, amount, payment, search, and offer-list section with the existing Binance rate/reference presentation and one clear internal CTA to `/p2p-offers`.
- Keep `app/p2p-offers/page.tsx` as the existing authenticated page and preserve its route group, layout, and auth policy.
- Submit the user's selected amount unit unchanged: VES as VES minor units and USDT as native USDT minor units. Keep per-ad validation based on exact price, limits, and available quantity; do not use a live-rate conversion as query authority.
- Aggregate no more than three Binance pages sequentially, deduplicate by `advNo`, and discard the whole in-progress result if a later requested page fails. Use same-query stale data as a display-only fallback, or `unavailable` when no usable stale result exists.
- Give each live offer clearly labelled exact-ad (`advNo`) and seller-profile (`userNo`) destinations. Stale results remain visible only as read-only context.

## Scope

### In scope

1. **Integrated calculator surface**
   - Update `components/currency/binance-rates.tsx`, which is mounted by both the public rate cockpit and the accounts rates panel.
   - Remove its P2P search state, Buy/Sell controls, amount/payment controls, search submission, offer rendering, P2P hook usage, and per-offer generic Binance handoff.
   - Retain the supplied Binance rate/status presentation and existing rate behavior needed by the callers.
   - Add exactly one clear internal navigation CTA to `/p2p-offers`; it must not point to `/calculator`, a generic Binance market URL, or an individual offer.

2. **Dedicated offer-discovery page**
   - Keep `app/p2p-offers/page.tsx` and its current authenticated behavior unchanged. No route-group relocation, middleware change, navigation-policy change, or auth-policy change is part of this proposal.
   - Update `components/p2p-offers-filter.tsx` so `buildQuery` preserves the selected unit and original amount. VES requests remain VES; USDT requests carry native USDT and `amountUnit: 'USDT'`.
   - Remove any rate conversion from query construction or ad validity. If an existing conversion hint remains, label it as informational and ensure it cannot affect the request or validation result.
   - For every live offer, render two clearly labelled external destinations: an exact ad derived from `advNo` and a seller profile derived from `userNo`. Keep safe external-link target/rel behavior and use separate URL builders so the identifiers cannot be conflated.
   - When `status === 'stale'`, render offer details and stale messaging as display-only. Exact-ad and seller-profile actions must be absent or non-navigable, including through keyboard activation. Empty and unavailable states are also non-actionable.

3. **Shared Binance service and types**
   - Update `lib/server/binance-p2p-offers.ts` to fetch pages 1 through 3 at most, sequentially, with the existing filters and request boundary. Stop when the upstream response is exhausted; never request page 4.
   - Normalize and validate ads using the existing exact-decimal and money/quantity rules, then deduplicate returned offers by `advNo`. A seller may have multiple distinct ads; `userNo` must not be used as the deduplication key.
   - Treat a failure on any later requested page as a failed search rather than returning the successfully fetched prefix as live data. Do not cache or render that partial set. Preserve same-query stale fallback and return `unavailable` when stale data is absent or expired.
   - Add or clarify the separate seller-profile URL builder in `types/binance-p2p-offers.ts` only as required to satisfy the `userNo` handoff. It must use the verified Binance advertiser/profile route and never place `userNo` in the exact-ad `code` parameter.

4. **Contract tests**
   - Follow strict TDD with focused component and service tests before implementation.
   - Pin the integrated calculator's single internal CTA and absence of interactive P2P search behavior.
   - Pin native-unit query construction, exact-ad/profile links for live offers, stale non-actionability, sequential page bounds, page-3 handling, `advNo` deduplication, and fail-closed stale/unavailable behavior.
   - Retain coverage for existing loading, empty, error, refresh, filtering, and rate/status behavior where those contracts remain in scope.

### Out of scope

- Order execution, escrow, Binance account integration, persistence, database migrations, or local P2P history.
- New fiat or cryptocurrency support.
- Changes to route groups, page authentication, API authentication/rate-limit policy, middleware, or existing navigation policy.
- A redesign of the calculator, rates/history domain, or unrelated account UI beyond removing the duplicated P2P explorer and adding its CTA.
- Unbounded pagination, background synchronization, or a new cache/persistence layer.
- Changes to historical OpenSpec artifacts or unrelated dirty worktree paths.

## Proposed Design

### Ownership and data flow

The integrated component becomes a rate/reference card only. Offer search state and offer handoff live exclusively in `P2POffersFilter`, which consumes the existing BFF route and shared service. The API route remains the boundary for validated requests, rate limiting, and no-store responses; no UI-to-Binance or UI-to-database access is introduced.

### Amount semantics and precision

The filter will send the user's entered amount as integer minor units together with an explicit `amountUnit`. The VES branch preserves VES semantics. The USDT branch preserves native USDT semantics and passes that amount to the service without converting it through the current VES rate. Per-ad acceptance continues to use exact decimal parsing/scales for price, limits, available quantity, and the effective dynamic maximum. Floating-point conversion must not become an authority for filtering or affordability.

### Bounded pagination and failure handling

For an uncached search, the service will request Binance pages sequentially with the existing query filters, accumulating at most pages 1, 2, and 3. It will normalize valid ads and deduplicate by `advNo` before returning a live result. If a requested page fails, the accumulator is discarded; the search returns the existing same-query stale result, marked `stale`, when available within the stale window, otherwise `unavailable`. A partial prefix is never reported as a successful live search. The existing cache and in-flight deduplication behavior remains bounded by the same query key.

### Handoff and stale safety

The exact-ad link is built only from `advNo`; the seller-profile link is built only from `userNo`. Both destinations are labelled according to their purpose so users can distinguish opening the selected ad from viewing the seller. The URL construction is isolated in named builders and covered independently. The card action region is rendered only for live results. Stale cards may show the data and its age/status, but contain no actionable exact-ad or profile navigation.

## Affected Areas

### Expected production files

- `components/currency/binance-rates.tsx`
- `components/p2p-offers-filter.tsx`
- `lib/server/binance-p2p-offers.ts`
- `types/binance-p2p-offers.ts` if the separate profile builder is needed

### Verification-only or likely unchanged files

- `app/(public)/components/rate-cockpit.tsx`
- `components/accounts/accounts-rates-panel.tsx`
- `app/p2p-offers/page.tsx` (must retain current auth/layout behavior)
- `app/api/binance-p2p-offers/route.ts` (only contract compatibility should be checked; no auth-policy change)

### Expected tests

- `tests/components/binance-rates.test.tsx`
- `components/p2p-offers-filter.test.tsx`
- `tests/node/services/binance-p2p-offers.test.ts`
- A focused URL-builder/link test if a profile builder is added
- Route/auth coverage only if needed to pin the explicitly preserved behavior

## Risks and Mitigations

- **Later-page partial data:** A page-2/3 timeout, 429, malformed response, or upstream error could otherwise look like a valid but incomplete result. Discard the accumulator and use same-query stale/unavailable state; test that no partial live result is emitted.
- **Pagination latency or rate pressure:** Sequential fetching adds latency. Cap requests at three, stop on an exhausted response, and retain existing cache, in-flight deduplication, and API rate limiting.
- **Identifier confusion:** `advNo` and `userNo` have different destinations. Require both identifiers in the normalized live-offer contract, use separate builders, and test multiple ads from one seller.
- **Profile URL drift:** Binance's advertiser/profile URL shape may change. Keep it behind one builder/adapter, verify the supported route before implementation, and do not fall back to a generic market URL while claiming it is a seller profile.
- **Stale action leakage:** An enabled anchor or keyboard-focusable control could let stale data trigger an outdated destination. Render no exact/profile action for stale status and test pointer and keyboard paths.
- **USDT false positives/negatives:** Converting the input to VES or using binary floating point can accept an ad that fails native limits or available quantity. Preserve the unit in the request and reuse exact-decimal validation with boundary tests.
- **Discoverability change:** Removing the embedded explorer changes the calculator workflow. Make the CTA prominent and unambiguous, while relying on the already-present `/p2p-offers` navigation entry; do not add a second discovery surface.

## Rollback

Revert the scoped component, service, type, and test changes. No database, persisted state, route migration, or cache migration is introduced, so rollback requires no data recovery. A rollback restores the prior calculator explorer and its known handoff defects; it should be treated as an emergency code rollback while the scoped fix is corrected. Existing authenticated `/p2p-offers` route behavior remains intact throughout.

## Success Criteria

- [ ] The integrated Binance rates calculator has no interactive Buy/Sell P2P offer-search section, offer list, or generic per-offer Binance handoff.
- [ ] The calculator exposes one clear internal CTA whose destination is exactly `/p2p-offers` in both current caller contexts.
- [ ] `/p2p-offers` remains the only offer-discovery surface and remains authenticated with its current route/layout behavior.
- [ ] VES searches submit VES amounts unchanged; USDT searches submit native USDT amounts with `amountUnit: 'USDT'`, without rate conversion determining validity.
- [ ] Live USDT offers are validated per ad using exact price, limits, and available quantity, with existing precision guarantees preserved.
- [ ] Each live offer has clearly labelled exact-ad (`advNo`) and seller-profile (`userNo`) destinations; distinct ads from the same seller remain distinct.
- [ ] At most three Binance pages are fetched sequentially, page 4 is never requested, and duplicate `advNo` values produce one returned offer.
- [ ] A later-page failure never produces partial live data: the result is same-query `stale` when usable stale data exists, otherwise `unavailable`.
- [ ] Stale offers remain display-only; no exact-ad/profile action is available by pointer, keyboard, or direct rendered link while stale.
- [ ] Focused Jest tests cover each contract and the existing relevant loading/empty/error behavior without introducing unrelated redesign or persistence changes.

## Proposal Question Round

These questions are for improving the proposal by confirming business rules and implementation implications, not for expanding scope. Current recommendations are recorded so the next phase can proceed if they are accepted:

1. **Partial-page failure:** Confirm the recommended rule that any failure on a requested page 2 or 3 invalidates the entire live result, uses same-query stale data as read-only fallback, and otherwise shows unavailable rather than a partial list.
2. **Seller-profile destination:** Confirm that the implementation may use Binance's canonical advertiser/profile route behind a separate `userNo` URL builder, subject to verifying the route before coding; it must not substitute the generic Binance market link.
3. **Calculator presentation:** Confirm that the calculator should retain its current rate/status/reference behavior and receive only the single `/p2p-offers` CTA, with no additional calculator redesign.
4. **Informational conversion hint:** Confirm whether the dedicated page's existing rate hint should remain explicitly labelled as informational or be removed if it is only serving the old VES-conversion query path. In either case, it must not affect the submitted amount or validation.

## Next Phase

Design should resolve the profile URL contract and the proposal questions, then produce the smallest implementation sequence: service/type contracts, dedicated filter behavior, and integrated calculator simplification, with strict-TDD tests preceding each production change.
