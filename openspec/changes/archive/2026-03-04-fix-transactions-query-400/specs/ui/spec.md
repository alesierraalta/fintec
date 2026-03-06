# Delta for UI

## ADDED Requirements

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
