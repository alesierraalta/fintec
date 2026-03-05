# Delta for UI

## ADDED Requirements

### Requirement: Mobile Transaction Rows Reveal Swipe Actions on Horizontal Drag

The system MUST reveal transaction row swipe actions on mobile when the user performs an intentional horizontal drag gesture across the row.

#### Scenario: Horizontal drag reveals row actions

- GIVEN a transaction row on `/transactions` in a mobile viewport
- WHEN the user drags horizontally past the row swipe reveal threshold
- THEN the row reveals its swipe actions
- AND the row remains in the revealed state until a close interaction occurs

#### Scenario: Vertical scroll does not trigger swipe reveal

- GIVEN a transaction row on `/transactions` in a mobile viewport
- WHEN the user performs a primarily vertical scrolling gesture with minor horizontal jitter
- THEN the row does not reveal swipe actions

### Requirement: Tap and Swipe Gestures Are Mutually Exclusive Per Interaction

The system MUST treat tap/click and horizontal swipe as mutually exclusive outcomes for a single pointer interaction on swipeable rows.

#### Scenario: Tap opens row details when no meaningful horizontal drag occurs

- GIVEN a closed swipeable transaction row with a tap/click handler
- WHEN the user performs a tap interaction without meaningful horizontal drag
- THEN the row tap/click behavior executes as expected

#### Scenario: Swipe interaction suppresses same-gesture tap handling

- GIVEN a swipeable transaction row with both swipe and tap/click behavior
- WHEN the user performs a horizontal drag that qualifies as a swipe interaction
- THEN swipe state changes are applied for that interaction
- AND tap/click behavior is not executed for that same interaction

### Requirement: Mobile Swipe Hint Must Not Obscure Transaction Currency Labels

The system SHALL present swipe affordance hints on mobile transaction rows without overlapping or obscuring right-aligned currency labels.

#### Scenario: Hint and currency remain visually separated on narrow rows

- GIVEN a mobile transaction row with a visible swipe hint and a right-aligned currency label
- WHEN the row is rendered at constrained mobile widths
- THEN the swipe hint and currency label remain visually distinct
- AND both elements remain legible

#### Scenario: Swipe hint behavior preserves discoverability under tight space

- GIVEN a mobile transaction row with limited horizontal space
- WHEN the layout cannot display both hint and currency in the same position without overlap
- THEN the row uses a non-overlapping hint presentation strategy
- AND swipe discoverability remains available to the user

### Requirement: Shared Swipeable Consumers Preserve Existing Interaction Expectations

The system MUST preserve expected interaction behavior for other components that use the shared swipeable interaction pattern after transaction-row swipe fixes are introduced.

#### Scenario: Account swipe cards retain expected tap and swipe behavior

- GIVEN an account card component that uses the shared swipeable interaction pattern
- WHEN the account card is used in mobile viewport interactions
- THEN account card tap and swipe behaviors remain functional according to prior expectations

#### Scenario: Non-target surfaces avoid unintended behavior drift

- GIVEN a screen that uses shared swipeable interactions outside `/transactions`
- WHEN swipe and tap interactions are exercised after the transaction-row fix
- THEN interaction outcomes remain consistent with existing expected behavior
