# Design: Fix Binance P2P Offer Handoff

## 0. Resolution and constraints

- **Scope:** design only. This phase writes no source or test implementation; the only artifact created is this `design.md` in the requested worktree.
- **Authoritative inputs:** `explore.md`, `proposal.md`, `specs/p2p-offer-discovery/spec.md`, and `specs/calculator-navigation/spec.md`. The four user decisions are final: native units, no conversion hint, exact-ad plus seller-profile actions, and fail-closed later-page handling.
- **CodeGraph:** `codegraph_explore` was attempted first for the target worktree and returned `MCP not initialized`. The existing exploration records the same limitation. Focused filesystem reads were used only after that failure; no broad index or unrelated checkout was used.
- **Skill resolution:** `paths-injected`; all injected project and global skills were read before this design.
- **Budget:** keep the implementation and its focused tests within a forecast of 340–390 changed lines. Do not add a dependency, route, persistence layer, database change, telemetry system, or unrelated UI redesign.
- **Security/product boundary:** `/p2p-offers` remains authenticated and discovery-only. Binance links leave FinTec; FinTec never creates or executes an order.

The current `BinanceRatesComponentImpl` ignores its `snapshot` and renders the duplicate P2P explorer. The replacement therefore restores the intended rate/reference presentation from the supplied snapshot rather than preserving that obsolete JSX. Existing `BinanceRateCard` and `BinanceRateAdvanced` remain untouched; mounting the advanced bank/amount simulator here would add unrelated controls.

## 1. Architecture decisions

| Decision | Design choice | Reason |
| --- | --- | --- |
| Offer-discovery ownership | `P2POffersFilter` is the only offer-search UI. `BinanceRatesComponent` is a snapshot-driven rate/reference card with one internal `Link` to `/p2p-offers`. | Removes duplicate state, requests, and generic handoffs without changing either caller. |
| Amount authority | Store the amount text and parse its two-decimal representation directly into a safe integer minor-unit value. Send `amountUnit` unchanged. | Prevents `parseFloat`/rate conversion from becoming query authority; both VES and USDT remain native minor units. |
| Pagination | Add a page helper and a `for` loop capped at `MAX_PAGES = 3`, requesting page 1, then 2, then 3 sequentially. Stop when `data.length < PAGE_SIZE` (`PAGE_SIZE = 20`). | Bounds latency and upstream pressure while allowing a page-3 match and never requesting page 4. |
| Retry seam | Preserve the existing one retry for transport/5xx errors, but retry the current page rather than restarting page 1. Non-retryable errors fail immediately. | Keeps existing resilience while retaining logical page order and avoiding repeated successful pages. A page is failed only after its permitted retry also fails. |
| Identity | Keep `BinanceP2POffer.id` as the normalized `adv.advNo` for compatibility. Pass it only to `buildBinanceP2PTradeUrl`; pass `offer.merchant.userNo` only to `buildBinanceP2PSellerProfileUrl`. | Makes ad and seller identity impossible to conflate without changing the public offer shape. |
| Stale safety | Render offer details for `stale`, but render the action region only for `live`. | Absence of anchors is safer than a disabled anchor and blocks pointer, keyboard, and deep-link activation paths. |
| Cache boundary | Preserve the existing query key, fresh/stale windows, in-flight deduplication, cache size limits, and no-store API response. | Pagination changes retrieval, not cache or rate-limit policy. |

## 2. Ownership and data flow

```text
Rate callers
  ├─ app/(public)/components/rate-cockpit.tsx:P2PPanel
  ├─ app/(public)/components/live-rates-section.tsx:BinanceRatesComponentWrapper
  └─ components/accounts/accounts-rates-panel.tsx:AccountsRatesPanelImpl
        └─ useBinanceRates() owns the BinanceRatesSnapshot
             └─ BinanceRatesComponent(snapshot)
                  ├─ rate/status/reference presentation
                  └─ one internal Link('/p2p-offers')

app/p2p-offers/page.tsx:P2POffersPage
  └─ requireAuthenticatedUser()
       └─ MainLayout → P2POffersFilter
            └─ useBinanceP2POffers().search(query)
                 └─ POST /api/binance-p2p-offers
                      ├─ existing Zod validation
                      ├─ existing IP rate limiter
                      ├─ existing Cache-Control: no-store
                      └─ BinanceP2POffersService.search(query)
                           ├─ fresh cache / same-key in-flight request
                           ├─ sequential Binance pages 1..3
                           ├─ existing mapOffer exact validation
                           ├─ dedupe normalized advNo
                           └─ live | empty | stale | unavailable
                                ├─ live: exact-ad + seller-profile actions
                                └─ stale/empty/unavailable: no offer actions
```

`app/p2p-offers/page.tsx`, `requireAuthenticatedUser`, and the API route remain boundaries, not implementation targets. The API is still independently rate-limited rather than page-authenticated, as it is today; page authentication is retained at the server page boundary.

## 3. Exact file and symbol plan

### 3.1 `components/currency/binance-rates.tsx`

Modify `BinanceRatesCardProps`, `BinanceRatesComponentImpl`, and the existing memoized `BinanceRatesComponent` export in place.

- Retain the exported component and the required `snapshot: BinanceRatesSnapshot` prop. Retain dormant optional `mode`/`onModeChange` fields at the type boundary for compatibility if they remain present, but do not render or repurpose them.
- Remove `useBinanceP2POffers`, all P2P query/payment constants and types, `useState` search state, `parseAmountToMinor`, offer result rendering, and `BINANCE_P2P_MARKET_URL`.
- Render a compact reference card using only the supplied snapshot: `snapshot.rates.usdt_ves` as the displayed VES-per-USDT reference, the existing `snapshot.status` state, `snapshot.message`/`error` qualification, `snapshot.lastUpdatedLabel`, and `snapshot.loading`/`snapshot.refetch` for the existing refresh behavior.
- Preserve visible loading, live, fallback, stale, freshness, and error/reference semantics. Do not add a rate calculation or a second rate fetch.
- Add exactly one internal Next `Link` with `href="/p2p-offers"`, labelled as offer discovery. It is the only offer-discovery handoff in this component. There is no external link and no per-offer action here.
- Keep touch/focus treatment consistent with the existing card. A refresh button is a rate action, not a second offer-discovery CTA.

The three callers continue to pass the same snapshot and require no change. In particular, no caller starts fetching P2P offers merely by rendering the rate card.

### 3.2 `components/p2p-offers-filter.tsx`

Modify the local `FilterState`, amount change/query construction, conversion-hint block, and offer action region.

- Keep the existing operation, payment, quality filters, automatic re-search on operation/unit changes, loading, empty, unavailable, and stale status rendering.
- Change the local amount representation to the raw input string (`string | null`) and use a small local two-decimal parser that concatenates whole and padded fractional text, checks `Number.isSafeInteger`, and returns the minor-unit integer. It must not use the Binance rate, `parseFloat` as an authority, or binary multiplication. Blank/invalid input retains the current rejected-query behavior by producing zero for the API validation boundary.
- Make `buildQuery` return the shared filters plus:
  - VES: the parsed original VES minor units and `amountUnit: 'VES'`.
  - USDT: the parsed original USDT minor units and `amountUnit: 'USDT'`.
- Remove the `useBinanceRates` import, `binanceRateSnapshot`, `usdtVesRate`, `conversionHint`, and all conversion-hint markup. No `tasa Binance` hint remains, even as an informational element.
- Keep `amountMinor` as the only query amount authority. The service remains responsible for exact per-ad price/limit/quantity checks.
- Keep `hasOffers` true for both live and stale so stale details and age can be shown. Wrap the two external actions in a branch that renders only when `status === 'live'`:
  1. `BinanceMarketLink href={buildBinanceP2PTradeUrl(offer.id)}` with a clear exact-ad label such as “Comprar/Vender USDT · oferta exacta”.
  2. `BinanceMarketLink href={buildBinanceP2PSellerProfileUrl(offer.merchant.userNo)}` with a clear “Ver perfil del vendedor” label.
- Preserve `target="_blank"` and `rel="noopener noreferrer"` on both links and keep the existing external-link warning. A stale card has no anchors or other navigable handoff controls; empty and unavailable states remain action-free.

### 3.3 `types/binance-p2p-offers.ts`

- Keep `BINANCE_P2P_MARKET_URL` because `app/p2p-offers/page.tsx` intentionally uses it for its generic header escape hatch; do not import it into either offer card component.
- Keep `buildBinanceP2PTradeUrl(adNo)` and clarify its comment: it is the exact advertisement route and its `code` is `advNo`.
- Add one separate builder:

```ts
export function buildBinanceP2PSellerProfileUrl(userNo: string): string {
  return `https://c2c.binance.com/en/advertiserDetail?advertiserNo=${encodeURIComponent(userNo)}`;
}
```

The exact-ad builder remains `https://c2c.binance.com/en/adv?code=${encodeURIComponent(adNo)}`. No builder accepts a generic market URL or silently substitutes one identifier for the other.

### 3.4 `lib/server/binance-p2p-offers.ts`

Keep `mapOffer`, `parseMinorUnits`, `parseExactQuantity`, `hasRequestedQuantity`, `getRequestedFiatMinor`, `formatBinanceP2PTransAmount`, query validation, cache keys, cache windows, and cache limits unchanged except for the pagination seam.

Add constants near the existing upstream constants:

```text
PAGE_SIZE = 20
MAX_PAGES = 3
```

Refactor the current one-request `fetchOnce` into a small page request plus aggregation:

1. `fetchPage(query, page)` creates the existing abort/timeout boundary, posts the existing filters with `page` and `rows: PAGE_SIZE`, validates the response, and returns the raw `data` array. USDT continues to send `transAmount: ''`; VES continues to use `formatBinanceP2PTransAmount(query.amountMinor)`.
2. `fetchPageWithRetry(query, page)` applies the current retry delay and one retry to the same page for retryable transport/5xx failures.
3. `fetchOnce(query)` creates an empty `offers` array and `Set<string>` for normalized advertisement IDs, then requests pages sequentially from 1 through `MAX_PAGES`. Each raw entry is passed through unchanged `mapOffer(entry, query)`. A valid mapped offer is appended only if its `id` (the normalized `advNo`) has not been seen. The first accepted representation wins; distinct ads from the same `userNo` remain distinct.
4. After each page, stop if the raw page contains fewer than `PAGE_SIZE` entries. Otherwise continue until page 3 and stop unconditionally. There is no code path that requests page 4.
5. Only after the loop completes normally return `live` or `empty` with one final `fetchedAt`. Any thrown page error escapes `fetchOnce`; the in-progress accumulator is therefore discarded.

A structurally valid page containing individually invalid ads is still processed by the existing exact mapper and those ads are dropped as before. A malformed response, invalid `data` shape, timeout, non-2xx response, or exhausted retry is a page failure and follows the stale/unavailable path rather than becoming a partial live result.

## 4. Failure and cache semantics

`BinanceP2POffersService.search` and `fetchAndCache` retain their current contract:

| Condition | Result and cache effect |
| --- | --- |
| Same query cached for `< FRESH_CACHE_MS` | Return the cached `live`/`empty` result; no upstream page is requested. |
| No fresh cache | One same-key in-flight promise is shared. That promise performs pages sequentially and never overlaps pages. |
| Page succeeds with `< 20` raw rows | Treat the response as exhausted, return the accumulated complete result, and do not request another page. |
| Pages 1–3 complete | Return `live` when normalized offers exist, otherwise `empty`; cache that complete result with its final `fetchedAt`. |
| Any requested page fails after its permitted retry | Discard every page already accumulated. If the same query has a cache entry no older than `STALE_CACHE_MS`, return a copy with `status: 'stale'` and only the cached offers/fetched timestamp. Otherwise return `unavailable`, empty offers, and `fetchedAt: null`. |
| Stale fallback | Do not cache a new timestamp or extend the stale window. Do not expose the successful page prefix. |
| Unavailable | Do not cache it. The API continues to map it to HTTP 503; stale remains HTTP 200. |

The existing query key already includes side, amount unit, amount, payment method, and quality filters, so a VES cache entry cannot satisfy a USDT query. The route keeps its strict schema, IP rate limiter, Node runtime, and `Cache-Control: no-store`. No database or persistent offer cache is introduced.

For USDT, the UI sends native hundredths and the service continues to calculate the corresponding per-ad VES amount with integer `BigInt` arithmetic in `getRequestedFiatMinor`, then checks exact limits and available quantity. The global `usdt_ves` rate is not involved. For VES, the existing VES minor-unit and exact decimal paths remain unchanged.

## 5. Strict Jest TDD sequence

`openspec/config.yaml` has `strict_tdd: true`; no production edit begins before its corresponding RED tests exist.

### RED

Write or update the focused tests first, while the current implementation is still present and expected to fail:

1. **Integrated surface — `tests/components/binance-rates.test.tsx`**
   - Replace the explorer characterization with a complete `BinanceRatesSnapshot` fixture.
   - Assert the displayed reference rate, status/message/freshness state, loading/refresh behavior, exactly one link, and exact `href="/p2p-offers"`.
   - Assert no Buy/Sell controls, amount/payment/search controls, offer list, generic Binance URL, or P2P fetch/search call. The old offer fixture no longer needs a merchant `userNo` because the integrated component no longer renders offers.

2. **Dedicated surface — `components/p2p-offers-filter.test.tsx`**
   - Keep the existing VES query expectation.
   - Change the USDT case to a native example such as `10.05 → amountMinor: 1005, amountUnit: 'USDT'`; assert no rate hook is used and no conversion-hint text is rendered.
   - Assert a live offer has exactly two labelled links: exact ad `https://c2c.binance.com/en/adv?code=offer1` and profile `https://c2c.binance.com/en/advertiserDetail?advertiserNo=s-fixture-seller-1`, with safe external-link attributes.
   - Render two ads with different `id` values and the same `userNo` to prove exact actions stay distinct.
   - Render a stale result and assert its details/status remain visible while `queryAllByRole('link')` is empty; assert empty/unavailable states also contain no offer destinations. Include the keyboard/focus assertion at the DOM boundary rather than testing a disabled anchor that should not exist.
   - Retain loading, quality-filter, operation/unit re-search, empty, and error behavior tests.

3. **URL contracts — `tests/components/p2p-offers/binance-market-link.test.tsx`**
   - Keep the exact-ad builder test but name the argument `advNo`.
   - Add the seller-profile builder test, including an encoded identifier case if useful. Assert the two URL paths and parameter names cannot be swapped.

4. **Service boundary — `tests/node/services/binance-p2p-offers.test.ts`**
   - Add a full page-1/page-2/page-3 fixture sequence and assert request bodies contain pages `[1, 2, 3]`, preserve all filters, and never contain page 4.
   - Add exhaustion with an empty/short page and assert no later page is requested.
   - Add duplicate `advNo` across pages and distinct `advNo` values sharing one `userNo`; assert one copy of the duplicate and both distinct ads.
   - Assert native USDT payload (`amountUnit: 'USDT'`, `transAmount: ''`) and retain exact per-ad availability/limit boundary coverage.
   - Inject a page-2 failure and a page-3 failure. Assert the accumulated prefix is absent: same-query stale data is returned when seeded, otherwise `unavailable` with no offers. Use a non-retryable response for the minimal failure test and a retryable transport/5xx case to pin same-page retry behavior.

### GREEN

Implement only the smallest production changes in this dependency order, running the related RED tests after each step:

1. Add and test `buildBinanceP2PSellerProfileUrl`; clarify the exact-ad builder.
2. Refactor the service into page fetch/retry/aggregate functions, preserving mapper, cache, in-flight, timeout, and query contracts.
3. Remove the filter conversion path, add exact native amount parsing, and add live-only dual actions.
4. Replace the integrated explorer with the snapshot/reference card and one internal CTA.

### TRIANGULATE

Run both Jest projects explicitly so a green DOM suite cannot hide a node-service regression:

```bash
npm test -- --runInBand --selectProjects dom \
  tests/components/binance-rates.test.tsx \
  components/p2p-offers-filter.test.tsx \
  tests/components/p2p-offers/binance-market-link.test.tsx
npm test -- --runInBand --selectProjects node \
  tests/node/services/binance-p2p-offers.test.ts
```

Then run `npm run type-check`, `npm run lint`, and `npm run build`. Re-run the focused suites after each static-check fix. Triangulation must include these falsifiable mutation checks:

| Mutation | Test that must turn RED |
| --- | --- |
| Change the USDT filter back to `amountUnit: 'VES'` or multiply by `usdt_ves` | Native USDT query test and no-hint/rate-hook test |
| Render actions for `live || stale` | Stale result has no links/focusable handoffs |
| Pass `userNo` to the exact builder or `advNo` to the profile builder | URL contract tests |
| Remove the `Set` or dedupe by `userNo` | Duplicate-ad/same-seller service test |
| Allow the loop to reach page 4 or ignore short-page exhaustion | Page-bound and exhaustion tests |
| Return the accumulated prefix from a page-error catch | Page-2/page-3 fail-closed tests |
| Restore the old integrated explorer or omit the internal link | Integrated DOM absence/exact-CTA tests |

Adversarial inputs covered by the same seams are duplicate ads, same-seller distinct ads, page-3-only matches, missing identifiers, malformed rows/responses, dynamic maxima, USDT quantity boundaries, 429/timeout/5xx, superseded UI searches, and stale keyboard activation. No fixed live Binance offer count is asserted.

### REFACTOR

After all focused tests and mutations are green, remove only dead imports/comments and keep the pagination helper local to the service. Do not extract a one-caller abstraction, rename the offer model, alter the route, or reformat unrelated files. Re-run the same two Jest commands plus type-check/lint/build and inspect the final diff for the 400-line budget and forbidden files.

## 6. Focused and real-run verification

The deterministic layer is the Jest contract above. The real-run layer must exercise the built Next application, not a mock component or a reimplementation:

1. Build and start the actual app from this worktree. With `FRONTEND_AUTH_BYPASS` unset and no session, request `/p2p-offers` and observe the existing redirect to `/auth/login`.
2. Start the bypass lane with `FRONTEND_AUTH_BYPASS=1`, open `/p2p-offers` in a real browser, and observe the authenticated page/layout and filter controls. No route move or auth policy change is acceptable.
3. Submit representative real inputs (`500` VES and `10.05` USDT) and inspect the actual browser request to `/api/binance-p2p-offers`. The observed bodies must contain `50000`/`VES` and `1005`/`USDT`, respectively, with no rate-derived rewrite. Let the real Binance response determine `live`, `empty`, or `unavailable`; do not assert a volatile count.
4. If a live offer is observed, inspect the rendered DOM hrefs before leaving FinTec: one exact-ad path using its `advNo`, one profile path using its `userNo`, both with safe target/rel attributes, and no generic market href on an offer card. If a stale result is observed, inspect that no card action is focusable or rendered.
5. Observe browser network activity while searching and viewing an offer. It may contain the BFF and external Binance navigation only; it must not contain an order-execution request or offer/search persistence mutation.

A browser run cannot deterministically force Binance page 2 or 3 to fail; the fault-injected Jest service tests are the evidence for that failure path. The real run must report that branch as unreachable if no upstream failure occurs rather than claiming it was observed. Throwaway browser drivers or request logs belong outside the repository or in the existing ignored scratch area.

The service currently has no drop-reason metric for individually rejected ads. This design deliberately does not add instrumentation because it is outside the requested fix; live offer quality and counts remain volatile and are not treated as a success metric.

## 7. Risks and mitigations

| Risk | Mitigation / residual condition |
| --- | --- |
| Three sequential pages increase latency or trigger upstream limits. | Cap at three, stop on short pages, retry only the current page, preserve in-flight/fresh caching and the existing API rate limiter. |
| A later page fails after valid earlier pages. | Throw away the accumulator and use same-query stale/unavailable; never label a prefix `live`. |
| A retry is mistaken for a fourth page. | Retry carries the same page number; the logical page sequence is still 1–3 and no request uses page 4. Tests inspect request bodies. |
| `advNo` and `userNo` are conflated. | Separate named builders, normalized `id` documentation, different link labels, and URL tests with same-seller/different-ad fixtures. |
| Stale data remains actionable through keyboard or mobile deep-link behavior. | Render no anchor/action region at all for `status === 'stale'`; test the DOM, not only click callbacks. |
| USDT false positives from global-rate conversion or floating point. | Remove the rate hook/hint, parse entered text to native minor units, send explicit `amountUnit`, and retain BigInt per-ad validation. |
| Missing/malformed seller identifiers. | Existing `mapOffer` already requires bounded `userNo`; invalid ads are excluded before UI rendering. |
| Discoverability drops when the embedded explorer disappears. | One prominent internal `/p2p-offers` CTA plus the existing secondary navigation entry; no second explorer is added. |
| Profile URL behavior changes at Binance. | Isolate the final URL in one builder using the user-approved canonical advertiser route; exact-ad behavior remains independently pinned. |
| Current rate component does not visibly use its snapshot. | Add snapshot/status regression tests and keep the replacement presentation limited to the existing snapshot fields. |

## 8. Rollout and rollback

Roll out as one application change with no migration or coordination requirement:

1. Land the type/service contracts and focused tests with the UI changes in the same release.
2. Verify the authenticated page and bypass lane, native request bodies, bounded upstream page sequence in tests, and observed live/stale link behavior after deployment.
3. Monitor existing API error/rate-limit behavior and cache hit behavior; do not introduce a new persistent cache or dashboard for this slice.

Rollback is a normal scoped code revert of the four production files and their tests. No persisted offers, schema, database records, route migration, or cache migration needs recovery. A rollback restores the old embedded explorer and its generic/USDT-conversion defects, so it is an emergency restoration only while the fix is corrected; it does not justify changing auth or adding a fallback route.

## 9. Non-goals and test stopping point

Do not change `app/p2p-offers/page.tsx`, `app/api/binance-p2p-offers/route.ts`, `hooks/use-binance-p2p-offers.ts`, the three rate callers, `BinanceMarketLink`, order/payment code, Binance account integration, persistence, database/RLS, currencies, middleware, navigation policy, or historical OpenSpec artifacts.

The test budget stops after the ranked contracts above: service page/failure/identity behavior, URL construction, native filter query/actionability, and integrated rate/CTA behavior. Direct Binance offer counts, upstream ranking quality, authenticated session creation, and order execution are verified only by existing boundary behavior or observed real-run limitations, not by new speculative tests.

## 10. Changed-line forecast

| Area | Forecast |
| --- | ---: |
| `components/currency/binance-rates.tsx` compact snapshot replacement and CTA | ~120 |
| `components/p2p-offers-filter.tsx` native parser, hint removal, live action branch | ~50 |
| `lib/server/binance-p2p-offers.ts` bounded page aggregation and same-page retry seam | ~80 |
| `types/binance-p2p-offers.ts` separate builder/comment | ~10 |
| Focused Jest updates and additions across the four existing test files | ~120 |
| **Total forecast** | **~380 changed lines** |

The obsolete explorer is removed in place and is not copied into the dedicated page. If the implementation approaches 400 lines, cut optional presentation/test duplication before adding scope; do not add a new abstraction, route, dependency, or observability subsystem.
