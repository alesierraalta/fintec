# Task List: Mobile UI/UX Polish

## Context
Fixing critical mobile UI issues: Header z-index overlap, invisible User Icon, and glitchy Android page transitions.

## Tasks

### 1. Analysis & Reproduction
- [ ] **Analyze Header Styles:** Review `components/layout/header.tsx` and `globals.css` to understand current stacking contexts.
- [ ] **Locate Page Transitions:** Identify where `AnimatePresence` or `motion.div` page transitions are defined (likely `app/template.tsx`, `components/layout/main-layout.tsx` or `app/layout.tsx`).
- [ ] **Check User Avatar:** Inspect `components/layout/header.tsx` to see how the user icon is rendered (image vs fallback) and its current styling classes.

### 2. Implementation: Header & Z-Index
- [ ] **Fix Header Z-Index:** Update `components/layout/header.tsx` (or the relevant layout wrapper) to ensure `z-50` (or appropriate high value) and proper `relative`/`sticky` positioning.
- [ ] **Verify Rate Selector:** Ensure `components/currency/rate-selector.tsx` dropdown has a z-index that puts it above the page content but works within the header's context.

### 3. Implementation: User Icon Visibility
- [ ] **Update Avatar Styles:** Modify the User Avatar component (in `header.tsx` or `components/ui/avatar.tsx` if it exists) to ensure high contrast.
    -   *Action:* Add explicit `bg-primary/10 text-primary` or similar high-contrast classes for the fallback state.
    -   *Action:* Ensure the image (if present) has a proper fallback background if it fails to load.

### 4. Implementation: Android Transitions
- [ ] **Simplify Mobile Transitions:** Modify `lib/animations/index.ts` or the component handling page transitions (likely `components/layout/main-layout.tsx`).
    -   *Action:* Detect if mobile (or just apply globally if acceptable) and switch from complex "Slide/Scale" to a simpler "Fade" or "None" to prevent layout shifting/cutting on Android.
    -   *Ref:* "Animation cortada" usually implies the viewport height changes during the animation.
- [ ] **Fix Viewport Height:** Ensure the main container uses `dvh` (Dynamic Viewport Height) or `h-screen` correctly to prevent browser bar jumps.

### 5. Verification
- [ ] **Verify Fixes:** Ensure Header stays on top, User Icon is visible, and navigation is smooth.
