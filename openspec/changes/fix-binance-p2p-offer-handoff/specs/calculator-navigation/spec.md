# Calculator Navigation Specification

## Purpose

Keep the integrated Binance rates calculator focused on rate/reference information while directing offer discovery to the dedicated authenticated surface.

## Requirements

### Requirement: Integrated calculator is a rate/reference surface

The integrated Binance rates calculator MUST retain its existing Binance rate, loading/error, freshness, and status/reference presentation required by its callers. It MUST NOT contain interactive Buy/Sell P2P search controls, amount or payment inputs, search submission behavior, offer lists, P2P search state, or per-offer Binance handoffs.

#### Scenario: Calculator renders rate/reference information without an offer explorer

- GIVEN the integrated calculator receives its Binance rate snapshot
- WHEN the public rate cockpit or accounts rates panel renders it
- THEN the calculator presents the applicable rate and status/reference information
- AND it contains no interactive P2P search section or offer list

#### Scenario: Existing rate states remain represented

- GIVEN the supplied Binance rate is loading, available, refreshed, or unavailable
- WHEN the integrated calculator renders
- THEN the corresponding existing rate/status behavior remains represented
- AND no P2P search interaction is introduced to handle that state

### Requirement: Calculator offers one internal path to offer discovery

Each rendered integrated Binance rates calculator MUST expose exactly one clear internal call to action whose destination is `/p2p-offers`. The call to action MUST be the only calculator-provided offer-discovery handoff and MUST NOT point to `/calculator`, a generic Binance market URL, or an individual offer.

#### Scenario: Public rate cockpit directs users to the dedicated surface

- GIVEN the integrated calculator is rendered in the public rate cockpit
- WHEN a user chooses to discover P2P offers
- THEN the single calculator call to action navigates internally to exactly `/p2p-offers`

#### Scenario: Accounts rates panel directs users to the dedicated surface

- GIVEN the integrated calculator is rendered in the accounts rates panel
- WHEN a user chooses to discover P2P offers
- THEN the single calculator call to action navigates internally to exactly `/p2p-offers`

#### Scenario: Calculator does not provide forbidden destinations

- GIVEN the integrated calculator is rendered
- WHEN its available links and actions are inspected
- THEN it contains no link to `/calculator`, a generic Binance market, or an individual offer
- AND it contains no second offer-discovery CTA

### Requirement: Removing the embedded explorer does not redesign unrelated calculator behavior

The calculator change MUST be limited to removing the duplicated P2P explorer and adding the single `/p2p-offers` CTA. It MUST NOT add new currencies, persistence, order execution, route-group changes, authentication-policy changes, generic-market fallback, unbounded pagination, or unrelated calculator or rates/history redesign.

#### Scenario: Callers retain their existing calculator contract

- GIVEN either current calculator caller supplies the existing Binance rate snapshot contract
- WHEN the simplified calculator is rendered
- THEN the caller continues to receive the rate/reference surface without requiring P2P offer data
- AND no unrelated calculator or account behavior changes
