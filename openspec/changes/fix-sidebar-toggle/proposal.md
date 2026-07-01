# Proposal: Fix Sidebar Toggle

## Intent

The sidebar component cannot be toggled by the user on desktop because there is no UI button to open or close it. Additionally, the desktop `Header` component receives an empty function for `onMenuClick` in `main-layout.tsx`. This causes the sidebar to sometimes get stuck open or closed unexpectedly depending on viewport changes. This change restores the user's explicit control over sidebar visibility.

## Scope

### In Scope

- Add a toggle button (e.g. `Menu` or `PanelLeft` icon) to the left side of the desktop `Header` component.
- Wire `toggleSidebar` from `SidebarContext` to the `onMenuClick` prop of `Header` inside `main-layout.tsx`.

### Out of Scope

- Adding toggle buttons inside the `Sidebar` component itself.
- Changing mobile sidebar behavior.

## Approach

We will modify `components/layout/main-layout.tsx` to pass the `toggleSidebar` function from `useSidebar()` to the `Header` component. Then, we will modify the desktop return block in `components/layout/header.tsx` to include a menu button identical in style to the mobile one, placing it next to the `RateSelector`.

## Affected Areas

| Area                                | Impact   | Description                       |
| ----------------------------------- | -------- | --------------------------------- |
| `components/layout/main-layout.tsx` | Modified | Pass `toggleSidebar` to `Header`  |
| `components/layout/header.tsx`      | Modified | Add toggle button to desktop view |

## Risks

| Risk                                              | Likelihood | Mitigation                                                        |
| ------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Button layout overlaps on small desktop viewports | Low        | Use standard FinTec flex/gap styles, the header has enough space. |

## Rollback Plan

Revert the changes in `header.tsx` and `main-layout.tsx` via standard Git reset/revert.

## Dependencies

- None

## Success Criteria

- [ ] A hamburger/menu button is visible on the left side of the desktop header.
- [ ] Clicking the button toggles the sidebar's `isMinimized` state (expanding and collapsing it).
- [ ] Mobile functionality remains unaffected.
