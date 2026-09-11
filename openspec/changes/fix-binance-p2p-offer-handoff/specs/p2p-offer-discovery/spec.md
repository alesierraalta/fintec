# P2P Offer Discovery Specification

## Purpose

Provide one authenticated Binance P2P offer-discovery surface whose amounts, offer validity, pagination, handoffs, and degraded states remain trustworthy.

## Requirements

### Requirement: Native amount semantics and exact offer validity

The offer-discovery surface MUST submit VES amounts as VES minor units and USDT amounts as native USDT minor units with `amountUnit: 'USDT'`. It MUST NOT convert the entered amount through a live rate or display the conversion hint. A live offer MUST be accepted only when its exact price, limits, available quantity, and applicable dynamic maximum satisfy the requested amount using the existing exact-decimal precision rules.

#### Scenario: VES amount remains denominated in VES

- GIVEN the user selects VES and enters a valid VES amount
- WHEN an offer search is submitted
- THEN the request contains the original VES minor-unit amount and VES semantics
- AND no rate-derived amount is used as the query authority

#### Scenario: USDT amount remains denominated in USDT

- GIVEN the user selects USDT and enters a valid USDT amount
- WHEN an offer search is submitted
- THEN the request contains the original USDT minor-unit amount and `amountUnit: 'USDT'`
- AND the entered amount is not rewritten as a VES equivalent

#### Scenario: Native USDT validity is checked per advertisement

- GIVEN a live USDT offer has exact price, minimum and maximum limits, available quantity, and a dynamic maximum
- WHEN the offer is evaluated for the requested amount
- THEN the offer is shown only if that amount satisfies all applicable per-ad constraints
- AND binary floating-point conversion does not determine acceptance

### Requirement: Bounded sequential offer retrieval

A fresh offer search MUST request Binance pages sequentially, starting at page 1, and MUST request no more than pages 1 through 3. The search MUST stop when Binance indicates that no further page is available and MUST never request page 4 or perform unbounded pagination. Returned offers MUST be deduplicated by exact advertisement identifier `advNo`; distinct advertisements from the same seller MUST remain distinct.

#### Scenario: Results span the bounded page window

- GIVEN valid matching offers are available on pages 1, 2, and 3
- WHEN a fresh search is performed
- THEN pages are requested in order 1, then 2, then 3
- AND matching offers from all requested pages are returned
- AND no fourth page is requested

#### Scenario: An exhausted response ends retrieval

- GIVEN Binance reports that a requested page has no further results before page 3
- WHEN the search processes that response
- THEN it stops requesting additional pages
- AND it returns the valid accumulated offers without requesting page 4

#### Scenario: Duplicate advertisements are collapsed without merging sellers

- GIVEN the same `advNo` appears on more than one returned page
- AND two different advertisements have different `advNo` values but the same `userNo`
- WHEN the search result is assembled
- THEN the repeated advertisement appears once
- AND each distinct advertisement remains available with its own exact-ad identity

### Requirement: Later-page failures fail closed

If any requested Binance page fails, the search MUST discard the entire in-progress result and MUST NOT expose a partial successful page prefix as live data. It MUST return a same-query stale result when usable stale data exists within the stale window; otherwise it MUST return `unavailable`.

#### Scenario: Page two failure uses same-query stale data

- GIVEN page 1 succeeds and page 2 fails for a fresh search
- AND a usable stale result exists for the same query
- WHEN the search completes
- THEN the page-1 prefix is discarded
- AND the result is marked `stale` and contains only the same-query stale data

#### Scenario: Page three failure without stale data is unavailable

- GIVEN pages 1 and 2 succeed and page 3 fails
- AND no usable same-query stale result exists
- WHEN the search completes
- THEN no partial live result is exposed
- AND the result is marked `unavailable`

### Requirement: Live offers provide distinct labelled handoffs

Each live offer MUST provide a clearly labelled exact-ad destination derived only from its `advNo` and a clearly labelled seller-profile destination derived only from its `userNo`. The two destinations MUST remain distinct, use the verified Binance destination appropriate to each identifier, and preserve safe external-link behavior. The offer-discovery surface MUST NOT substitute a generic Binance market destination for either action.

#### Scenario: A live offer exposes ad and seller actions

- GIVEN a live offer has valid `advNo` and `userNo` identifiers
- WHEN the offer is rendered
- THEN users can distinguish an action to open the exact advertisement from an action to view the seller profile
- AND the exact-ad destination contains only the advertisement identifier in its ad-code position
- AND the seller-profile destination uses the seller identifier in the verified profile destination

#### Scenario: Multiple advertisements by one seller retain exact identity

- GIVEN two live offers share a `userNo` but have different `advNo` values
- WHEN both offers are rendered
- THEN both exact-ad actions remain distinct
- AND each seller-profile action identifies the same seller without replacing either exact-ad action

### Requirement: Stale results are display-only

When the result status is `stale`, the surface MUST be allowed to show offer details and stale status or age, but MUST NOT expose navigable exact-ad or seller-profile actions. Stale offer content MUST NOT navigate through pointer or keyboard activation. Empty and `unavailable` results MUST also be non-actionable.

#### Scenario: Stale offers cannot navigate by pointer

- GIVEN the surface displays a stale offer result
- WHEN a user attempts to click or tap an offer handoff
- THEN no exact-ad or seller-profile navigation occurs

#### Scenario: Stale offers cannot navigate by keyboard

- GIVEN the surface displays a stale offer result
- WHEN a keyboard user tabs through the offer content and activates controls
- THEN no exact-ad or seller-profile control is focusable or activatable

#### Scenario: Empty and unavailable states contain no offer actions

- GIVEN the search result is empty or unavailable
- WHEN the state is rendered
- THEN the surface presents the state without actionable offer destinations

### Requirement: Offer discovery remains authenticated and discovery-only

The `/p2p-offers` route MUST remain the authenticated single offer-discovery surface with its existing route grouping and layout behavior. Offer discovery MUST NOT execute orders, persist offers or searches, add currencies, or introduce a second offer-discovery surface.

#### Scenario: Unauthenticated access retains the existing policy

- GIVEN a user is not authenticated
- WHEN the user requests `/p2p-offers`
- THEN the current authentication policy is enforced
- AND the change does not relocate the route or alter its authentication boundary

#### Scenario: An authenticated user discovers offers without execution

- GIVEN an authenticated user opens `/p2p-offers`
- WHEN the user searches and views an offer
- THEN the user can inspect the offer and its labelled handoffs
- AND no order is executed and no offer or search record is persisted
