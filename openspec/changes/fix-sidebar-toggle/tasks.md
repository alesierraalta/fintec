# Tasks: Fix Sidebar Toggle

## Implementation Tasks

- [x] 1. **Update `main-layout.tsx`**
  - File: `components/layout/main-layout.tsx`
  - Action: Update `Header` component usage to pass `toggleSidebar` from `useSidebar()` to the `onMenuClick` prop instead of `() => {}`.
- [x] 2. **Update `header.tsx` for Desktop**
  - File: `components/layout/header.tsx`
  - Action: In the non-mobile return block (around line 347), add a menu toggle button next to the `RateSelector` using the `Menu` icon.
  - Details: Use styling similar to the mobile button `className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground transition-all hover:scale-95 active:scale-90"`. Ensure to wire the `onClick` handler to the `onMenuClick` prop.
