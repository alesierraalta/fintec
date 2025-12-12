# PRD: Foundation UI System (FinTec)

## Context
FinTec already has a “black theme” + iOS-like interaction feel and a growing set of UI primitives in `components/ui/` plus global styles in `app/globals.css`. UI/UX improvements must preserve this identity while making the UI more consistent, accessible, and maintainable across desktop and mobile.

## Goals
- Consistent design tokens and spacing across pages (desktop + mobile).
- Predictable component variants (Button, Card, Input, Select, Modal, Skeleton).
- Strong accessibility baseline (focus visible, keyboard nav, reduced motion).
- Reduce UI regressions by defining “golden” patterns and checklists.

## Non-goals
- Replacing TailwindCSS or rewriting the app shell entirely.
- Introducing a large external component library unless strictly justified.

## In-scope surfaces
- Global styles: `app/globals.css`
- Tailwind tokens: `tailwind.config.ts`
- UI primitives: `components/ui/*`
- Layout primitives (only if required for consistency): `components/layout/*`

## UX Principles (must keep)
- Pure-black background aesthetic.
- iOS-like motion and rounded shapes.
- “Finance-grade” clarity: hierarchy, contrast, and low cognitive load.

## Success metrics
- 0 critical accessibility issues in manual keyboard walkthrough (tab order, focus visible).
- Visual consistency: same spacing scale and typography rhythm across main pages.
- Reduced complexity: fewer one-off class strings duplicated across pages.

