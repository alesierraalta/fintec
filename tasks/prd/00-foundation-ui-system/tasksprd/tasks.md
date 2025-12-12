# TasksPRD: Foundation UI System (ultra-detailed)

## MCP Rules (mandatory)
- Always start with `mcp__serena__activate_project`.
- Prefer `mcp__serena__get_symbols_overview` + `mcp__serena__find_symbol` over full file reads.
- Use `mcp__serena__search_for_pattern` before touching code to locate exact usage sites.
- Before editing: `mcp__serena__think_about_task_adherence`.
- After each research cluster: `mcp__serena__think_about_collected_information`.
- After completing a phase: `mcp__serena__write_memory` (bank memory).
- Best practices: use `mcp__context7__resolve-library-id` + `mcp__context7__get-library-docs` and `mcp__docfork__docfork_search_docs` + `mcp__docfork__docfork_read_url`.

## Sequential Thinking checkpoints (minimum 20)
Use these exact MCP calls as explicit checkpoints and log outcomes to memory:
- ST-01 `mcp__serena__think_about_collected_information` after token inventory.
- ST-02 `mcp__serena__think_about_collected_information` after UI primitive audit.
- ST-03 `mcp__serena__think_about_collected_information` after global CSS audit.
- ST-04 `mcp__serena__think_about_task_adherence` before first edit.
- ST-05 `mcp__serena__think_about_collected_information` after refactor draft.
- ST-06 `mcp__serena__think_about_task_adherence` before updating any shared component.
- ST-07 `mcp__serena__think_about_collected_information` after focus/keyboard pass.
- ST-08 `mcp__serena__think_about_task_adherence` before shipping motion changes.
- ST-09 `mcp__serena__think_about_collected_information` after Tailwind token changes.
- ST-10 `mcp__serena__think_about_task_adherence` before deleting any style/class.
- ST-11 `mcp__serena__think_about_collected_information` after updating Button/Card/Input.
- ST-12 `mcp__serena__think_about_collected_information` after updating Modal/Skeleton.
- ST-13 `mcp__serena__think_about_task_adherence` before applying global CSS changes.
- ST-14 `mcp__serena__think_about_collected_information` after responsive checks.
- ST-15 `mcp__serena__think_about_collected_information` after performance sanity pass.
- ST-16 `mcp__serena__think_about_task_adherence` before final formatting.
- ST-17 `mcp__serena__think_about_collected_information` after lint/type checks.
- ST-18 `mcp__serena__think_about_collected_information` after Playwright screenshots.
- ST-19 `mcp__serena__think_about_task_adherence` before final PRD sign-off.
- ST-20 `mcp__serena__think_about_whether_you_are_done` at completion.

## Key decisions (required format)

How should we standardize spacing across desktop and mobile without losing the iOS-like “breathing room”?
a) Define a single spacing scale (xs–2xl) in a shared reference doc + enforce via UI primitives. (RECOMMENDED: one scale, everywhere)
pros:
- Consistent rhythm across pages; reduces one-off padding/margin strings.
- Easier to review and maintain.
contras:
- Requires touching many components over time.
b) Allow per-page spacing rules and only standardize core components.
pros:
- Lower short-term effort.
contras:
- Drift continues; inconsistent UX persists.
c) Move spacing to CSS variables only and stop using Tailwind spacing utilities.
pros:
- Central control of spacing via variables.
contras:
- Fights Tailwind idioms; increases cognitive load and custom CSS.

How should we handle focus-visible styles globally (keyboard accessibility) while keeping the “black theme” aesthetic?
a) One global focus ring utility class used everywhere (`focus-visible:ring-*`) + audit all interactive elements. (RECOMMENDED: global focus baseline)
pros:
- Consistent accessibility; easy to verify.
- Minimal visual change if tuned.
contras:
- Requires audit of many buttons/links/custom clickable divs.
b) Keep per-component focus styles and adjust opportunistically.
pros:
- Less work initially.
contras:
- Easy to miss; inconsistent and riskier.
c) Hide focus rings and rely on hover/active only.
pros:
- “Clean” look.
contras:
- Not accessible; breaks keyboard navigation.

How should we approach motion (animations/transitions) to improve perceived quality without adding visual noise?
a) Keep current iOS-like transitions, add `prefers-reduced-motion` fallbacks, and remove excessive “always-on” animations. (RECOMMENDED: motion with restraint)
pros:
- Preserves essence; improves accessibility and polish.
contras:
- Requires identifying and trimming noisy animations.
b) Add more animated effects (glows, beams, particles) globally.
pros:
- Flashier; can feel “premium”.
contras:
- Risks losing essence; can reduce readability and performance.
c) Remove most animations entirely.
pros:
- Simple and fast.
contras:
- Loses the iOS-like feel; UX feels “flat”.

## Implementation plan (meticulous)

### Phase 1 — Inventory & audit (no code changes)
1) Tool: `mcp__serena__list_dir` on `components/ui`, `lib/*(colors|spacing|typography)`, `app/globals.css`.
2) Tool: `mcp__serena__get_symbols_overview` for each UI primitive file to map exports quickly.
3) Tool: `mcp__serena__search_for_pattern` for high-risk CSS classes:
   - `black-theme-`
   - `focus-ring`
   - `shadow-ios`
   - `mobile-app`
4) Tool: `mcp__serena__write_memory` → `uiux_foundation_audit`:
   - “current tokens”, “duplicated class clusters”, “a11y gaps”, “motion hotspots”.

### Phase 2 — Best-practices research (Context7 + Docfork)
1) Context7:
   - Resolve + read: Next.js viewport export best practices.
   - Resolve + read: Tailwind CSS for design tokens and utilities.
   - Resolve + read: React (focus management + rendering patterns).
2) Docfork:
   - Search + read: safe-area patterns for fixed bottom nav.
   - Search + read: 100dvh/keyboard resize patterns and pitfalls.
   - Search + read: focus-visible and WCAG relevant guidance.
3) Bank memory: `mcp__serena__write_memory` → `uiux_foundation_best_practices`.

### Phase 2.1 — Optional UI inspiration (Magic UI, only if it fits the essence)
1) Tool: `mcp__magicuidesign__getUIComponents` to list available components.
2) Tool: `mcp__magicuidesign__getBackgrounds` / `mcp__magicuidesign__getSpecialEffects` for subtle patterns only.
3) Selection rule:
   - Must preserve readability and “finance-grade” clarity.
   - Must be optional and easy to remove.
4) Log chosen candidates (or explicit “none”) in bank memory.

### Phase 3 — Token standardization (small, safe edits)
1) Decide “source of truth”:
   - Tailwind theme tokens in `tailwind.config.ts`
   - CSS variables in `app/globals.css`
2) Use `mcp__serena__search_for_pattern` to find “one-off” colors and spacing values.
3) Convert 1–2 highest-impact patterns into shared utilities/classes (minimal change set).
4) Validate by searching for removed patterns (no dangling usages).

### Phase 4 — Component pass (primitives)
For each component in `components/ui/*`:
1) Tool: `mcp__serena__find_referencing_symbols` to locate usage hotspots.
2) Update component to:
   - support consistent sizes/variants
   - have accessible focus-visible styles
   - avoid “clickable div” without role/keyboard handlers
3) Add/adjust skeletons/loading primitives where missing.

### Phase 5 — Verification
1) Local checks:
   - `npm run lint`
   - `npm run type-check`
2) UX smoke:
   - keyboard-only navigation through header/sidebar/nav/buttons
   - mobile safe area: bottom nav not covering content
3) Optional (recommended): Playwright screenshots for regression guard.

## Task checklists (consolidated)

### Task: Design tokens audit (checklist)
- [ ] Use `mcp__serena__list_dir` to list `lib/colors`, `lib/spacing`, `lib/typography`, `components/ui`.
- [ ] Use `mcp__serena__search_for_pattern` to find hard-coded hex colors and repeated spacing clusters.
- [ ] Record “top 10 repeated class clusters” in bank memory (`mcp__serena__write_memory`).
- [ ] Propose a canonical token mapping: CSS variables vs Tailwind theme keys.
- [ ] Validate no token conflicts with existing `tailwind.config.ts` palette.

### Task: Accessibility baseline (checklist)
- [ ] Identify all interactive elements styled as `div` (search for `onClick={` without `button`).
- [ ] Ensure focus-visible styling exists for Button/Link/Input/Select/Modal close buttons.
- [ ] Ensure `aria-label` exists for icon-only buttons.
- [ ] Ensure keyboard navigation works on:
  - [ ] Sidebar links
  - [ ] Mobile bottom navigation links
  - [ ] Modals (focus trap / close with Escape)
- [ ] Add `prefers-reduced-motion` handling for heavy animations.

### Task: Dead CSS & unused UI cleanup (checklist)
- [x] Identify unused custom classes in `app/globals.css` via `mcp__serena__search_for_pattern`.
- [x] Remove unused CSS blocks (typography helpers, iOS component helpers, spacing helpers, redundant container).
- [x] Remove unused UI module(s) by deleting the file + all imports.
- [x] Replace legacy helper classes with Tailwind equivalents where possible (e.g. `animate-gradient` + `[background-size:200%_200%]`).
- [x] Run `npm run lint`, `npm run type-check`, `npm run build` to verify no regressions.
