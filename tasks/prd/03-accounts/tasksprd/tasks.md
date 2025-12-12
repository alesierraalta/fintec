# TasksPRD: Accounts UX (ultra-detailed)

## MCP Rules (mandatory)
- Start with `mcp__serena__activate_project`.
- Use `mcp__serena__list_dir` for `app/accounts` and `components/**/accounts*` to locate the current UI surface.
- Use `mcp__serena__search_for_pattern` for:
  - `accounts/`
  - `Account` component names
  - `findByUserId` calls related to accounts
- Use `mcp__serena__find_referencing_symbols` before refactoring shared account display components.
- Use Context7/Docfork to research:
  - responsive card vs table patterns
  - financial dashboards/accounts list UX
- Use the global ST checklist from `tasks/prd/00-foundation-ui-system/tasksprd/tasks.md` (ST-01…ST-20) and log outcomes to bank memory.

## Key decisions (required format)

How should the accounts list be presented on desktop?
a) Responsive grid of cards with a compact summary row and quick actions. (RECOMMENDED: card grid + quick actions)
pros:
- Scannable; fits the current “card” aesthetic.
contras:
- Needs careful density control to avoid wasted space.
b) Table-first layout with columns (balance, currency, updated).
pros:
- Dense information.
contras:
- Harder to make “app-like”; mobile adaptation needed.
c) Mixed: cards on mobile, table on desktop.
pros:
- Best of both worlds.
contras:
- Two layouts to maintain.

## Implementation plan (meticulous)
1) Inventory existing Accounts page components and state management.
2) Define empty states (no accounts) and onboarding CTA.
3) Implement consistent account card primitives (re-using `components/ui/card`).
4) Ensure currency formatting and conversions are consistent with Header totals.
5) Validate mobile gestures and tap targets.

## Task checklists (consolidated)

### Task: Accounts list UX (checklist)
- [ ] Inventory current accounts list UI in `app/accounts/*` and related components.
- [ ] Define desktop layout choice (cards vs table) and mobile layout (cards).
- [ ] Add quick actions per account (view, edit, transfer).
- [ ] Add empty state + CTA (create first account).
- [ ] Validate account currency formatting and totals consistency.

### Task: Account details UX (checklist)
- [ ] Define “account header” (name, balance, currency, last updated).
- [ ] Add recent activity section (latest transactions).
- [ ] Add clear transfer CTA and disable if no eligible target accounts.
- [ ] Ensure mobile detail view is one-handed and dismissible.
