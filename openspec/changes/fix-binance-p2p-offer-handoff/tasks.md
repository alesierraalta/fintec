# Tasks: Fix Binance P2P Offer Handoff

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380 authored lines (rough range: 340–390) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR, ordered work-unit commits |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

Keep the implementation within the forecast by removing only duplicated presentation and redundant test setup; do not cut native-unit, pagination, retry, stale-safety, identifier, or auth-preservation coverage. Do not add dependencies, routes, persistence/DB/auth changes, unbounded pagination, or unrelated redesign. Do not modify `app/p2p-offers/page.tsx`, `app/api/binance-p2p-offers/route.ts`, `hooks/use-binance-p2p-offers.ts`, callers, `components/p2p-offers/binance-market-link.tsx`, or historical OpenSpec changes.

## Execution Rules

- `openspec/config.yaml` requires `strict_tdd: true`: each work unit must complete RED before its production GREEN edit.
- Keep each unit's tests with its behavior and record focused command/result, runtime command/result, and rollback boundary in the commit/receipt.
- Use exact integer minor units and existing exact-decimal validation; never make floating-point conversion or the live rate an authority.
- Treat a green test as evidence only after the listed falsifiable mutation turns it red and the original behavior is restored.

## Allowed target files

Implementation and focused-test work may touch only these files:

- `types/binance-p2p-offers.ts`
- `lib/server/binance-p2p-offers.ts`
- `components/p2p-offers-filter.tsx`
- `components/currency/binance-rates.tsx`
- `tests/components/p2p-offers/binance-market-link.test.tsx`
- `tests/node/services/binance-p2p-offers.test.ts`
- `components/p2p-offers-filter.test.tsx`
- `tests/components/binance-rates.test.tsx`

Verification may inspect, but must not edit, `app/p2p-offers/page.tsx`, `app/api/binance-p2p-offers/route.ts`, the existing callers, `hooks/use-binance-p2p-offers.ts`, and `components/p2p-offers/binance-market-link.tsx`.

## Work Unit 1 — URL builders and identifier contracts

**Start:** existing `types/binance-p2p-offers.ts` has the exact-ad builder and no independently tested seller-profile builder. **Finish:** exact-ad and profile builders use separate identifiers, paths, and parameter names; no generic market URL is used for offer cards. **Rollback:** revert only the builder/comment change and its focused test.

### RED

- [x] Update `tests/components/p2p-offers/binance-market-link.test.tsx` first to name the exact-ad input `advNo`, assert the exact-ad URL contract, and add the seller-profile URL contract; assert swapped identifiers and generic-market fallback are rejected. <!-- sdd-owner: implementation -->

### GREEN

- [x] In `types/binance-p2p-offers.ts`, clarify that `buildBinanceP2PTradeUrl` puts only `advNo` in the exact-ad `code` parameter and add `buildBinanceP2PSellerProfileUrl(userNo)` with the verified advertiser route and `encodeURIComponent`; keep `BINANCE_P2P_MARKET_URL` for the page header contract but do not use it for offer actions. <!-- sdd-owner: implementation -->
- [x] Verify the URL contracts with the focused DOM suite for `tests/components/p2p-offers/binance-market-link.test.tsx` and record the GREEN result. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Mutate the exact builder to accept or pass `userNo`, mutate the profile builder to use `advNo` or the ad-code parameter, and mutate encoding; verify the URL contract test turns RED for each mutation, then restore the implementation in `types/binance-p2p-offers.ts`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Remove only obsolete URL comments or test duplication in `types/binance-p2p-offers.ts` and `tests/components/p2p-offers/binance-market-link.test.tsx`; rerun the focused DOM verification. <!-- sdd-owner: implementation -->

## Work Unit 2 — Bounded sequential service retrieval

**Start:** `fetchOnce` requests only page 1. **Finish:** `lib/server/binance-p2p-offers.ts` requests pages sequentially, at most 1–3, retries the current page only, deduplicates by normalized `advNo`, and never exposes a partial prefix after a requested-page failure. **Rollback:** revert only the service pagination/retry aggregation and `tests/node/services/binance-p2p-offers.test.ts` additions.

### RED

- [x] Extend `tests/node/services/binance-p2p-offers.test.ts` before editing production code with sequential full-page fixtures asserting request bodies `[page: 1, 2, 3]`, preserved filters and `rows: 20`, no page 4, page-3-only results, duplicate `advNo` collapse, and distinct `advNo` values for one `userNo`; assert native USDT sends `amountUnit: 'USDT'` and `transAmount: ''`. <!-- sdd-owner: implementation -->
- [x] Add RED cases in `tests/node/services/binance-p2p-offers.test.ts` for an empty or short page stopping later requests, same-page retry after a retryable transport or 5xx failure, non-retryable page-2 failure, page-3 failure, malformed response or row, and stale-seeded versus no-stale outcomes; assert the successful prefix is absent and the result is respectively same-query `stale` or `unavailable`. <!-- sdd-owner: implementation -->
- [x] Verify the new pagination and failure assertions are RED against the one-page implementation in `tests/node/services/binance-p2p-offers.test.ts`. <!-- sdd-owner: implementation -->

### GREEN

- [x] In `lib/server/binance-p2p-offers.ts`, add local `PAGE_SIZE = 20` and `MAX_PAGES = 3`; split the existing upstream request into `fetchPage(query, page)` and `fetchPageWithRetry(query, page)` while preserving timeout, filters, retry delay, cache keys/windows/limits, in-flight sharing, mapper, and query validation. <!-- sdd-owner: implementation -->
- [x] Make `fetchOnce` in `lib/server/binance-p2p-offers.ts` loop synchronously through pages 1–3, stop when raw `data.length < PAGE_SIZE`, append only valid mapped offers whose normalized `id` or `advNo` is not in a `Set`, and return one final `fetchedAt` only after all requested pages complete; let any page failure discard the accumulator so existing stale/unavailable handling receives no partial data. <!-- sdd-owner: implementation -->
- [x] Verify page bounds, short-page stop, same-page retry, dedupe, exact validity, and fail-closed fallback with `tests/node/services/binance-p2p-offers.test.ts` after each service edit; record GREEN evidence. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Apply and run falsifiable mutations against `tests/node/services/binance-p2p-offers.test.ts`: permit page 4 or ignore short-page exhaustion; restart page 1 on retry; dedupe by `userNo` or remove the `Set`; return the accumulator on page error; change USDT `transAmount`; bypass exact per-ad limits or availability. Each targeted test must turn RED before restoring the code in `lib/server/binance-p2p-offers.ts`. <!-- sdd-owner: implementation -->
- [x] Re-run `tests/node/services/binance-p2p-offers.test.ts` with a same-page 5xx or transport failure and inspect observed request bodies to prove retry uses the same page number and remains within the logical 1–3 bound. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Keep the pagination helpers local, remove only dead service code or comments in `lib/server/binance-p2p-offers.ts`, and avoid changing the public result model or cache/API boundary; rerun the focused node verification. <!-- sdd-owner: implementation -->

## Work Unit 3 — Dedicated filter native units, dual live links, and stale safety

**Start:** `components/p2p-offers-filter.tsx` converts USDT through the rates hook and renders one actionable link for stale cards. **Finish:** VES/USDT input remains native minor units, the conversion hint/rate hook is removed, live cards expose labelled exact-ad/profile links, and stale/empty/unavailable states have no navigable offer action. **Rollback:** revert only `components/p2p-offers-filter.tsx` and `components/p2p-offers-filter.test.tsx` changes.

### RED

- [x] Update `components/p2p-offers-filter.test.tsx` first to assert `500` VES submits `50000` with `amountUnit: 'VES'`, `10.05` USDT submits `1005` with `amountUnit: 'USDT'`, no rate hook or conversion hint is used or rendered, and existing operation, payment, quality, and re-search behavior remains covered. <!-- sdd-owner: implementation -->
- [x] Add RED DOM cases in `components/p2p-offers-filter.test.tsx` for a live offer's exactly two labelled safe external links (exact `advNo` and seller `userNo`), two distinct ads sharing one seller, and stale details or status with zero links or focusable handoffs; retain empty and unavailable non-actionability plus loading or error behavior. <!-- sdd-owner: implementation -->
- [x] Verify the native-unit, link, and stale-safety failures are RED in `components/p2p-offers-filter.test.tsx` before production edits. <!-- sdd-owner: implementation -->

### GREEN

- [x] In `components/p2p-offers-filter.tsx`, replace rate-based amount state or query construction with raw string input and a bounded two-decimal parser that produces safe integer minor units; send the original amount with VES or native USDT semantics and remove `useBinanceRates`, conversion state, and conversion-hint markup. <!-- sdd-owner: implementation -->
- [x] In `components/p2p-offers-filter.tsx`, render the existing offer details or stale messaging unchanged in scope, but branch the action region on `status === 'live'`; use `buildBinanceP2PTradeUrl(offer.id)` for the labelled exact-ad action and `buildBinanceP2PSellerProfileUrl(offer.merchant.userNo)` for the labelled seller-profile action, preserving `target="_blank"`, `rel="noopener noreferrer"`, and the external-link warning. <!-- sdd-owner: implementation -->
- [x] Verify native requests, exact per-ad display contracts, live links, and absent stale, empty, or unavailable actions in `components/p2p-offers-filter.test.tsx` after each filter edit; record GREEN evidence. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Mutate `components/p2p-offers-filter.tsx` to multiply USDT by `usdt_ves` or send `amountUnit: 'VES'`; restore a conversion hint or rate hook; render actions for `live || stale`; swap builder arguments; or remove safe link attributes. Verify the corresponding DOM, query, or URL test turns RED for each mutation, including keyboard role or focus inspection on stale content. <!-- sdd-owner: implementation -->
- [x] Probe adversarial inputs through the existing filter seam in `components/p2p-offers-filter.tsx` and `components/p2p-offers-filter.test.tsx`: blank, invalid, or unsafe amount text, USDT quantity or limit boundaries, superseded searches, and missing identifiers; verify no new navigable stale action or floating-point authority is introduced. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Remove only dead imports, conversion identifiers, and redundant fixture setup in `components/p2p-offers-filter.tsx` and `components/p2p-offers-filter.test.tsx`; rerun focused DOM verification without changing the authenticated page or API route. <!-- sdd-owner: implementation -->

## Work Unit 4 — Integrated Binance calculator simplification

**Start:** `components/currency/binance-rates.tsx` owns embedded P2P search state and generic per-offer handoffs. **Finish:** it is a snapshot-driven rate/reference card preserving rate/status/loading/freshness/refresh behavior and exposing exactly one internal dedicated P2P route CTA in both existing caller contexts. **Rollback:** revert only `components/currency/binance-rates.tsx` and `tests/components/binance-rates.test.tsx`.

### RED

- [x] Replace the old explorer characterization in `tests/components/binance-rates.test.tsx` first with a complete `BinanceRatesSnapshot` fixture; assert displayed `snapshot.rates.usdt_ves`, loading/live/fallback/error/freshness/message behavior, refresh behavior, exactly one internal dedicated P2P route link, and no P2P fetch or search call. <!-- sdd-owner: implementation -->
- [x] Assert in `tests/components/binance-rates.test.tsx` that Buy or Sell controls, amount, payment, or search inputs, offer lists, generic Binance market destinations, individual offer links, and a second offer-discovery CTA are absent while the public and accounts callers keep their existing prop contract. <!-- sdd-owner: implementation -->
- [x] Verify the expected RED result in `tests/components/binance-rates.test.tsx` before changing `components/currency/binance-rates.tsx`. <!-- sdd-owner: implementation -->

### GREEN

- [x] In `components/currency/binance-rates.tsx`, remove P2P hook, state, query, constants, result rendering, and generic handoff imports; render the compact snapshot or reference presentation using existing rate, status, message, freshness, loading, and refetch fields and add exactly one clear Next `Link` to the dedicated P2P route. Preserve compatibility-only optional props if present and do not alter either caller. <!-- sdd-owner: implementation -->
- [x] Verify retained rate behavior, explorer removal, no fetch or search, and the exact single CTA in `tests/components/binance-rates.test.tsx`; record GREEN evidence. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Mutate `components/currency/binance-rates.tsx` to restore the explorer, omit or duplicate the CTA, use an alternate calculator destination or a generic Binance destination, or ignore the supplied snapshot or status; verify the integrated DOM test turns RED for each mutation, then restore the implementation. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Remove only dead imports or comments and optional presentation duplication from `components/currency/binance-rates.tsx` and `tests/components/binance-rates.test.tsx`; preserve the card's existing caller boundary and rerun focused DOM verification. <!-- sdd-owner: implementation -->

## Work Unit 5 — Cross-boundary verification and cleanup

**Start:** Units 1–4 are individually GREEN and TRIANGULATED. **Finish:** focused DOM/node tests, static checks, build, falsifiable mutations, and reachable real-run observations are recorded; forbidden files are unchanged. **Rollback:** remove only this change's four production files and four focused test files if the complete behavior must be reverted; no data or route recovery is needed.

### TRIANGULATE / final verification

- [x] Run both focused Jest projects explicitly for `tests/components/binance-rates.test.tsx`, `components/p2p-offers-filter.test.tsx`, `tests/components/p2p-offers/binance-market-link.test.tsx`, and `tests/node/services/binance-p2p-offers.test.ts`; record exact results. <!-- sdd-owner: implementation -->
- [x] Run repository type-check, lint, and build verification for the scoped files; after any static-check fix, rerun both focused Jest suites and record results. <!-- sdd-owner: implementation -->
- [x] Run the relevant mutation checks (or the repository's configured mutation command) for the URL, service, filter, and integrated-calculator predicates in the four focused test files; every listed mutation must fail its claimed test before restoration. Do not inflate scope to chase unrelated mutation survivors. <!-- sdd-owner: implementation -->
- [x] Build or start the real app from the worktree and observe, not infer: with authentication bypass unset, verify the existing login redirect contract for the dedicated offer-discovery surface; with the configured bypass enabled, open the real page and confirm current auth, layout, and filter behavior. <!-- sdd-owner: implementation -->
- [x] In the bypass browser run, submit representative `500` VES and `10.05` USDT searches and inspect actual BFF request bodies for `50000` or `VES` and `1005` or `USDT`; if a live offer appears, inspect exact `advNo` and seller `userNo` destinations plus safe target or rel, otherwise record the observed empty, unavailable, or stale state without inventing a volatile count. <!-- sdd-owner: implementation -->
- [x] Inspect real browser network activity for absence of order execution and offer or search persistence mutations; record page-2 or page-3 fault injection as unreachable in the real run when applicable because `tests/node/services/binance-p2p-offers.test.ts` owns that deterministic failure evidence. <!-- sdd-owner: implementation -->

### REFACTOR / cleanup

- [x] Inspect the final change summary and diff for the ~400-line budget, exact allowed target files, unchanged auth, API, and page boundaries, no dependency, route, persistence, or unrelated formatting changes; remove only temporary drivers or logs outside the repository or in the existing ignored scratch area. <!-- sdd-owner: implementation -->

## Evidence commands and runtime contracts

The following commands and literal runtime contracts are evidence references, not executable task rows:

### Focused tests

```bash
npm test -- --runInBand --selectProjects dom tests/components/p2p-offers/binance-market-link.test.tsx
npm test -- --runInBand --selectProjects node tests/node/services/binance-p2p-offers.test.ts
npm test -- --runInBand --selectProjects dom tests/components/binance-rates.test.tsx components/p2p-offers-filter.test.tsx tests/components/p2p-offers/binance-market-link.test.tsx
npm test -- --runInBand --selectProjects node tests/node/services/binance-p2p-offers.test.ts
```

### Static checks and diff inspection

```bash
npm run type-check
npm run lint
npm run build
git diff --stat
git diff
```

### Runtime contracts

- With `FRONTEND_AUTH_BYPASS` unset, request `GET /p2p-offers` and verify the existing redirect to `/auth/login`.
- With `FRONTEND_AUTH_BYPASS=1`, open `/p2p-offers` and inspect the authenticated page, filter behavior, and BFF requests to `/api/binance-p2p-offers`.
- Observe native request bodies for `50000` with `VES` and `1005` with `USDT`; inspect exact-ad and seller-profile URL contracts when a live offer appears.

## Parent review and lifecycle gate

- [ ] Start or reuse one bounded review after implementation evidence is complete; review only the scoped files and the acceptance contracts above. <!-- sdd-owner: parent -->
- [ ] If authored changes exceed 400 lines or reveal a correctness risk, stop delivery and ask for the risk decision; do not silently select a chain, exception, dependency, route, persistence, or auth change. <!-- sdd-owner: parent -->
