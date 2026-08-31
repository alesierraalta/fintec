# Home Summary Visual Hierarchy Specification

## Purpose

Define the observable Home dashboard hierarchy after de-nesting its visual surfaces. Home MUST become easier to scan across desktop and mobile without changing calculations, currency meaning, navigation, actions, loading behavior, or data semantics.

## Requirements

### Requirement: Home sections present a flat visual hierarchy

Home MUST present each current summary section as one coherent surface, with clear headings and section boundaries but without avoidable card shells nested inside other section cards. The affected sections include the summary/hero metrics, spending chart, accounts overview, recent transactions, income sources, and quick actions on both desktop and mobile Home.

#### Scenario: Desktop Home avoids nested card shells

- GIVEN Home is rendered at a desktop width from 1024px through 1440px
- WHEN the summary, spending, accounts, transactions, income sources, and quick-action sections contain content
- THEN each section has one clear visual surface
- AND metric groups and internal rows do not appear as additional card-in-card shells
- AND elevation is reserved for the hero surface and actionable controls

#### Scenario: Mobile Home avoids nested card shells

- GIVEN Home is rendered at 320px, 375px, or 430px
- WHEN the same sections contain content
- THEN the sections remain visually distinct without stacking repeated card shells
- AND internal rows remain scannable without each row becoming a separate card
- AND the page does not acquire horizontal scrolling from the flattened layout

#### Scenario: Section boundaries remain understandable

- GIVEN a user views Home in either theme
- WHEN flat sections are displayed
- THEN headings, spacing, dividers, subtle surface treatment, and focus/interaction states make section and row boundaries understandable without relying on repeated shadows or borders

### Requirement: Internal rows and metrics use calm grouping

Home MUST group related metrics in a shared responsive grid and MUST present list-like rows with dividers or subtle surface distinction rather than repeated row cards. Grouping MUST remain readable at all supported widths without changing item order or content.

#### Scenario: Metrics adapt across the supported range

- GIVEN Home is rendered at any viewport width from 320px through 1440px
- WHEN balance, income, expense, or other existing summary metrics are available
- THEN the metrics use a shared responsive grouping that fits the viewport
- AND labels and values remain associated and readable
- AND no metric is hidden, duplicated, or converted into a different data meaning because the layout changes

#### Scenario: Rows remain scannable on narrow screens

- GIVEN accounts, recent transactions, income sources, or chart details contain multiple rows
- WHEN Home is rendered at 320px or another narrow mobile width
- THEN rows are separated by dividers or subtle surface treatment
- AND row content can wrap or reflow without clipping, overlap, or horizontal scrolling
- AND the existing responsive order is preserved

### Requirement: Home uses a single responsive inset owner

Home MUST use one responsive content inset for each page region. Section and child content MUST NOT accumulate an equivalent outer and inner inset that creates avoidable double padding or reduces the usable width of financial content.

#### Scenario: Content width remains usable at 320px

- GIVEN Home is rendered at a 320px viewport
- WHEN all current sections are loaded
- THEN the effective page inset is applied once for the region
- AND headings, controls, metric values, row content, and currency provenance fit within the available content width without horizontal scrolling

#### Scenario: Desktop spacing does not create cumulative padding

- GIVEN Home is rendered between 1024px and 1440px
- WHEN sections are displayed inside the application shell
- THEN section content does not receive a second equivalent outer inset from both the shell and the section
- AND the resulting whitespace supports scanability without pushing core values or actions unnecessarily below the fold

### Requirement: Financial amounts remain prominent, accurate, and attributable

Financial amounts on Home MUST remain glanceable at a minimum of text-2xl on standard metrics and text-3xl where the existing hero emphasis calls for it, use tabular numerals for aligned amounts, and preserve the amount's currency provenance. The visual change MUST NOT alter calculations, signs, precision, conversion rate source, or display semantics.

#### Scenario: Native currency provenance is preserved

- GIVEN an account or transaction has a native currency such as VES or USD
- WHEN its amount is displayed in the summary, accounts, transactions, chart, or related Home content
- THEN the native currency symbol or code remains unambiguous
- AND a converted/equivalent amount, when currently shown, remains clearly identified as an equivalent rather than replacing the native amount
- AND no amount is presented as USD solely because the layout was flattened

#### Scenario: Converted totals retain their source meaning

- GIVEN Home displays a converted total or live projection
- WHEN the selected rate source or freshness information is part of the existing display behavior
- THEN the source and any existing freshness/disclosure remain available to the user
- AND the refactor does not recalculate the total, change the selected rate source, or imply historical equivalence for a current-rate projection

#### Scenario: Amounts remain readable at narrow widths

- GIVEN Home is rendered at 320px with long currency values or dual-currency values
- WHEN the values are visible
- THEN the amount and its currency provenance remain readable without clipping or overflow
- AND tabular alignment is retained where values are presented as a group
- AND the value is allowed to reflow without being reduced to an ambiguous caption-sized treatment

### Requirement: Amount visibility toggle preserves state and semantics

The existing Home amount visibility control MUST continue to toggle financial values without changing the underlying data or currency provenance. Its current default behavior, pressed state, accessible name, and visual indication MUST remain coherent on desktop and mobile.

#### Scenario: User hides and restores amounts

- GIVEN Home has visible financial values and the amount visibility control is available
- WHEN the user activates the control
- THEN all values governed by the existing visibility policy become hidden or obscured
- AND non-financial labels and currency provenance indicators remain understandable
- AND the control exposes its current state through an accessible pressed/state indication
- WHEN the user activates it again
- THEN the exact same calculated values, signs, currencies, equivalents, and disclosures are restored

#### Scenario: Toggle remains usable across themes and widths

- GIVEN the amount visibility control is rendered from 320px through 1440px in either light or dark theme
- WHEN a keyboard, pointer, or touch user reaches the control
- THEN its label, focus state, contrast, and state indication remain perceivable and its target is at least 44px by 44px

### Requirement: Existing Home data states remain truthful

The visual hierarchy refactor MUST preserve the existing loading, empty, and error behavior for every affected Home section. State-specific content MUST remain associated with its section and MUST NOT be replaced by misleading zero values, stale content, or an empty-looking nested shell.

#### Scenario: Loading state remains clear

- GIVEN a Home data source is loading
- WHEN the affected section is rendered
- THEN its loading indicator or skeleton remains visible and associated with the section
- AND the loading treatment follows the flat hierarchy without introducing repeated nested card shells
- AND no incomplete financial amount is presented as a settled value

#### Scenario: Empty state remains actionable and clear

- GIVEN an affected section has no records
- WHEN Home is rendered
- THEN its existing empty message and available next action remain visible in that section
- AND the empty state does not look like missing or failed content
- AND any available action preserves its existing destination or behavior

#### Scenario: Error state remains truthful

- GIVEN an affected Home data source reports an error
- WHEN the section is rendered
- THEN the section communicates that its data could not be loaded rather than showing fabricated or stale summary values
- AND any existing retry or recovery action remains available and functional
- AND the error treatment is readable in light and dark themes without depending on color alone

### Requirement: Navigation, actions, and data semantics are unchanged

The refactor MUST preserve all existing Home navigation, action handlers, data contracts, item ordering, filters/periods, calculations, and account and transaction semantics.

#### Scenario: Quick actions retain their existing outcomes

- GIVEN a user activates a Home quick action
- WHEN the user selects Registrar Ingreso
- THEN the existing transaction form opens configured for an income
- WHEN the user selects Registrar Gasto
- THEN the existing transaction form opens configured for an expense
- WHEN the user selects Nueva Transacción
- THEN the user is navigated to `/transactions/add`
- WHEN the user selects Transferir
- THEN the user is navigated to `/transfers`

#### Scenario: Existing Home navigation remains available

- GIVEN Home is rendered on desktop or mobile
- WHEN the user activates the existing header shortcut, global new-transaction action, view-all action, transaction row action, account action, or chart period control
- THEN the same destination, modal, scroll target, callback, period, and data result as before the refactor is produced
- AND no action is made unavailable solely because its surrounding card shell was removed

#### Scenario: Data meaning and ordering remain stable

- GIVEN the same accounts, transactions, categories, rates, and loading inputs are supplied before and after the visual change
- WHEN Home is rendered at any supported width
- THEN calculated totals, signs, period selection, account/transaction labels, ordering, category meaning, and currency conversions are unchanged
- AND responsive presentation changes layout only, not the underlying data semantics

### Requirement: Home remains usable in light and dark themes

All affected Home sections, values, states, dividers, surfaces, controls, and focus indicators MUST remain legible and distinguishable in both light and dark themes. Meaningful differences such as income, expense, pending, inactive, loading, empty, and error states MUST NOT rely on color alone.

#### Scenario: Theme switch preserves hierarchy and contrast

- GIVEN Home is rendered with representative populated, loading, empty, and error states
- WHEN the user switches between light and dark themes
- THEN headings, financial values, currency provenance, dividers, controls, and state messages remain readable
- AND the flat surfaces remain distinguishable from the page background without recreating nested card shells
- AND keyboard focus and actionable states remain visible in both themes

### Requirement: Home interactions meet touch and accessibility targets

Every interactive Home control MUST provide a target of at least 44px by 44px and a perceivable hover, focus, pressed, or active state appropriate to the interaction. Flattening MUST NOT make rows, links, toggles, chart controls, quick actions, or mobile actions harder to operate.

#### Scenario: Touch and keyboard interaction remain available

- GIVEN a user operates Home with touch or keyboard from 320px through 1440px
- WHEN the user reaches any existing Home action or control
- THEN its hit target is at least 44px by 44px
- AND it has a visible focus or active indication
- AND keyboard users can operate it in a logical order without focus being trapped or obscured by the flattened layout

## Acceptance Criteria

- [ ] Desktop and mobile Home are visually flat at 320px, 375px, 430px, 768px, 1024px, 1280px, and 1440px, with no avoidable nested card shells in the affected sections.
- [ ] Metrics form a shared responsive grouping; internal list rows use dividers or subtle surface treatment instead of repeated row cards.
- [ ] Elevation is limited to the hero and actionable controls, and each page region has one responsive inset owner with no cumulative outer-plus-inner equivalent padding.
- [ ] Financial amounts use the agreed 2xl/3xl prominence and tabular numerals, remain readable at 320px, and retain native currency provenance plus any existing equivalent/source/freshness disclosure.
- [ ] The amount visibility toggle preserves its existing state behavior, accessible state indication, values, and currency disclosures on desktop and mobile.
- [ ] Loading, empty, and error states remain truthful, section-associated, readable, and usable in light and dark themes.
- [ ] Existing calculations, periods, ordering, routes, modals, callbacks, scroll behavior, account/transaction semantics, and data contracts are unchanged.
- [ ] Every existing interactive Home target is at least 44px by 44px and retains keyboard focus and touch usability.
- [ ] Focused component, accessibility, lint, type, and responsive/visual checks pass according to the repository's configured test and formatting policy.
