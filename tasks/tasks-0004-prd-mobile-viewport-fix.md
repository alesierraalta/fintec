# Task List: Fix Mobile Viewport Stuck Issue

## Context
Mobile users experience a "stuck" viewport after closing the keyboard, leaving dead space and displaced content. This is likely due to `overflow: hidden` on `body` and layout height mismatches during virtual keyboard interaction.

## Tasks

### 1. Analysis
- [ ] **Review `globals.css`:** Inspect the `html`, `body`, and root container styles, specifically focusing on `height: 100dvh`, `overflow: hidden`, and `position: fixed`.
- [ ] **Review `MainLayout`:** Check how the main container handles height. It currently uses a `useViewportHeight` hook (seen in previous context) - verify its implementation.

### 2. Implementation: Viewport Hook & CSS
- [ ] **Enhance/Fix `useViewportHeight` Hook:**
    -   Ensure it listens to the `visualViewport` `resize` event (not just window resize).
    -   Ensure it forces a scroll reset (`window.scrollTo(0, 0)`) when the keyboard closes (if the layout shouldn't be scrolled).
- [ ] **Create `useMobileViewportFix` Hook (if needed):**
    -   If the existing hook is insufficient, create a specialized hook that:
        1.  Sets a `--app-height` CSS variable to `window.visualViewport.height`.
        2.  Adds a listener for `focusout` (blur) on inputs to trigger a layout refresh.
- [ ] **Update Global Styles:**
    -   Modify `globals.css` to use the dynamic height variable (e.g., `height: var(--app-height, 100dvh)`) for the root container.
    -   Evaluate if removing `overflow: hidden` from `body` (and applying it only to the app wrapper) helps native recovery.

### 3. Implementation: Layout Integration
- [ ] **Apply to `MainLayout`:** Import and use the fix hook in `components/layout/main-layout.tsx`.
- [ ] **Fix Form Containers:** Ensure pages with forms (Login, Add Transaction) allow internal scrolling even if the main container is fixed height.

### 4. Verification
- [ ] **Test Mobile Flow:**
    1.  Open page on Mobile.
    2.  Tap input (keyboard opens, view resizes).
    3.  Tap "Done" or outside (keyboard closes).
    4.  Verify view returns to full height and no white space remains.
