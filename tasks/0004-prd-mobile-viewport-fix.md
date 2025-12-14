# Product Requirements Document (PRD): Fix Mobile Viewport Stuck Issue

## 1. Introduction
A critical usability issue affects mobile users (Android and iOS) where closing the virtual keyboard leaves the screen partially unusable. The layout fails to resize back to its full height, leaving a large empty gap where the keyboard was, and often keeping the content pushed up. This state persists until the page is reloaded, effectively breaking the user flow in forms.

## 2. Goals
1.  **Restore Full Layout:** Ensure the application view automatically returns to 100% of the available screen height immediately after the virtual keyboard is dismissed.
2.  **Eliminate Dead Space:** Remove the empty "reserved" space left by the keyboard.
3.  **Restore Scrolling:** Ensure the user can scroll normally after interacting with inputs, without needing a page reload.

## 3. User Stories
*   **Story 1:** As a mobile user filling out a transaction form, after I finish typing the amount and close the keyboard, I want the "Save" button (which was hidden) to slide back down to the bottom of the screen so I can tap it.
*   **Story 2:** As a user on Android/iOS, when I accidentally tap an input and then tap away to close the keyboard, I expect the website to look exactly as it did before, without half the screen being white/black emptiness.

## 4. Functional Requirements

### 4.1. Viewport Management
*   **FR-01:** The application MUST detect when the visual viewport resizes (e.g., keyboard opening/closing).
*   **FR-02:** Upon keyboard dismissal, the main layout container MUST force a height recalculation or reset to fill the current `window.innerHeight`.
*   **FR-03:** The application MUST NOT rely solely on CSS `100vh` if it causes the "stuck" behavior; it should use `100dvh` (dynamic viewport height) or a JavaScript-controlled height style as a fallback.

### 4.2. Input Interaction
*   **FR-04:** When an input loses focus (`blur` event), the window should ideally scroll to reveal the active content properly, or at least ensure the document scroll position is valid (not stuck out of bounds).

## 5. Non-Goals
*   Redesigning the forms themselves.
*   Changing custom keyboard types (numeric vs text).

## 6. Technical Considerations
*   **Visual Viewport API:** The issue is likely a disconnect between the *Layout Viewport* and the *Visual Viewport*. Using the `window.visualViewport` API to set the main container's height explicitly might be necessary.
*   **`position: fixed`:** Check if the layout uses `position: fixed` for the main wrapper. This is a common cause of this bug on mobile browsers when the keyboard triggers a view resize.
*   **`overflow: hidden`:** The project currently uses `overflow: hidden` on `html/body` (seen in `globals.css`). This prevents the browser's native scroll recovery behavior. We may need to toggle this or manage overflow manually on the main container.
*   **Hook Implementation:** Consider creating a `useMobileViewportFix` hook that listens to `resize` and `scroll` events to force a layout update.

## 7. Success Metrics
*   **Pass:** User opens keyboard -> types -> closes keyboard -> layout snaps back to full height immediately ( < 300ms).
*   **Fail:** User closes keyboard -> layout remains stuck with empty space for > 1s or indefinitely.

## 8. Open Questions
*   Does this happen on specific inputs (e.g., specific libraries) or standard HTML inputs? (User said "any form", implying standard inputs).
