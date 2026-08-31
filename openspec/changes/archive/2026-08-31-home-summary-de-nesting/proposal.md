# Proposal: Home Summary De-nesting

## Intent

Repeated glass layers—MainLayout wrapper, dashboard sections, and chart/account/row cards—make Home feel nested, shrink values, and add scroll. Flatten the visual hierarchy without changing calculations, routes, actions, or data semantics.

## Proposal question round

Use this round to refine PRD tradeoffs; answer, skip, correct, or request another round. Recommendations are provisional. Basis: Material 3 elevation, iOS HIG grouping/legibility, and project mobile/Tailwind guidance.

| Decision           | Options (pro / con)                                                                                | Recommended                   |
| ------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1. Section surface | Flat (clear hierarchy / fewer boundaries); nested (boundaries / box fatigue)                       | Flat, one surface per section |
| 2. Internal rows   | `divide-y` + subtle tint (scannable / less separation); row cards (separation / repeated chrome)   | Dividers and subtle surface   |
| 3. Metrics         | Shared grid (aligned, larger values / less individual emphasis); cards (emphasis / fragmentation)  | Shared responsive grid        |
| 4. Elevation       | Hero/controls only (calm hierarchy / less depth); everywhere (expressive / muddy and costly)       | Hero and actionable controls  |
| 5. Padding         | One inset (more usable / less generous); outer + inner `p-6` (comfortable / cumulative whitespace) | One responsive inset          |
| 6. Amounts         | `text-2xl/3xl tabular-nums` (glanceable / wraps sooner); small caption (dense / hides money)       | 2xl/3xl, retaining provenance |

## Scope

### In Scope

- Flatten Desktop/Mobile Home sections, internal rows, and metrics.
- Standardize surfaces, dividers, padding, elevation, amount typography, and focused visual/a11y coverage.
- Preserve responsive order, loading/empty states, visibility toggle, and currency provenance.

### Out of Scope

- Calculations, data/API behavior, routes/navigation, account or transaction semantics, and new features.

## Capabilities

### New Capabilities

- `home-summary-visual-hierarchy`: flat sections and readable financial metrics.

### Modified Capabilities

- None; no relevant main Home capability spec exists.

## Approach

Refactor composition in `desktop-dashboard.tsx` and `mobile-dashboard.tsx`; normalize dashboard child components. Use semantic Tailwind tokens, `divide-y`, responsive spacing, and tabular figures; verify 320–1440px in light/dark themes.

## Affected Areas

| Area                                  | Impact                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| `components/dashboard/*.tsx`          | Remove avoidable card-in-card shells and align hierarchy. |
| `components/layout/main-layout.tsx`   | Review accumulated Home wrapper spacing.                  |
| `tests/components/**`, `tests/e2e/**` | Responsive, visual, and accessibility regressions.        |

## Risks

| Risk                             | Likelihood | Mitigation                                        |
| -------------------------------- | ---------- | ------------------------------------------------- |
| Weaker boundaries                | Med        | Retain headings, focus states, and action states. |
| Long currency values wrap poorly | Med        | Test narrow widths; never hide provenance.        |
| Shared-component regression      | Med        | Preserve contracts and run focused checks.        |

## Rollback Plan

Revert the Home layout/style commit and focused tests; no data migration is required.

## Dependencies

Existing semantic tokens and dashboard contracts. Recheck Material 3 Cards/Elevation, iOS HIG Layout/Typography, and Web Interface Guidelines during design; live Context7/web retrieval was unavailable in this run.

## Success Criteria

- [ ] Targeted Home sections contain zero avoidable nested card shells.
- [ ] Amounts use at least 2xl/3xl `tabular-nums` and do not overflow at 320px.
- [ ] Rows, states, provenance, desktop behavior, and 44px interactive targets remain usable.
- [ ] Focused component, accessibility, lint, and type checks pass.
