# Public Landing Specification

## Purpose

Define the verifiable behavior of the public FinTec landing page after `landing-revamp`. The page MUST position FinTec as a personal-finance product first, retain rates as one honest secondary utility, work across the required viewport matrix, and produce a privacy-safe baseline for funnel diagnosis.

This change is specified as one `landing` domain because no canonical landing, rates, or funnel specification exists under `openspec/specs/`. The proposal's three modified capabilities are therefore represented in this domain; this is an explicit domain assumption.

## Definitions

- **Rate Cockpit:** the single public landing surface that presents rate summaries and exposes BCV and P2P details through explicit source selection or disclosure.
- **Observed at:** the timestamp of the last successful observation of a value from its named source. Render time MUST NOT be used as the observation timestamp.
- **Rate age:** elapsed time between the current time and `observedAt`, calculated from a valid timestamp. The UI MUST show a human-readable age or an explicit unknown-age state.
- **Fresh:** a value from the named source whose `observedAt` is no more than 15 minutes old.
- **Aging/stale:** a value from the named source whose `observedAt` is more than 15 minutes old, or whose age cannot be validated. It MAY remain visible, but MUST NOT be represented as live or fresh.
- **Fallback:** a value not obtained from the current source observation, including cached or static recovery data. Fallback MUST be labeled independently from freshness and MUST NOT be presented as current.
- **Demo:** illustrative landing content that is not a live product value. Demo content MUST be visibly labeled as demo.
- **Primary CTA:** the hero action that starts an outcome inside FinTec, such as creating an account to create a first budget or record a first movement.

## Requirements

### Requirement: Finance-first narrative and evidence

The landing MUST identify FinTec as a personal-finance product for Venezuela before or alongside the primary hero action. The primary CTA MUST be outcome-oriented and lead into FinTec. A rates route MAY be visible as a secondary CTA, but it MUST not have equal visual or semantic priority. The hero decision canvas MUST connect movement, budget, and decision without presenting decorative data as live data.

The landing MUST contain one evidence section based only on verifiable product facts, such as plan limits, explained security behavior, or explicitly labeled beta status. It MUST NOT repeat BCV/P2P rates as stats, invent user metrics, or present fabricated testimonials.

#### Scenario: A visitor sees the intended product hierarchy

- GIVEN a visitor loads the landing at a supported viewport
- WHEN the first viewport and its primary actions are rendered
- THEN the visitor can identify FinTec as a finance-management product
- AND the primary CTA describes an outcome inside FinTec
- AND the rates route is visibly secondary

#### Scenario: Demo content cannot be mistaken for live rates

- GIVEN the hero contains illustrative transaction, budget, or decision values
- WHEN the decision canvas is rendered
- THEN it is labeled as demo or illustrative
- AND it does not use live-rate language or a live source status

#### Scenario: Evidence is publishable without invented authority

- GIVEN the evidence section is rendered
- WHEN its claims are reviewed against available product facts
- THEN every claim is verifiable or explicitly marked as beta/demo/limitation
- AND no redundant BCV/P2P stat or invented testimonial is present

### Requirement: One canonical Rate Cockpit

The landing MUST expose rates through exactly one canonical Rate Cockpit. The cockpit MUST show, in its initial summary, the selected source, current available value when present, source name, observed-at information, rate age/freshness state, and the next relevant action. BCV and P2P MUST remain available through explicit tabs, segments, or disclosure controls without rendering duplicate rate cards elsewhere on the landing.

The cockpit MUST preserve relevant source warnings and the external Binance destination when P2P details require it. The external destination MUST be clearly identified as leaving FinTec.

Within one landing page visit, one owner MUST coordinate Binance data and its visible state. The landing MUST NOT independently present duplicate Binance loading, error, retry, or fetch states for the same source.

#### Scenario: The cockpit is the only rates surface

- GIVEN a visitor scans the landing from hero through footer
- WHEN all public sections are rendered
- THEN there is one Rate Cockpit
- AND hero, evidence, and feature content do not present BCV/P2P as separate rate tools or repeated stats

#### Scenario: Source details are progressively disclosed

- GIVEN the Rate Cockpit is visible
- WHEN no source interaction has occurred
- THEN the summary remains readable without the full P2P offer/search detail
- WHEN the visitor selects BCV or P2P or opens a detail disclosure
- THEN the selected details become available without navigating to a second landing rate surface

#### Scenario: P2P departure is explicit

- GIVEN a visitor activates the Binance destination
- WHEN the navigation action is presented or activated
- THEN the UI identifies Binance as an external destination
- AND the relevant warning remains available
- AND the action is measurable by the analytics contract

### Requirement: Explicit rate state and freshness behavior

The Rate Cockpit MUST represent the following states independently for each source: `loading`, `fresh`, `aging`, `fallback`, and `error`. A source MAY expose both a value and an error; in that case the value MUST remain visibly marked as aging or fallback and the error/retry affordance MUST also be available.

The cockpit MUST apply these rules:

1. `loading`: show a stable loading state and no unqualified numeric value.
2. `fresh`: show the value, source, and age; the UI MAY use a live/fresh label.
3. `aging`: show the value, source, and age; the UI MUST state that it is not fresh/live.
4. `fallback`: show the available value only with a fallback label, age if known, and a warning that it is not a current source observation.
5. `error` with no value: show an actionable error message and retry control; do not substitute an unlabeled number.
6. `error` with a retained value: preserve the value with its age and stale/fallback labeling, show the error, and provide retry.
7. A successful retry MUST replace the prior state and age with the new source observation only after the response is validated.
8. Invalid, future, or missing timestamps MUST produce an explicit unknown-age/non-fresh state; the UI MUST NOT infer freshness from render time.

A rate is **fresh** only when `now - observedAt <= 15 minutes` and `observedAt` is valid. Age calculations MUST use a consistent absolute time basis. The 15-minute threshold is the product definition for the first launch and MUST be visible in tests and analytics interpretation; changing it requires an updated specification.

#### Scenario: Fresh data is labeled with its observation age

- GIVEN a source returns a valid value with an `observedAt` timestamp 5 minutes in the past
- WHEN the cockpit renders the source summary
- THEN it shows the value, source, and approximately 5-minute age
- AND it may identify the value as fresh/live

#### Scenario: Aging data remains useful but honest

- GIVEN a source returns a valid value with an `observedAt` timestamp 20 minutes in the past
- WHEN the cockpit renders the source summary
- THEN it retains the value
- AND it shows the age and an aging/stale state
- AND it does not label the value fresh/live

#### Scenario: Fallback is distinguishable from a current observation

- GIVEN the current source request fails and a fallback value is available
- WHEN the cockpit renders the source summary
- THEN it shows the value only with a fallback label and age information when available
- AND it shows the failure/retry state
- AND it does not claim that the value is current or live

#### Scenario: Failure without a value is actionable

- GIVEN the current source request fails and no value is available
- WHEN the cockpit renders the source summary
- THEN it shows an error message understandable without technical terminology
- AND it exposes a keyboard-accessible retry action
- AND it does not show a fabricated or unlabeled numeric rate

#### Scenario: Retry recovers a failed source

- GIVEN a source is in error or fallback state
- WHEN the visitor activates retry and the source returns a valid observation
- THEN the cockpit shows the new value and source observation age
- AND the previous error/fallback label is removed from the current value
- AND one recoverable state transition is measurable

### Requirement: Responsive landing and cockpit layout

The landing MUST be usable at 320, 375, 390, and 430 CSS pixels wide, and at iPad portrait and landscape sizes. It MUST have no real horizontal overflow: for the document and the Rate Cockpit, `scrollWidth` MUST NOT exceed `clientWidth` at any required viewport after fonts and data states settle.

The cockpit MUST remain a single readable column at all phone widths and in iPad portrait. It MAY use multiple columns in iPad landscape or larger containers only when each column preserves readable headings, values, controls, warnings, and actions; the layout MUST NOT choose two columns solely because a generic tablet breakpoint was crossed.

The responsive experience MUST:

- keep headings, freshness labels, limits, offer metadata, and errors wrap-safe;
- keep interactive controls at least 44 by 44 CSS pixels;
- render editable inputs at 16 CSS pixels or larger on mobile;
- stack controls and actions when inline placement would compress or overlap them;
- preserve usable spacing and reading order rather than shrinking content to fit;
- respect safe-area insets for any sticky, fixed, or full-screen interactive surface; and
- avoid nested surfaces and accumulated padding that make the cockpit difficult to read.

#### Scenario: Phone viewport matrix has no overflow

- GIVEN the landing is loaded at 320, 375, 390, and 430 CSS pixels wide
- WHEN the hero, evidence, cockpit, pricing, and footer are rendered in loading, success, fallback, and error states
- THEN the document and cockpit have no horizontal overflow
- AND no control, status, warning, or CTA overlaps another control

#### Scenario: iPad portrait prioritizes readable stacking

- GIVEN the landing is loaded in iPad portrait
- WHEN the Rate Cockpit is rendered with BCV and P2P controls available
- THEN the cockpit remains a single readable column
- AND all source controls, status labels, and actions remain usable without compressed wrapping

#### Scenario: iPad landscape uses space only when it is sufficient

- GIVEN the landing is loaded in iPad landscape
- WHEN the available cockpit container width is sufficient for two readable regions
- THEN the cockpit MAY use multiple columns
- BUT if either region would become compressed, the cockpit remains stacked

### Requirement: Accessible interaction and status communication

The landing MUST meet WCAG 2.2 AA expectations for its changed content and interactions. It MUST use a logical heading hierarchy and landmarks, expose all actions and links to keyboard users, provide a visible focus indicator, and preserve an understandable reading order at every viewport.

The BCV/P2P selector MUST expose an accessible tab or disclosure pattern with programmatic selected/expanded state, keyboard navigation, and a visible active state that is not conveyed by color alone. Loading, freshness, fallback, retry, and error status MUST be available to assistive technology without repeatedly interrupting unrelated reading. Error messages MUST be associated with the affected control or region.

External Binance navigation MUST be announced as external. Decorative signal artwork MUST be hidden from assistive technology or provided with an equivalent non-decorative explanation. The experience MUST honor `prefers-reduced-motion` by removing or minimizing non-essential animation and preserving all state changes without motion.

#### Scenario: Keyboard navigation covers the cockpit

- GIVEN a keyboard user reaches the Rate Cockpit
- WHEN the user tabs through the selector, disclosure, converter, retry, and external link
- THEN every interactive control receives a visible focus state
- AND the user can select or open each available function without a pointer
- AND focus is not moved into an unavailable or hidden panel

#### Scenario: Rate state is announced without color dependence

- GIVEN a source changes from loading to fresh, aging, fallback, or error
- WHEN the status is rendered
- THEN the state has text and an accessible semantic association with the source
- AND the state is not communicated by color alone

#### Scenario: Reduced motion preserves comprehension

- GIVEN the visitor has enabled `prefers-reduced-motion: reduce`
- WHEN the landing enters, the cockpit changes source, or a rate state changes
- THEN non-essential motion is disabled or minimized
- AND the same content and status remain available without animation timing dependencies

### Requirement: Editorial glass visual language without deceptive data graphics

Changed landing surfaces MUST remain consistent with FinTec's glass visual language and semantic design tokens. The redesign MUST use one dominant surface per major block where possible, with restrained depth, borders, and shadows rather than nested glass cards that compete for attention.

The hero MUST include an editorial decision canvas and a market-pulse visual connection to the cockpit. The pulse MUST be decorative or explicitly illustrative; it MUST NOT imply a historical financial chart, a forecast, or a live market signal unless backed by corresponding source data. Financial values MUST remain legible with tabular alignment, and status/action colors MUST have text equivalents.

#### Scenario: Decorative pulse is not interpreted as market data

- GIVEN the hero pulse is displayed without a live series behind it
- WHEN a visitor or assistive technology encounters it
- THEN it is visually and semantically identified as illustrative/decorative
- AND it does not imply a live price movement or forecast

### Requirement: Lazy rate loading and first-render independence

The landing MUST keep the secondary rates utility from blocking the initial narrative render. Rates MUST load when the cockpit is near the viewport or through an equivalent supported visibility trigger. If the browser does not support the visibility trigger, the cockpit MUST still load and expose the same loading, success, fallback, error, and retry semantics.

The landing MUST not issue duplicate Binance work for the same visible cockpit state. A rate-loading failure MUST NOT prevent the hero, evidence, registration CTA, or pricing content from rendering and remaining actionable.

#### Scenario: Rates do not block the first narrative render

- GIVEN a visitor loads the landing while the cockpit is outside the near-viewport range
- WHEN the initial page is rendered
- THEN the hero and primary registration path are usable without waiting for rate data
- AND the rate request is deferred until the cockpit is near the viewport or the supported fallback path applies

#### Scenario: Visibility-trigger fallback remains usable

- GIVEN the browser does not provide the expected visibility observer
- WHEN the landing loads
- THEN the cockpit still requests or exposes its rate loading path
- AND the visitor can reach a resolved, fallback, or retryable state
- AND the primary landing content remains unaffected

### Requirement: Privacy-safe funnel and rate observability

The landing MUST emit the following analytics events through the existing analytics adapter, using stable names and a versioned contract without blocking navigation or rendering:

| Event | Emit when | Required properties | Prohibited properties |
| --- | --- | --- | --- |
| `landing_hero_cta_click` | The primary hero CTA is activated | `cta_id`, `destination`, `contract_version` | email, name, account id, raw form values |
| `rate_cockpit_view` | The cockpit first becomes visible in the page session | `source_default`, `contract_version` | rate value, user identifiers |
| `rate_source_select` | The visitor selects BCV or P2P | `source`, `previous_source`, `contract_version` | rate value, user identifiers |
| `rate_cockpit_interaction` | The visitor opens a detail, converter, or refresh action | `interaction`, `source`, `contract_version` | form values, user identifiers |
| `register_start` | The visitor enters the registration flow or submits the first registration action, according to the existing adapter's agreed definition | `entry_point`, `contract_version` | email, name, password, account id |
| `register_complete` | The authentication flow confirms account creation | `entry_point`, `contract_version` | email, name, password, account id |
| `binance_exit_click` | The visitor activates the external Binance destination | `source`, `contract_version` | user identifiers, offer-personal data |
| `rate_state_change` | A source enters `loading`, `fresh`, `aging`, `fallback`, or `error` after initial render or user action | `source`, `state`, `has_value`, `contract_version` | rate value, user identifiers |
| `rate_retry_click` | The visitor activates retry for a source | `source`, `contract_version` | user identifiers |

Events MUST be emitted once per defined activation or state transition, not repeatedly on render due to re-renders. The adapter MUST tolerate unavailable analytics without breaking the page. Registration completion MUST represent confirmed account creation rather than a click or route load, and the implementation MUST document the adapter-specific confirmation point before release.

The launch MUST establish a baseline of these events before any percentage conversion target or A/B conclusion is declared. The current sample of 22 visits MUST NOT be used as a statistically meaningful uplift target.

#### Scenario: Primary and secondary funnel signals are distinguishable

- GIVEN a visitor activates the hero CTA, selects a rate source, starts registration, and completes registration
- WHEN the analytics adapter receives the actions
- THEN it receives the corresponding stable event names
- AND `register_start` and `register_complete` are distinguishable
- AND the payloads contain no personal data

#### Scenario: External exit and failure are measurable

- GIVEN a visitor activates Binance or a rate request enters fallback/error
- WHEN the action or state transition occurs
- THEN the corresponding exit or rate-state event is emitted with source and state context
- AND the UI action remains usable if analytics delivery fails

#### Scenario: Re-render does not inflate funnel counts

- GIVEN the page re-renders while a visitor remains on the landing
- WHEN no new user action or rate state transition occurs
- THEN no duplicate CTA, cockpit interaction, registration, or state-transition event is emitted

### Requirement: Behavioral verification is part of the change

The changed landing behavior MUST have automated behavioral coverage before release, following the repository's strict TDD configuration. Tests MUST cover the Rate Cockpit state model and freshness threshold, source selection/disclosure, retry and retained-value error behavior, analytics payloads and deduplication, keyboard accessibility, reduced motion behavior, lazy-load fallback, and the required viewport matrix.

End-to-end validation MUST assert the absence of horizontal overflow and control overlap at 320, 375, 390, 430 CSS pixels and iPad portrait/landscape equivalents. The validation MUST exercise loading, fresh, aging, fallback, and error states. Type checking, linting, formatting, unit/integration tests, and relevant E2E tests MUST pass according to `openspec/config.yaml` before the change is accepted.

#### Scenario: Required viewport and state matrix is verified

- GIVEN automated tests run the public landing against the required viewport matrix
- WHEN the cockpit is exercised in loading, fresh, aging, fallback, and error states
- THEN the tests confirm no document or cockpit horizontal overflow
- AND the tests confirm all required actions remain reachable
- AND the tests confirm state labels and retry behavior are visible and accessible

#### Scenario: Analytics contract is verified behaviorally

- GIVEN analytics is replaced with a test adapter
- WHEN the visitor performs the defined funnel and rate interactions
- THEN the adapter receives the expected event names and required properties
- AND it receives no prohibited personal data
- AND duplicate renders do not create duplicate events

## Non-Functional Acceptance Criteria

- **Trust:** No live-looking demo, fallback, aging value, or decorative pulse is presented without its appropriate label or semantic treatment.
- **Responsive quality:** The required viewport matrix has no horizontal overflow, clipped actionable content, or overlapping controls.
- **Accessibility:** Changed interactions are keyboard-complete, screen-reader understandable, focus-visible, reduced-motion compatible, and WCAG 2.2 AA-oriented.
- **Performance:** The hero and primary registration path render independently of deferred rates; rate loading remains secondary and failure-isolated.
- **Observability:** Event names and payload fields are stable, privacy-safe, deduplicated, and sufficient to distinguish intent, registration start/completion, external exit, and rate failure/fallback.
- **Maintainability:** The landing has one visible Rate Cockpit and one Binance state owner for that surface; unrelated authenticated flows and global rate-hook semantics remain unchanged.
- **Verification:** The configured formatter, lint, typecheck, unit/integration, E2E, performance, and mutation gates are not weakened to accept the change.

## Acceptance Checklist

- [ ] The hero communicates finance management first and has one outcome-oriented primary CTA.
- [ ] Rates are secondary and appear through one canonical Rate Cockpit only.
- [ ] BCV and P2P source selection, disclosure, warning, and external Binance exit are usable.
- [ ] `loading`, `fresh`, `aging`, `fallback`, and `error` states follow the defined rules.
- [ ] Freshness is calculated from a valid `observedAt` and the 15-minute threshold is covered by tests.
- [ ] Demo content, beta status, limits, security claims, and fallback values are honestly labeled.
- [ ] 320/375/390/430 widths and iPad portrait/landscape pass overflow and overlap checks.
- [ ] Interactive targets are at least 44 by 44 CSS pixels and mobile inputs are at least 16 CSS pixels.
- [ ] Keyboard, screen-reader status, focus, external-link, and reduced-motion behavior are covered.
- [ ] Required analytics events arrive without PII, duplicate emissions, or navigation/render blocking.
- [ ] `register_start` and confirmed `register_complete` are distinguishable.
- [ ] Deferred rates do not block the first render and observer fallback remains usable.
- [ ] Configured quality gates pass without reducing existing thresholds.
