# Product Requirements Document (PRD): Mobile UI/UX Polish & Critical Bug Fixes

## 1. Introduction
The mobile experience of the FINTEC application currently suffers from several critical visual bugs that degrade trust and usability. Users report issues with element visibility (header overlaps, invisible user icons) and glitchy page transitions, particularly on Android devices. This initiative aims to polish the mobile UI to ensure a stable, professional, and usable experience.

## 2. Goals
1.  **Ensure Visual Hierarchy:** The Header and its interactive elements (Rate Selector, User Profile) must remain accessible and visible, properly layered above page content.
2.  **Restore Critical UI Elements:** The User Icon must be clearly visible in all themes (Light/Dark).
3.  **Smooth Navigation:** Page transitions on Android must be smooth or simplified to eliminate "cut/glitchy" artifacts.

## 3. User Stories
*   **Story 1 (Header Visibility):** As a mobile user, when I open the Rate Selector or interact with the header, I expect it to stay on top of other content so I can actually use it.
*   **Story 2 (User Profile):** As a user, I want to clearly see my user avatar/icon in the top right corner so I can access my profile settings.
*   **Story 3 (Navigation):** As an Android user, when I tap a link to change pages, I want the transition to be fluid (or instant) rather than seeing a "cut" or broken animation from the previous screen.

## 4. Functional Requirements

### 4.1. Header & Stacking Context
*   **FR-01:** The global **Header** component must have a Z-Index higher than standard page content cards but lower than global modals/overlays.
*   **FR-02:** The **Rate Selector** dropdown (within the header) must correctly manage its z-index context so it doesn't fall behind other "sticky" or "fixed" elements on the page.

### 4.2. User Interface Components
*   **FR-03:** The **User Avatar/Icon** in the header must have high-contrast background and foreground colors.
    *   *Constraint:* Ensure visibility in both Light and Dark modes.
    *   *Fallback:* If the user has no image, the initials fallback must be legible.

### 4.3. Mobile Transitions (Android Specific)
*   **FR-04:** The page transition animation (framer-motion) must be optimized for Android mobile browsers.
    *   *Issue:* Android address bars resize the viewport (`100vh` vs `100dvh`), often causing "jumps" or "cuts" during height-based animations.
    *   *Solution:* Either switch to `dvh` units for the main layout container OR simplify the transition on mobile (e.g., simple Fade instead of Slide) if the glitch persists.

## 5. Non-Goals
*   Redesigning the entire Dashboard layout.
*   Adding new features to the Rate Selector (only fixing its visibility).

## 6. Technical Considerations
*   **Stacking Context:** Check `layout.tsx` and `header.tsx` for `z-index` values. Common issue: `transform` properties on parent containers creating new stacking contexts.
*   **Framer Motion:** Review `AnimatePresence` in `template.tsx` or `layout.tsx`. Check `mode='wait'` vs `mode='sync'`.
*   **Tailwind:** Ensure standard z-index scale is used (e.g., `z-50` for header, `z-40` for content).

## 7. Success Metrics
*   **Visual Check:** Rate Selector is clickable and visible when scrolled down or when other panels are open.
*   **Visual Check:** User Icon is clearly visible on login.
*   **UX Check:** Navigating between tabs on Chrome (Android) feels smooth without layout shifts/cuts.
