# UI Specification

## Purpose

Define required mobile UI layout and overlay behavior so fixed and sticky interactions remain stable during browser chrome changes, overlays render in reliable layers, pages respect dynamic viewport height, and modal footer actions remain clear of device safe-area insets.

## Requirements

### Requirement: Stable Fixed and Sticky Behavior Under Mobile Chrome Changes

The system MUST keep fixed and sticky UI elements visually stable during mobile browser chrome expand/collapse and virtual keyboard open/close transitions.

#### Scenario: Fixed and sticky elements remain anchored during chrome collapse

- GIVEN a mobile page with sticky header and fixed-position UI elements
- WHEN browser chrome collapses or expands while the user scrolls
- THEN sticky and fixed elements remain anchored to their intended viewport positions
- AND no duplicate vertical scroll context causes visible jump or offset drift

#### Scenario: Keyboard transition does not destabilize fixed or sticky layout

- GIVEN a mobile page with an input field and fixed or sticky UI controls
- WHEN the on-screen keyboard opens and then closes
- THEN fixed and sticky UI controls return to their expected positions without overlap or jump

### Requirement: Header-Context Overlays Render in Stable Top-Level Layers

The system SHALL render overlays triggered from header contexts in a top-level layer that is not affected by sticky or filtered ancestor contexts.

#### Scenario: Header-triggered overlay positions correctly

- GIVEN a header action that opens an overlay on mobile
- WHEN the overlay is opened from within a sticky header context
- THEN the overlay is positioned relative to the viewport as designed
- AND the overlay backdrop covers the intended interaction area

#### Scenario: Header overlay stacking remains correct with other surfaces

- GIVEN a mobile view where a header-triggered overlay and another high-priority surface may coexist
- WHEN both surfaces are rendered in sequence
- THEN the header-triggered overlay respects defined layering order
- AND interactive focus remains on the top-most active surface

### Requirement: Mobile Pages Use Viewport-Height-Safe Layout Behavior

Mobile-facing pages MUST use viewport-height-safe layout behavior that tracks dynamic viewport changes instead of assuming a static full-screen height.

#### Scenario: Mobile page fills visible viewport without clipping

- GIVEN a mobile-facing page that must fill the available screen height
- WHEN the page is rendered on a mobile browser with dynamic chrome
- THEN the page content area matches the visible viewport height
- AND primary content and actions remain reachable without unintended clipping

#### Scenario: Viewport-height behavior does not regress desktop layout

- GIVEN a responsive page that is mobile-facing but also accessible on desktop
- WHEN the page is viewed at desktop breakpoints
- THEN desktop layout behavior remains consistent with prior expected structure
- AND viewport-height-safe behavior applies only where required for mobile stability

### Requirement: Mobile Full-Screen Modal Footers Respect Safe Area Insets

The system MUST ensure full-screen mobile modal footers keep primary actions above bottom safe-area insets.

#### Scenario: Modal footer actions stay above safe-area inset

- GIVEN a full-screen mobile modal with footer actions
- WHEN the modal is displayed on a device with a non-zero bottom safe-area inset
- THEN footer actions are fully visible and tappable above the inset
- AND no primary action is obscured by device UI regions

#### Scenario: Safe-area handling remains correct with keyboard and scrolling

- GIVEN a full-screen mobile modal with a footer action area and editable fields
- WHEN the keyboard opens and the modal content scrolls
- THEN footer action visibility and tappable area remain intact
- AND safe-area spacing remains applied after keyboard dismissal

### Requirement: Logo Image Rendering Contract Preserves Ratio and Responsiveness

All `/finteclogodark.jpg` render paths MUST follow a single image sizing contract that preserves intrinsic aspect ratio, avoids conflicting dimension instructions, and remains responsive across app and marketing layouts.

#### Scenario: Logo renders without width-height mismatch warnings

- GIVEN a page that renders `/finteclogodark.jpg` in sidebar, header, or marketing surfaces
- WHEN the page is rendered in a supported browser and viewport
- THEN logo rendering preserves the intended aspect ratio
- AND runtime output does not emit image width-height mismatch warnings for that render path

#### Scenario: Responsive states keep logo visually consistent

- GIVEN responsive layout states such as expanded and collapsed navigation
- WHEN the viewport or layout state changes
- THEN the logo remains legible and proportionally scaled
- AND layout changes do not distort the logo image

### Requirement: Reduced-Motion Policy Is Centralized and User-Respecting

The application MUST provide one centralized reduced-motion policy boundary for motion behavior, and all route surfaces SHALL inherit that policy so motion behavior consistently respects user and device reduced-motion preferences.

#### Scenario: Motion behavior respects reduced-motion user preference globally

- GIVEN a user or device configured to prefer reduced motion
- WHEN the user navigates through auth, app, and marketing routes
- THEN motion behavior is reduced according to policy on each route
- AND route-level components do not require duplicate local policy boundaries to achieve compliance

#### Scenario: Routes without local policy wrappers remain compliant

- GIVEN a route component that uses motion effects but defines no local reduced-motion wrapper
- WHEN the route is rendered under normal app providers
- THEN the component inherits the centralized reduced-motion policy
- AND behavior remains consistent with the current user/device preference

### Requirement: UI Runtime Tests Validate Contract Outcomes

UI-related automated tests SHOULD assert runtime contract outcomes for logo rendering and reduced-motion inheritance, and SHOULD avoid assertions tied to fragile internal implementation placement.

#### Scenario: Centralized policy refactor keeps tests stable

- GIVEN tests that verify motion preference outcomes at route level
- WHEN reduced-motion provider placement changes but inherited behavior is unchanged
- THEN tests continue to pass because observable outcomes remain correct

#### Scenario: Contract regression fails behavior-focused test

- GIVEN a change that reintroduces logo distortion or ignores reduced-motion preferences
- WHEN UI runtime tests execute
- THEN tests fail on violated rendering or motion outcomes
- AND failure does not require checking exact component-tree internals
