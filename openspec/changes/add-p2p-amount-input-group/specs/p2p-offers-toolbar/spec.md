# Delta for P2P Offers Toolbar

## ADDED Requirements

### Requirement: P2P amount controls form one readable input group

The amount filter MUST render as one bordered flex group with a static currency cell, a borderless amount input, and an attached unit-toggle segment. Amount text MUST NOT be positioned beneath the currency cell or unit toggle.

#### Scenario: Amount text is entered on a narrow viewport

- GIVEN the P2P toolbar is rendered at a narrow viewport and the amount input contains text that can scroll horizontally
- WHEN the user enters or edits the amount
- THEN the `$` marker remains visible in its own cell, the amount text remains readable in the input area, and no text passes beneath the VES/USDT segment

#### Scenario: Amount unit is switched

- GIVEN the amount group is rendered with either VES or USDT selected
- WHEN the user selects the other unit
- THEN the selected unit changes through the existing control, the input remains usable, and the attached segment does not cover or obscure the amount text

### Requirement: Amount group communicates focus and currency clearly

The amount group MUST use a visible `focus-within` treatment, and its `$` marker MUST use high-contrast `text-foreground` styling rather than muted text. The amount input MUST retain its accessible label, numeric input behavior, and existing value/change semantics.

#### Scenario: User focuses the amount field

- GIVEN the user tabs to or clicks the amount input
- WHEN the input receives focus
- THEN the group shows the focus treatment while the `$` marker and amount remain legible

#### Scenario: User navigates the unit controls by keyboard

- GIVEN the user tabs through the amount group
- WHEN focus reaches a VES or USDT button
- THEN the button has a visible focus state, exposes its pressed state, and can be activated without changing the input's existing parsing behavior

### Requirement: Toolbar controls share a cohesive responsive treatment

The P2P toolbar MUST preserve all existing controls while applying the intended visual cohesion pass: consistent `h-[52px]` control heights and radii, clear primary/secondary separation, and hover/active states for the embedded unit toggle. The conversion hint MUST remain aligned below the amount field.

#### Scenario: Toolbar is viewed across supported widths

- GIVEN the toolbar is rendered at 390, 768, 1000, or 1280px
- WHEN the user views or interacts with the controls
- THEN controls remain within the toolbar without horizontal overlap, retain the responsive layout, and preserve readable labels and affordances

#### Scenario: User hovers or selects a unit

- GIVEN a unit button is inactive or active
- WHEN the pointer hovers it or the unit is selected
- THEN the button presents a distinct hover or active state without changing the existing search/conversion rules

## MODIFIED Requirements

### Requirement: Amount field no longer relies on overlay spacing

The existing amount-field requirement is modified so that the `$` marker and VES/USDT selector are structural siblings of the input rather than absolutely positioned overlays. Implementations MUST remove the overlay-dependent right padding (`pr-[124px]` pattern) and MUST keep the input group border, divider, and focus treatment coherent as one control.

#### Scenario: Input content grows beyond the visible area

- GIVEN the amount input contains content wider than its available width
- WHEN the browser scrolls the input horizontally
- THEN the content is clipped only by the input's own viewport and remains independent of both adjacent static cells

#### Scenario: Conversion hint is available

- GIVEN a valid amount and rate produce a conversion hint
- WHEN the hint is rendered
- THEN it appears directly beneath the amount group, aligned with the amount-field column, and does not alter the group height or overlay its controls

#### Scenario: Existing search behavior is exercised

- GIVEN the user enters an amount and presses Buscar ofertas, or changes the unit after results are shown
- WHEN the existing handlers run
- THEN the same query/conversion and automatic re-search behavior is preserved; this change only alters layout, styling, and structural semantics
