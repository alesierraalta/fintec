# TasksPRD: Dashboard UX (ultra-detailed)

## MCP Rules (mandatory)
- Start with `mcp__serena__activate_project`.
- Use `mcp__serena__get_symbols_overview` and `mcp__serena__find_symbol` for `MobileDashboard`, `DesktopDashboard`, `StatCard` before reading full files.
- Use `mcp__serena__find_referencing_symbols` for shared dashboard components to avoid breaking other pages.
- Research best practices with:
  - `mcp__context7__resolve-library-id` + `mcp__context7__get-library-docs`
  - `mcp__docfork__docfork_search_docs` + `mcp__docfork__docfork_read_url`
- Use the global ST checklist from `tasks/prd/00-foundation-ui-system/tasksprd/tasks.md` (ST-01…ST-20) and log outcomes to bank memory.

## Key decisions (required format)

How should dashboard loading be presented to reduce perceived wait time?
a) Replace “mounted gate → null” with immediate skeleton UI and progressively hydrate interactive parts. (RECOMMENDED: skeleton-first)
pros:
- Better perceived performance; no blank screen.
- Keeps layout stable.
contras:
- Requires well-designed skeleton components.
b) Keep current “Cargando…” centered text.
pros:
- Easy.
contras:
- Feels slow; weak UX.
c) Block rendering until everything is loaded.
pros:
- Avoids partial UI.
contras:
- Worst perceived performance.

How should the dashboard choose mobile vs desktop layout?
a) CSS-first layout with responsive grid and shared components. (RECOMMENDED: one component, responsive)
pros:
- Less duplication; easier maintenance.
- No JS branch needed for layout.
contras:
- Requires refactor of `MobileDashboard`/`DesktopDashboard`.
b) Keep separate mobile and desktop components (current).
pros:
- Fast to iterate independently.
contras:
- Duplication grows; inconsistent behavior possible.
c) Server decide by UA.
pros:
- No client gate.
contras:
- Complex and risky.

## Implementation plan (meticulous)
1) Research:
   - Next.js + React rendering/loading UX (Context7).
   - Skeleton and perceived performance patterns (Docfork).
1) Audit current KPI cards and spacing on both dashboards.
2) Define a single “DashboardLayout” skeleton structure.
3) Move shared logic to hooks/utilities; keep only layout differences in CSS.
4) Ensure charts have:
   - readable axes/labels on mobile
   - tap targets and legends
5) Validate on:
   - small phones (`xs`, `sm`)
   - tablets (`md`)
   - desktop (`lg`, `xl`)

## Task checklists (consolidated)

### Task: KPI hierarchy & above-the-fold layout (checklist)
- [ ] Identify the “Top 3” KPIs for FinTec dashboard (balance, cashflow, savings rate).
- [ ] Verify current placement in `components/dashboard/*`.
- [ ] Define above-the-fold layout targets:
  - [ ] Mobile: KPIs visible without scrolling.
  - [ ] Desktop: KPIs + primary chart visible without scrolling on 1366×768.
- [ ] Ensure KPI cards share a single component (variant-based) and consistent spacing.

### Task: Dashboard loading states (checklist)
- [ ] Replace “blank render until mounted” patterns with skeleton-first UI.
- [ ] Ensure skeleton matches final layout dimensions (avoid layout shift).
- [ ] Ensure charts have lightweight placeholders until data is ready.
- [ ] Validate perceived performance:
  - [ ] No white flashes on dark theme.
  - [ ] No “jumping” grid on hydration.
