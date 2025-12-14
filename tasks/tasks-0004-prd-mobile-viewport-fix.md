# Task List: Fix Mobile Viewport Stuck Issue

## Context
Mobile users experience a "stuck" viewport after closing the keyboard, leaving dead space and displaced content. This is likely due to `overflow: hidden` on `body` and layout height mismatches during virtual keyboard interaction.

## Tasks

### 1. Analysis
- [ ] **Review `globals.css`:** Inspect the `html`, `body`, and root container styles, specifically focusing on `height: 100dvh`, `overflow: hidden`, and `position: fixed`.
- [ ] **Review `MainLayout`:** Check how the main container handles height. It currently uses a `useViewportHeight` hook (seen in previous context) - verify its implementation.

### 2. Implementation: Viewport Hook & CSS
- [x] **Enhance/Fix `useViewportHeight` Hook:**
    -   ✅ Ensure it listens to the `visualViewport` `resize` event (not just window resize).
    -   ✅ Ensure it forces a scroll reset (`window.scrollTo(0, 0)`) when the keyboard closes (if the layout shouldn't be scrolled).
- [x] **Create `useMobileViewportFix` Hook (if needed):**
    -   ✅ Enhanced existing hook instead - Sets a `--app-height` CSS variable to `window.visualViewport.height`.
    -   ✅ Already has listener for `focusout` (blur) on inputs to trigger layout refresh.
- [x] **Update Global Styles:**
    -   ✅ Modified `globals.css` to use the dynamic height variable (`height: var(--app-height, 100dvh)`) for the root container.
    -   ✅ Removed `overflow: hidden` from `body` and changed to `overflow-y: auto` to allow native scroll recovery.

### 3. Implementation: Layout Integration
- [x] **Apply to `MainLayout`:** ✅ MainLayout already imports and uses the enhanced `useViewportHeight` hook in `components/layout/main-layout.tsx`.
- [x] **Fix Form Containers:** ✅ Verified and enhanced pages with forms:
    - **Login Page**: Added `overflow-y-auto` to allow scrolling when keyboard is open
    - **Add Transaction (Mobile)**: Already has `overflow-y-auto` on main container
    - All form containers now properly scroll while maintaining fixed viewport height

### 4. Verification
- [ ] **Test Mobile Flow:** ⚠️ Requires actual mobile devices - See detailed testing guide at `tasks-0004-mobile-testing-guide.md`
    1.  Open page on Mobile (iOS Safari or Android Chrome recommended)
    2.  Tap input (keyboard opens, view resizes).
    3.  Tap "Done" or outside (keyboard closes).
    4.  Verify view returns to full height and no white space remains.
- [x] **Build Verification:** ✅ Production build completed successfully with no errors
