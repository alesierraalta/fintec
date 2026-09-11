# Exploration: fix-binance-p2p-offer-handoff

## Status and method

- **Scope:** read-only architecture/product exploration; no source implementation performed.
- **Workspace:** `/home/alesierraalta/documents/projects/fintec-worktrees/binance-p2p-validity` only.
- **CodeGraph:** attempted first, but the MCP CodeGraph service was not initialized/available for this worktree. The local-index initialization command reported the unrelated main checkout, so it was not used for inspection. Filesystem inspection was used only after that failure and stayed within the authoritative worktree.
- **Skill resolution:** `paths-injected` (all injected `SKILL.md` files were read before conclusions).

## Executive finding

There are two separate P2P surfaces sharing the same hook/API/service:

1. `components/currency/binance-rates.tsx` is currently an interactive Buy/Sell offer explorer despite receiving a `BinanceRatesSnapshot`. It owns P2P form state, amount parsing, searches, stale rendering, and a generic `BINANCE_P2P_MARKET_URL` handoff. It is mounted by both `app/(public)/components/rate-cockpit.tsx` and `components/accounts/accounts-rates-panel.tsx`.
2. `components/p2p-offers-filter.tsx` is the dedicated offer page UI. It already has Buy/Sell, amount-unit UI, quality filters, exact-ad handoff, and stale status, but currently converts USDT input to a VES query and still renders actionable exact-ad links for stale results.

The smallest coherent architecture is to make the integrated component a **Binance rate/reference card plus one navigation CTA to `/p2p-offers`**, and keep all offer search state and offer handoff behavior in the dedicated surface. Extend the shared server service for bounded (maximum three pages) sequential pagination and deduplication, preserve `amountUnit: 'USDT'` as a native query, and make stale results display-only.

## Current route/navigation facts (observed)

- The actual route is `app/p2p-offers/page.tsx`, not the historical `app/(public)/p2p-offers/page.tsx` described by `openspec/changes/p2p_offers_filter/*`.
- The page calls `requireAuthenticatedUser()` before rendering and then wraps `P2POffersFilter` in `MainLayout`. Therefore `/p2p-offers` is authenticated/dashboard chrome today, despite the old change being named and designed as a public route.
- `requireAuthenticatedUser` redirects to `/auth/login` unless a user exists or the explicit frontend auth bypass is enabled.
- `components/layout/navigation.ts` already exposes `/p2p-offers` in secondary navigation. No new navigation item is needed.
- There is no observed route-group collision: only `app/p2p-offers/page.tsx` exists in the current bytes. Do not move it to `(public)` as part of this change unless product explicitly changes authentication; route-group relocation would be unrelated scope and could alter chrome/auth behavior.
- `middleware.ts` refreshes Supabase sessions and records page visits; its matcher excludes API/static paths. It does not itself protect `/p2p-offers`; page-level auth does.

## Current implementation and symbols

### Integrated surface

`components/currency/binance-rates.tsx`

- `BinanceRatesComponentImpl` owns `side`, `amount`, `paymentMethod`, `validationError`, and `useBinanceP2POffers()`.
- `parseAmountToMinor`, `submitSearch`, and the result renderer implement a second P2P search UI.
- `BINANCE_P2P_MARKET_URL` is used for every result, so the handoff loses the selected offer and seller context.
- `_props` is currently unused, meaning the passed rates snapshot has no rendered role in this component.
- The component imports `ExternalLink`, `Search`, `RefreshCw`, P2P query/constants/types, and the P2P hook solely for this interactive section. Removing that state/search section should remove those dependencies and leave no P2P search state here.

Callers:

- `app/(public)/components/rate-cockpit.tsx` → `P2PPanel` → `BinanceRatesComponent`.
- `components/accounts/accounts-rates-panel.tsx` renders it beside `BCVRates`.
- These callers pass the snapshot and expect a rates-oriented panel; neither requires offer results or query callbacks.

### Dedicated surface

`app/p2p-offers/page.tsx`

- Server entry point, metadata, `requireAuthenticatedUser`, `MainLayout`, page header, generic “Ir a Binance” link, and `P2POffersFilter`.
- Keep the generic header link as an intentional escape hatch; offer cards should have exact-ad and seller-profile destinations.

`components/p2p-offers-filter.tsx`

- `FilterState` contains `tradeType`, `amount`, `amountUnit`, payment and quality filters.
- `buildQuery` currently converts USDT to a VES equivalent using `useBinanceRates`; this is the confirmed false-positive/semantic defect. Native USDT validation exists in the service and should receive the original USDT minor amount instead.
- `hasOffers` currently accepts both `live` and `stale`; stale UI explicitly says “antes de continuar”, but each card still renders an enabled `BinanceMarketLink`.
- Card currently has one exact-ad link: `buildBinanceP2PTradeUrl(offer.id)`. The offer model already carries `merchant.userNo`, so a second seller-profile link can be built without another upstream request, subject to confirming Binance’s canonical profile URL.

`hooks/use-binance-p2p-offers.ts`

- Aborts prior requests and ignores responses from superseded controllers.
- Accepts/sets `live`, `empty`, `stale`, and `unavailable`; refresh repeats the last query.
- It currently clears the prior result whenever a new search starts, which is safe for stale actionability but means stale-cache behavior is server-result behavior, not optimistic UI behavior.

### Shared server boundary

`app/api/binance-p2p-offers/route.ts`

- Node runtime, force dynamic, strict Zod body validation, IP-based rate limiter, and `Cache-Control: no-store`.
- VES minimum is enforced at the route; USDT minimum is currently `1` minor unit (0.01 USDT).
- It delegates to `binanceP2POffersService`; no auth check is present on this API route. That is consistent with a public-market API being rate-limited rather than user-authenticated, even though the page is currently authenticated.

`lib/server/binance-p2p-offers.ts`

- `mapOffer` strictly validates USDT/VES, opposite advertiser side, tradability, exact decimal money/quantity, effective dynamic max, payment methods, merchant quality, and requested VES/USDT affordability.
- `adv.advNo` is the offer identity and is used as `offer.id`; `advertiser.userNo` is separately required and exposed as `offer.merchant.userNo`.
- These identifiers must not be conflated: `advNo` is for exact ad detail; `userNo` is for seller profile.
- `fetchOnce` currently posts exactly `{ page: 1, rows: 20, ... }`, maps only that response, and returns live/empty.
- `search` has bounded fresh/stale caches and same-query in-flight deduplication. On upstream failure it returns same-query stale data only while within `STALE_CACHE_MS`; otherwise unavailable.
- Pagination should be bounded to pages 1–3, preferably sequentially to avoid burst/rate-limit pressure, and dedupe offers by `advNo` before returning. Preserve cache/in-flight keys and stale semantics. Do not add unbounded page traversal or a new persistence layer.

`types/binance-p2p-offers.ts`

- Already defines `BinanceP2PAmountUnit`, optional `amountUnit` (default semantics are VES in the service), offer/merchant identifiers, and `buildBinanceP2PTradeUrl(adNo)` as `https://c2c.binance.com/en/adv?code=...`.
- The adjacent comment is contradictory (mentions `advertiserNo`, while the function and tests use `advNo`/ad code). Clarify the documentation while preserving the exact-ad contract. Add a separate seller-profile URL builder only after verifying Binance’s real URL shape for `userNo`; do not silently put `userNo` into an ad `code` parameter.

## Behavioral contracts for the change

1. **Integrated calculator:** no Buy/Sell controls, amount/payment state, P2P search hook, offer list, or generic per-offer handoff. It displays the Binance reference/rate status from the supplied snapshot and navigates to `/p2p-offers` for offer discovery. The destination must be the internal dedicated page, not `/calculator` and not generic Binance market URL.
2. **Dedicated amount semantics:** VES input submits VES minor units. USDT input submits native USDT minor units with `amountUnit: 'USDT'`; the live-rate conversion hint may remain informational but must not rewrite the query or determine validity.
3. **Offer retrieval:** request no more than three upstream pages per uncached search; preserve Binance filters; deduplicate repeated ads by `advNo`; never return an offer twice.
4. **Handoff:** each live offer offers (a) exact ad destination derived from `advNo`, and (b) seller-profile destination derived from `merchant.userNo`. Both open externally with existing safe target/rel behavior and clear labels.
5. **Stale safety:** stale offers may be shown as read-only context, but exact-ad/profile actions must be absent or disabled while `status === 'stale'`. No click may navigate from stale data. Live results remain actionable; empty/unavailable remain non-actionable.
6. **Auth:** retain current authenticated page behavior unless product explicitly asks to make the page public. The API’s existing rate-limit boundary remains independent of page auth.
7. **Money/precision:** preserve integer minor-unit handling and exact decimal parsing; avoid float conversion as a query authority. Native USDT quantity checks must continue to use exact quantity/scale logic.

## Smallest affected files/symbols

Likely implementation/test touch set (to confirm during design):

- `components/currency/binance-rates.tsx`: replace `BinanceRatesComponentImpl` interactive explorer with rate/reference presentation and `/p2p-offers` CTA; remove P2P state/search helpers/imports.
- `tests/components/binance-rates.test.tsx`: change characterization from “submits filters and generic handoff” to “does not issue P2P fetch/search and links to `/p2p-offers`”; retain snapshot/status/error display assertions appropriate to the new card.
- `components/p2p-offers-filter.tsx`: native USDT `buildQuery`; stale action blocking; exact-ad plus seller-profile links; avoid rate hook if only used for conversion hint (retain only if the hint remains explicitly informational).
- `components/p2p-offers-filter.test.tsx`: update USDT query expectation; add live dual-destination and stale non-actionability cases; preserve existing filter/state/error tests.
- `lib/server/binance-p2p-offers.ts`: bounded three-page fetch and `advNo` deduplication, with explicit upstream-page failure semantics compatible with stale fallback.
- `tests/node/services/binance-p2p-offers.test.ts`: assert page sequence/max three pages/dedup and native USDT payload/filtering; add partial-page/upstream failure characterization as needed.
- `types/binance-p2p-offers.ts`: only if a seller-profile URL builder is required; test it in `components/p2p-offers/binance-market-link.test.tsx` or a focused type utility test.
- `app/p2p-offers/page.tsx`: likely no change; add a route/page test only if auth/public behavior needs explicit pinning.

Do **not** change historical OpenSpec files `p2p_offers_filter` or `add-p2p-amount-input-group`; they describe completed/prior work and conflict with current route bytes in places.

## Strict TDD ordering and evaluation seams

1. First add/update failing contract tests for integrated handoff and absence of integrated search state.
2. Add failing dedicated component tests for native USDT query, live exact/profile links, and stale disabled/absent actions.
3. Add failing service tests for three-page bounded pagination, dedup by `advNo`, and page payloads.
4. Implement the smallest production changes in the order: service/type contracts, dedicated UI, integrated UI.
5. Run focused Jest tests, then the relevant node/API/component suites; do not use a passing mocked fetch as evidence of Binance correctness.
6. Adversarial seams: duplicate `advNo` across pages, same `userNo` across different ads, malformed/missing identifiers, page 3 only match, page 4 never requested, USDT amount below/above availability, dynamic max lower than configured max, stale result click/keyboard activation, superseded search response, 429 and upstream timeout.
7. Real/evaluation seam: confirm route auth behavior in both normal and explicit frontend-bypass lanes, then perform a real `/p2p-offers` browser run if implementation is completed. Live Binance output is volatile; assert request bounds, observed links, and action blocking rather than fixed offer counts.

## Risks, edge cases, and non-goals

### Risks

- Binance pagination may return overlapping or reordered ads; dedup must happen before mapping/output and must use `advNo`.
- A page failure after earlier successful pages creates an ambiguity: safest contract is fail the search and use same-query stale cache, rather than presenting a silently partial “live” result. Design must choose and test this explicitly.
- Binance URL conventions for seller profiles may change or may not accept `userNo` in the obvious route. Verify canonical URL before shipping; exact ad URL is already pinned.
- Removing the integrated explorer changes existing UI tests and may reduce discoverability; the internal CTA and existing secondary navigation preserve the path.
- Current rate component tests contain offer fixtures whose merchant omits required `userNo` under current types; update fixtures as part of the test contract rather than widening the type.

### Edge cases

- Zero/blank amount: no search; USDT 0.01 lower bound versus VES Bs. 1 lower bound.
- Decimal separators and safe-integer limits; no float-derived native USDT query.
- Duplicate ad with differing page representation: first accepted normalized offer wins; never duplicate by seller identity.
- Same seller advertising multiple ads: profile destination may repeat, exact ads must remain distinct.
- No valid identifiers, malformed response, non-2xx, timeout, 429, stale cache expiry, and empty page 1 with valid page 2/3.
- Stale cards visible during refresh must not become actionable through keyboard, direct anchor focus, or mobile deep-link behavior.

### Non-goals

- No transaction execution, escrow, Binance account integration, local P2P persistence, database migration, new cryptocurrency/fiat, or unbounded discovery.
- No redesign of the calculator/history/rate domain beyond removing P2P ownership from the integrated component.
- No route-group migration or auth policy change without an explicit product decision.
- No change to unrelated dirty paths in the main checkout.

## Open decisions for design phase

1. Confirm the desired Binance seller-profile URL for `userNo` and whether it should use the same `BinanceMarketLink` deep-link adapter.
2. Decide whether an upstream failure on pages 2/3 invalidates the entire live search or returns successfully mapped earlier pages; recommendation: fail closed to stale/unavailable to avoid silent partial results.
3. Decide the integrated reference-card visual contract from the existing `BinanceRatesSnapshot` fields (`rates.usdt_ves`, `status`, `message`, `lastUpdatedLabel`, `refetch`) while keeping the diff small.
4. Decide whether the dedicated page remains authenticated (current behavior and navigation context recommend yes) and pin that behavior with a route/auth test if it is part of acceptance.
