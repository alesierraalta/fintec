# PRD: Dashboard UX (Desktop + Mobile)

## Goals
- Faster perceived load (skeletons instead of blank screens).
- Clear hierarchy: balances, trends, and actions are immediately understandable.
- Mobile dashboard: one-handed friendly with readable cards and charts.

## Key surfaces
- `components/dashboard/dashboard-content.tsx`
- `components/dashboard/mobile-dashboard.tsx`
- `components/dashboard/desktop-dashboard.tsx`
- `components/dashboard/stat-card.tsx`

## Success metrics
- Dashboard shows meaningful skeleton within 100ms (client-side).
- Top 3 KPIs visible without scrolling on both mobile and desktop.

