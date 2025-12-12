# TasksPRD: Transactions UX (ultra-detailed)

## MCP Rules (mandatory)
- Start with `mcp__serena__activate_project`.
- Use `mcp__serena__get_symbols_overview` on `app/transactions/page.tsx` before reading full sections.
- Use `mcp__serena__search_for_pattern` to locate:
  - filter state shape and usage
  - detail panel open/close flows
  - any `window.location.href` navigation
- Use `mcp__serena__find_referencing_symbols` on `TransactionDetailPanel`, `TransactionFilters`, and shared list components before edits.
- Use Context7/Docfork to research:
  - list virtualization and infinite scroll UX
  - mobile bottom-sheet patterns + accessibility (focus/escape/back)
- Use the global ST checklist from `tasks/prd/00-foundation-ui-system/tasksprd/tasks.md` (ST-01…ST-20) and log outcomes to bank memory.

## Key decisions (required format)

How should the transactions detail experience work across desktop and mobile?
a) Desktop: side panel; Mobile: bottom sheet (shared component with responsive behavior). (RECOMMENDED: one component, two presentations)
pros:
- Consistent behavior; one logic path.
- Fits mobile “app-like” patterns.
contras:
- Requires careful responsive design and focus management.
b) Separate components for desktop and mobile detail.
pros:
- Faster to build independently.
contras:
- Duplication; more bugs over time.
c) Navigate to a dedicated detail page instead of panel.
pros:
- Simple; no overlay complexity.
contras:
- Slower workflow; worse “back” ergonomics.

How should filtering be presented on mobile for best ergonomics?
a) Collapsible filter chips row + “Filters” sheet for advanced fields. (RECOMMENDED: chips + sheet)
pros:
- Fast for common filters; advanced options still accessible.
contras:
- Requires implementing chip state mapping cleanly.
b) Always show full filter form on top.
pros:
- Straightforward.
contras:
- Consumes vertical space; noisy.
c) Hide filters behind a separate route.
pros:
- Clean list view.
contras:
- Extra navigation steps.

## Implementation plan (meticulous)
1) Research:
   - React list performance patterns (Context7).
   - Overlay/bottom sheet accessibility patterns (Docfork).
1) Refactor `app/transactions/page.tsx` into smaller components:
   - list
   - filters
   - actions
   - detail panel
2) Ensure infinite scroll sentinel does not conflict with bottom nav padding.
3) Normalize formatting:
   - amounts (minor units)
   - currency badges
   - type icons
4) Ensure “Add transaction” flow:
   - consistent CTA placement desktop vs mobile
   - no overlap with AI chat FAB and bottom nav
5) Verify:
   - nested routes active-state (`/transactions/add`)
   - keyboard navigation and Escape to close panels/modals

## Task checklists (consolidated)

### Task: Filters & search ergonomics (checklist)
- [ ] Define “quick filters” as chips (type, account, date preset).
- [ ] Define advanced filters inside a sheet/modal (amount range, tags, category).
- [ ] Ensure filter state is visible and resettable (“Clear all”).
- [ ] Ensure search is debounced and shows empty-state feedback.

### Task: Detail panel behavior (checklist)
- [ ] Define shared detail panel component API (open/close, selected transaction).
- [ ] Desktop presentation: right side panel.
- [ ] Mobile presentation: bottom sheet with snap points.
- [ ] Ensure Escape/Back closes the panel and focus returns to the triggering row.

### Task: Add/Edit flow (checklist)
- [ ] Ensure primary CTA placement doesn’t overlap bottom nav and FABs.
- [ ] Ensure add/edit forms have:
  - [ ] clear validation messages
  - [ ] consistent currency input behavior
  - [ ] predictable keyboard focus order
- [ ] Ensure success feedback (toast/snackbar) is non-blocking.
