# TasksPRD: App Shell & Navigation (ultra-detailed)

## MCP Rules (mandatory)
- Always locate navigation definitions via `mcp__serena__search_for_pattern` before editing.
- Use `mcp__serena__find_referencing_symbols` on `Sidebar`, `Header`, `MobileNav`, `MobileMenuFAB`.
- Validate routes using local grep (Serena) instead of reading entire pages.
- Log decisions to bank memory with `mcp__serena__write_memory`.

## Key decisions (required format)

How should mobile navigation balance “core tabs” and “secondary actions” while preserving FinTec’s iOS-like feel?
a) Keep bottom tabs + keep the “More options” bottom sheet (FAB), but unify labels/active states and remove duplication. (RECOMMENDED: keep + refine)
pros:
- Preserves current essence; minimal behavioral change.
- Keeps core actions one tap away; secondary actions still discoverable.
contras:
- Must ensure FAB doesn’t compete with Add Transaction and AI chat.
b) Use bottom tabs only (max 5), move everything else to Settings/Sidebar.
pros:
- Simpler interaction model.
contras:
- Some features become harder to discover; may break current mental model.
c) Remove bottom tabs and rely on a hamburger/slide-over menu.
pros:
- Clean bottom area.
contras:
- Adds friction (extra tap); less iOS-tab-like.

How should we handle “mobile vs desktop rendering” to reduce hydration mismatches?
a) Keep JS branching after `mounted` (current pattern). (RECOMMENDED: only as fallback)
pros:
- Avoids mismatch errors quickly.
contras:
- Can show blank UI; slower perceived load.
b) Prefer CSS responsive layout (render once; hide/show via breakpoints) and keep JS only for behavior. (RECOMMENDED: CSS-first responsiveness)
pros:
- Faster first paint; less “null render” time.
- Fewer hydration gates.
contras:
- Requires careful CSS to avoid duplicating heavy UI.
c) Server-render mobile/desktop by UA sniffing.
pros:
- No client gate.
contras:
- Complex; risky; not reliable.

## Implementation plan (meticulous)

### Phase 1 — Navigation inventory (no edits)
1) Tool: `mcp__serena__find_symbol` include bodies:
   - `MainLayoutContent` (`components/layout/main-layout.tsx`)
   - `Sidebar` (`components/layout/sidebar.tsx`)
   - `MobileNav` (`components/layout/mobile-nav.tsx`)
   - `MobileMenuFAB` (`components/layout/mobile-menu-fab.tsx`)
2) Tool: `mcp__serena__search_for_pattern`:
   - `mobileNavigation`
   - `navigation`
   - `router.push(`
   - `window.location.href`
3) Bank memory: `mcp__serena__write_memory` → `uiux_shell_nav_inventory`.

### Phase 2 — UX problems list (evidence-based)
1) Identify overlap risks:
   - bottom nav height + `pb-24`
   - floating Add Transaction button at `bottom-24`
   - AIChat FAB position
2) Identify active-state correctness:
   - `pathname === item.href` fails on nested routes (e.g. `/transactions/add`)
3) Identify a11y issues:
   - clickable containers without role
   - missing `aria-current` on active links
4) Log to memory: `uiux_shell_nav_issues`.

### Phase 3 — Improvements (ordered by impact)
1) Replace `window.location.href` with router navigation where safe (avoid full refresh).
2) Normalize active state logic:
   - exact match vs prefix match rules per route group
3) Ensure bottom padding derives from nav height (single source of truth):
   - define `--bottom-nav-height` and use it for `pb-*` and FAB offsets (or Tailwind utility mapping)
4) Accessibility:
   - add `aria-label` to icon-only buttons
   - add `aria-current="page"` to active navigation links
5) Verify safe-area:
   - ensure `pb-safe` and `env(safe-area-inset-bottom)` usage is consistent.

### Phase 4 — Verification
1) Search for removed patterns (`window.location.href` occurrences).
2) Manual flows:
   - Mobile: open/close sidebar; switch tabs; open More menu; ensure no overlap.
   - Desktop: collapse sidebar; keyboard nav; focus ring visible.

## Task checklists (consolidated)

### Task: Unify navigation model (checklist)
- [ ] Locate `navigation` definitions in `components/layout/sidebar.tsx` and `components/layout/mobile-nav.tsx`.
- [ ] Decide active-state rules per route group (exact vs prefix).
- [ ] Ensure `aria-current="page"` on active links.
- [ ] Remove `window.location.href` usage in shell and replace with router navigation where safe.
- [ ] Validate no dead routes (search for `href="/..."` not present in `app/`).
