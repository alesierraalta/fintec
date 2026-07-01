## Exploration: fix-sidebar-toggle

### Current State

The `Sidebar` component in `components/layout/sidebar.tsx` and the `Header` component in `components/layout/header.tsx` are managed by `useSidebar()` context.
Currently, on desktop view (`!isMobile`), the `Header` component does not render any hamburger/menu button to toggle the sidebar. The mobile view renders a button, but `main-layout.tsx` passes an empty function `() => {}` to `Header`'s `onMenuClick` prop instead of the actual `toggleSidebar` function from the context.
This means the sidebar state (`isOpen`) cannot be toggled by the user, leading to a confusing experience where it might be stuck open or closed (depending on the screen size it was loaded on).

### Affected Areas

- `components/layout/main-layout.tsx` — Passes an empty function to `onMenuClick` in `Header`. Needs to pass `toggleSidebar`.
- `components/layout/header.tsx` — Desktop return block does not include a sidebar toggle button. Needs a button in the desktop view (typically on the left side of the header).

### Approaches

1. **Add Toggle to Desktop Header** — Update `Header` to render a toggle button on desktop (e.g., next to the Rate Selector) and connect `onMenuClick` in `main-layout.tsx` to `toggleSidebar`.
   - Pros: Standard UI pattern, easy to discover.
   - Cons: Takes up a little space in the header.
   - Effort: Low

2. **Add Toggle to Sidebar Component** — Add a collapse/expand chevron button inside the `Sidebar` itself.
   - Pros: Keeps sidebar logic self-contained.
   - Cons: When fully closed (width=0 or hidden), the user can't reopen it if the button is hidden with the sidebar. But here, `isMinimized` changes width to `w-16`, so the button could still be visible.
   - Effort: Medium

### Recommendation

**Approach 1 (Add Toggle to Desktop Header + Wire up onMenuClick)** is the best and most standard solution. The `Header` component already receives `onMenuClick` and `isMobileMenuOpen` props. We just need to render the button on the desktop layout in the header and pass `toggleSidebar` from `main-layout.tsx`.

### Risks

- Overlapping with `RateSelector` or `Add Transaction` button on smaller desktop screens, though `gap-2` should prevent layout breaks.

### Ready for Proposal

Yes.
