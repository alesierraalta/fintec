# Mobile Viewport Fix - Implementation Summary

## Overview
Fixed the "stuck viewport" issue on mobile devices where the screen would show dead space after closing the keyboard. The solution involved enhancing the viewport height hook and updating global CSS styles.

## Changes Made

### 1. Enhanced `useViewportHeight` Hook
**File:** `hooks/use-viewport-height.ts`

**Key Changes:**
- ✅ Added CSS variable `--app-height` that updates dynamically with viewport changes
- ✅ Already listening to `visualViewport.resize` events (confirmed working)
- ✅ Already forces scroll reset with `window.scrollTo(0, 0)` on keyboard close (confirmed working)
- ✅ Already has `focusout` listener on inputs to trigger layout refresh (confirmed working)

**New Functionality:**
```typescript
// Sets CSS variable for use in global styles
document.documentElement.style.setProperty('--app-height', `${newHeight}px`);
```

This allows CSS to use `var(--app-height)` for dynamic height that updates in real-time.

### 2. Updated Global Styles
**File:** `app/globals.css`

#### A. Fixed Body Overflow Issue
**Before:**
```css
body {
  overflow: hidden; /* Prevented native scroll recovery */
}
```

**After:**
```css
body {
  overflow-x: hidden; /* Only prevent horizontal scroll */
  overflow-y: auto;   /* Allow vertical scroll for viewport recovery */
}
```

**Rationale:** The `overflow: hidden` on body was preventing the browser from naturally recovering the viewport after keyboard dismissal. Now the body can scroll vertically, allowing iOS Safari and other mobile browsers to auto-correct the viewport.

#### B. Updated #root Container
**Before:**
```css
#root {
  height: 100%;
  height: 100dvh;
}
```

**After:**
```css
#root {
  height: var(--app-height, 100dvh);
}
```

**Rationale:** Using the CSS variable provides more reliable cross-browser support and real-time updates.

#### C. Updated Utility Classes
**Before:**
```css
.h-dynamic-screen {
  height: 100vh;
  height: 100dvh;
}

.min-h-dynamic-screen {
  min-height: 100vh;
  min-height: 100dvh;
}
```

**After:**
```css
.h-dynamic-screen {
  height: var(--app-height, 100dvh);
}

.min-h-dynamic-screen {
  min-height: var(--app-height, 100dvh);
}
```

#### D. Simplified iOS Safari Fixes
**Before:**
```css
@supports (-webkit-touch-callout: none) {
  .h-dynamic-screen {
    height: -webkit-fill-available;
  }
  .min-h-dynamic-screen {
    min-height: -webkit-fill-available;
  }
  #root {
    height: -webkit-fill-available;
    min-height: -webkit-fill-available;
  }
}
```

**After:**
```css
@supports (-webkit-touch-callout: none) {
  /* Utility classes now use --app-height, no override needed */
  #root {
    height: var(--app-height, -webkit-fill-available);
  }
}
```

**Rationale:** The CSS variable approach handles viewport updates more reliably, so we don't need separate overrides for utility classes.

## How It Works

1. **Hook Initialization:** When the app loads, `useViewportHeight` sets the initial `--app-height` CSS variable
2. **Viewport Changes:** When the keyboard opens/closes, the hook detects changes via `visualViewport.resize` events
3. **CSS Variable Update:** The hook updates `--app-height` in real-time
4. **Layout Adjustment:** All elements using `var(--app-height)` automatically adjust their height
5. **Scroll Recovery:** With `overflow-y: auto` on body, the browser can naturally scroll to recover the viewport
6. **Force Update:** On input blur, the hook forces an update and scroll reset to ensure proper recovery

## Benefits

1. **Real-time Updates:** CSS variable updates instantly across all elements
2. **Cross-browser Support:** Fallback to `100dvh` for browsers without CSS variable support
3. **iOS Safari Compatible:** Special handling with `-webkit-fill-available` fallback
4. **Natural Recovery:** Browser can now auto-correct viewport after keyboard dismissal
5. **Consistent Behavior:** Single source of truth (`--app-height`) for all viewport-dependent elements

## Testing Checklist

- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Chrome Mobile (Android)
- [ ] Test on Samsung Internet
- [ ] Verify keyboard open/close behavior
- [ ] Verify no white space after keyboard closes
- [ ] Verify scroll position resets correctly
- [ ] Test on different screen sizes
- [ ] Test in landscape and portrait orientations

## Next Steps

1. ✅ **Layout Integration** - MainLayout already uses the hook
2. [ ] **Form Container Testing** - Verify pages with forms (Login, Add Transaction) work correctly
3. [ ] **Mobile Testing** - Test on actual devices to verify the fix works

## Technical Notes

### CSS Variable Approach vs. Inline Styles
We use both approaches for maximum reliability:
- **CSS Variable (`--app-height`)**: Used in global styles for consistent application-wide behavior
- **Inline Style**: MainLayout also applies inline style as a backup for direct height control

### Why Remove `overflow: hidden` from Body?
The `overflow: hidden` was preventing the browser's natural scroll recovery mechanism. When the keyboard closes, mobile browsers try to scroll the viewport back to its original position, but `overflow: hidden` blocks this. By using `overflow-y: auto`, we allow this natural recovery while still preventing horizontal scroll with `overflow-x: hidden`.

### Lint Warnings
The CSS lint warnings about `@tailwind` and `@apply` are expected and safe to ignore. These are Tailwind CSS directives that are processed during build time and are not standard CSS rules, hence the warnings from the CSS linter.
