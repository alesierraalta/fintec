# PRD: App Shell & Navigation (Desktop + Mobile)

## Context
The app shell (Sidebar + Header + MobileNav + MobileMenuFAB + floating actions) defines the overall feel of FinTec. Improvements here will amplify UX across every page.

## Goals
- Clear, consistent navigation on desktop and mobile.
- No overlap between bottom navigation, FABs, and safe areas.
- Reduce hydration-related “blank screen” moments.
- Improve navigation “active state” correctness (including nested routes).

## Non-goals
- Removing the sidebar paradigm entirely.
- Major information architecture changes to feature set (only presentation + interaction).

## Key surfaces
- `components/layout/main-layout.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `components/layout/mobile-nav.tsx`
- `components/layout/mobile-menu-fab.tsx`
- Global viewport behavior: `app/layout.tsx`, `app/globals.css`

## Success metrics
- Mobile: one-handed navigation works; no element overlaps bottom nav.
- Desktop: sidebar collapse/minimize is intuitive; active states correct.
- Reduced “hydration gating” time (less blank UI on initial load).

