# Design: Home Summary De-nesting

## 1. Intent and guardrails

The literal ask is: flatten the authenticated Home dashboard so its existing financial content is easier to scan, without changing calculations, routes, actions, state behavior, ordering, or data contracts.

The implementation is therefore a JSX/class-composition change only. It will not add a data hook, move currency calculations, merge the desktop and mobile components, change the `DashboardPeriodControllerProps` contract, or introduce a generalized design-system component. Existing `glass-card`, semantic color, focus, safe-area, and amount utilities remain the source of truth.

## 2. Existing composition and decisions

`app/page.tsx` renders `LazyDashboardContent` inside `MainLayout`. `DashboardContent` owns the selected period/reference time and branches through `useSidebar()` to `DesktopDashboard` or `MobileDashboard`. The branch threshold is already `window.innerWidth < 1024`; it is not the Tailwind `md` threshold and must remain unchanged. `RecentTransactions` separately uses `(max-width: 768px)` for its row layout; that distinction also remains.

Both dashboard branches currently calculate their own summary values and render similar sections. The main sources of nesting are:

- a card for the section plus card-like metric items;
- parent chart/account/transaction cards plus card-like child roots or rows;
- `SpendingChart` and `IncomeSources` both rendering their own `glass-card` section inside a dashboard card;
- `AccountsOverview` rendering card-like account rows and an `ios-card` total inside its dashboard card;
- quick-action controls containing another bordered/glass icon card;
- desktop goal tiles and their loading placeholders using card chrome.

The accepted visual direction is one surface per section, calm dividers for list rows, one responsive metric grid, elevation only for the hero and actionable controls, one local content inset per surface, and prominent tabular financial amounts.

## 3. Surface and inset ownership

The application shell remains the viewport-edge inset owner. `MainLayoutContent` in `components/layout/main-layout.tsx` keeps its existing `px-4 py-6` mobile wrapper and `mx-auto max-w-6xl px-6 py-8` desktop wrapper. It remains the only page-gutter owner and the only vertical scroll composition; `#root` and `main.app-shell-main` are not changed.

Each dashboard section below owns one local surface and one local content inset (`p-4 sm:p-5 lg:p-6`, with the hero allowed to use its existing generous balance treatment). No child renderer adds an equivalent `p-3`/`p-6`. Thus the shell supplies the page gutter, the section supplies its content breathing room, and the child supplies only layout/content.

| Home region                  | Surface owner                                                    | Padding/inset                                                                                      | Child responsibility                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free-limit warning           | Existing `FreeLimitWarning`/`Alert`                              | Keep existing alert padding and semantics                                                          | Not part of the card de-nesting; do not change upgrade route or warning logic.                                                                                        |
| Balance hero                 | `DesktopDashboard` or `MobileDashboard`                          | One responsive inset around the balance header, toggle, native amounts, equivalent, and provenance | No inner card. Keep hero elevation.                                                                                                                                   |
| Summary metrics              | The branch dashboard, around all metrics as one group            | One inset around the shared grid                                                                   | Metric cells are plain `min-w-0` content; no individual surfaces or padding equivalent to the section.                                                                |
| Recent transactions          | Branch dashboard wrapper                                         | One inset; keep the existing tutorial attribute on desktop                                         | `RecentTransactions` retains its heading/view-all affordance and list behavior, but owns no visual surface or row card.                                               |
| Quick actions                | Branch dashboard wrapper                                         | One inset and the existing section heading                                                         | `QuickActions` owns only the four actionable controls and the modal behavior. Controls may retain control-level elevation.                                            |
| Spending                     | A new/retained branch section wrapper around `LazySpendingChart` | One inset                                                                                          | `SpendingChart` remains an accessible content section, but its root is no longer a visual card. Its period control and chart title remain inside it.                  |
| Income sources               | A sibling branch section wrapper around `IncomeSources`          | One inset                                                                                          | `IncomeSources` remains an accessible content section, but its root is no longer a visual card.                                                                       |
| Accounts                     | Branch dashboard wrapper                                         | One inset and the existing branch heading (`Tus Cuentas`/`RESUMEN DE CUENTAS`)                     | `AccountsOverview` renders only its list, empty state, and flat total footer; remove its duplicate `Cuentas`/`Resumen General` header.                                |
| Desktop goals                | `DesktopDashboard` inline goals section                          | One inset                                                                                          | Goal progress items are plain progress content, not cards; preserve the first two goals, CTA tile text, and summary calculations. Mobile does not render goals today. |
| Desktop tip / mobile insight | Existing branch wrapper                                          | One inset                                                                                          | Keep the tip/insight content; use a divider for the desktop tip subsection and remove non-actionable elevation.                                                       |

Use the same file-local flat-surface class recipe in each branch if repetition needs reducing; do not create or export a `HomeSection`/new design-system primitive. A local class constant is acceptable only to avoid repeating the same literal class list within that file.

The branch root keeps only its vertical rhythm (`space-y-6` on mobile and `space-y-8` on desktop). Remove redundant `mb-8` margins from the desktop balance, metrics, and content-grid wrappers so the root owns vertical section spacing once.

## 4. Responsive composition

The responsive behavior is CSS composition inside the existing desktop/mobile branch split; it does not change the branch decision or item order.

| Viewport   | Branch and shell                                                                                                                               | Composition and overflow rules                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **320px**  | Mobile branch; the shell contributes 16px horizontal gutter on each side, leaving about 288px for Home                                         | Every section is full available width with a compact inset. Metrics are one column. Spending/income detail rows are one column; account and transaction content may wrap. The donut uses its existing 280px height but is constrained to the available width. Period tabs may scroll inside their own tablist, never the page. Amounts use `min-w-0`, `break-words`, and no `whitespace-nowrap` on long source strings. |
| **375px**  | Mobile branch; about 343px section width before local section padding                                                                          | Same one-column metric stack and section order. Native VES/USD lines can reflow while retaining symbols/codes and equivalent/source disclosure. Quick-action controls remain full-width with at least 44px height.                                                                                                                                                                                                      |
| **430px**  | Mobile branch; about 398px section width before local section padding                                                                          | Same mobile order and one-column metrics. Chart/source/account rows use the extra width without introducing a second card layer. No horizontal page overflow.                                                                                                                                                                                                                                                           |
| **768px**  | Still mobile branch because the JS threshold is 1024; the existing transaction child also selects its mobile row layout at `max-width: 768px`  | The shared grid changes to two metric columns at `sm`; the third metric occupies the next row. Chart and income detail grids may use two columns. Sections remain single surfaces and the mobile navigation/safe-area behavior is untouched.                                                                                                                                                                            |
| **1024px** | Desktop branch exactly at the existing threshold; with an open sidebar the usable content area can be substantially narrower than the viewport | The shared metric grid remains two columns until `xl`, preventing three cramped columns in the content area. Desktop recent/quick composition uses the existing `lg` two-column layout. Spending and income stack in the left support column while accounts occupy the right support column. Goal items use two columns until `xl`.                                                                                     |
| **1280px** | Desktop branch; `xl` utilities apply                                                                                                           | Three summary metric columns fit. Recent transactions spans the wider content portion and quick actions remain alongside it. The spending/income left support group remains beside accounts. Detail rows use two columns where already supported, with no row cards.                                                                                                                                                    |
| **1440px** | Desktop branch; content remains capped by the existing `max-w-6xl` shell                                                                       | Keep the 1280px composition rather than stretching surfaces indefinitely. Preserve generous outer breathing room, one section surface each, and clear dividers.                                                                                                                                                                                                                                                         |

The shared metric recipe is `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` in both branch returns. This is the common visual rule, while the branch-specific lower layouts remain as they are structurally (desktop side-by-side support content versus mobile sequential content).

## 5. Layer removals and component treatment

### Dashboard branches

In `desktop-dashboard.tsx` and `mobile-dashboard.tsx`:

- Keep one `glass-card`/border/tint surface for the hero, with `shadow-ios-md` as the only non-control section elevation. Remove its `hover-lift`, hover background/shadow escalation, and `active:scale-[0.99]`; the balance surface is not itself a button.
- Replace the three individual metric `glass-card` wrappers with one flat metrics surface and a shared responsive grid. Remove each metric's `glass-card`, `rounded-2xl`, border, card background, `shadow-ios-md`, `hover:bg-card/90`, `hover:shadow-ios-lg`, `hover-lift`, and scale classes. Keep labels, status icons/dots, signs, provenance, and item order.
- Keep layout-only grid wrappers unstyled. In desktop, split the current spending/income card into two sibling visual sections inside a layout-only left support column. In mobile, replace the combined spending-and-income card with two sibling section surfaces. This preserves visual order while removing the outer card around two card children.
- Keep the current branch headings where they are useful. Remove the duplicated desktop/mobile parent heading above `SpendingChart` because the chart's existing `Gastos por Categoría` title remains; remove the duplicated parent `RecentTransactions` heading because that component's existing heading remains. Keep the dashboard heading for quick actions and accounts; remove the duplicate `AccountsOverview` internal header.
- Remove redundant `mb-8` section margins. Do not modify any `useMemo`, repository call, rate hook, `showBalances` state, `loadAllData` effect, `scrollToQuickActions`, period prop, or goals calculation.

### Amounts and the balance visibility control

- Primary hero numbers use `amount-strong`/`amount-emphasis-main` with `text-3xl` for the converted total and `text-2xl` for native currency lines. Standard metric values use `text-2xl`; transaction counts remain `text-3xl`. The numeric spans retain tabular figures through the existing amount utility (and explicit `tabular-nums` where the renderer does not use an amount utility).
- Keep the existing native strings and equivalent/source/freshness semantics. If a label, number, and provenance are split into spans for wrapping, concatenate the same existing values in the same order; do not call a different formatter or recompute a total. Native VES/USD lines remain identifiable, and a current-rate projection remains explicitly attributable to its existing source.
- Detail/list amounts may remain smaller than headline metrics (`text-base`/`text-lg`) to avoid turning a dense row into a headline, but must be tabular and must not clip. Chart center totals, account totals, and other section-level totals use `text-2xl` or `text-3xl`.
- Replace literal `text-white` on mobile balance amounts with `text-foreground`/the existing amount utility so the same visible content works in light and dark themes.
- Preserve `showBalances` default `true`, `aria-pressed`, `Eye`/`EyeOff`, `Ocultar`/`Mostrar`, the obscured value, and the exact visible value/provenance branches. Add/retain `min-h-[44px] min-w-[44px]` and `focus-ring` on the toggle. No other metric becomes hidden because of this change.

### `spending-chart.tsx`

Keep `SpendingChartProps`, memoization, filtering, conversion, category aggregation, `MAX_VISIBLE_CATEGORIES`, period callbacks, pie selection, `aria-label`, and category navigation unchanged.

- Change the root section to layout/semantic classes only (for example `space-y-6` plus the supplied `className`). Remove its `glass-card`, `rounded-3xl`, border, `bg-card/45`, `p-3`, `shadow-ios`, and `backdrop-blur-xl`; the dashboard parent now owns the surface and inset.
- Keep the count pill as a semantic count control, but do not add another surface around the title. Keep the period tab group as a low-contrast control group with no blur or shadow; keep 44px tab targets, selected state, and focus visibility.
- Flatten the empty state to padded text/icon content. Remove the empty container's `rounded-3xl`/border/background/blur and the icon's bordered rounded wrapper; retain the message and icon so empty is distinguishable from loading.
- Flatten the donut center annotation by removing its `rounded-2xl`, border, `shadow-lg`, and `backdrop-blur-md`. A restrained background tint may remain behind the text, but it is not a card. Keep the total/category text and selection behavior.
- Replace category detail button card chrome (`glass-card`, rounded-2xl, per-row border/background, blur, and selected `scale-[1.02]`/`shadow-ios-md`) with a `divide-y`/subtle-hover row treatment. Retain button semantics, `min-h-[44px]`, `aria-pressed`, disabled `Otras` behavior, keyboard focus, hover/selection opacity, and the existing route. Remove the icon wrapper's rounded border, padding-as-card, and blur; retain the colored icon/dot as a compact data marker. Remove the dot's shadow. Progress/selection transitions may remain, but no row hover-scale remains.
- Apply the same flattening to `SpendingChartSkeleton`: no row card borders/backgrounds/rounded shells; skeleton bars and the donut placeholder may keep shape rounding because they are loading shapes, not surfaces.

### `income-sources.tsx`

Keep the period filtering, source aggregation, conversion, percentages, pie interactions, roles, labels, and `IncomeSourcesProps` unchanged.

- Remove the root `glass-card`, `rounded-3xl`, border, background, `p-3`, shadow, and blur. The dashboard section owns those.
- Make loading and empty treatments plain section-associated states: retain the 280px placeholder/message and `aria-label`, but remove their card borders, rounded shells, and blur; remove the decorative empty icon shell.
- Remove the center annotation's rounded border, shadow, and blur while retaining its values and labels.
- Change source details from card tiles to a one-column `divide-y` list on narrow widths and the existing two-column arrangement at `sm` if it remains useful. Each item gets a subtle bottom divider and `py-3`, not `rounded-2xl`, `border`, `bg-card/45`, `glass-card`, or `backdrop-blur-xl`. Remove `whitespace-nowrap` from the amount span; use a constrained, right-aligned, tabular value that can wrap at 320px. The source name, amount, and percentage remain unchanged.

### `recent-transactions.tsx`

Keep `RecentTransactionsProps`, account-name mapping, rate selection, `formatAmount`, original-currency display, VES equivalent, pending text, transaction order, optional view-all callback, and optional transaction callback.

- Retain the component heading and optional `Button`; add/retain a 44px target and focus state for view-all. The dashboard parent no longer renders a duplicate heading.
- Replace loading row cards (`rounded-lg border bg-card p-4`) with a flat divided skeleton list. Skeleton shapes may remain rounded.
- Replace populated row cards (`cursor-pointer rounded-lg border bg-card`, hover border/shadow, and hovered shadow state) with `divide-y` rows using `py-4`, `min-w-0`, and a subtle background hover/focus treatment. Remove `hover:scale`/lift behavior and the `shadow-md`/`shadow-sm` row layers. Keep compact icon circles and semantic badges only as markers; they are not surfaces and receive no border, shadow, or blur.
- If `onTransactionClick` is supplied, preserve its click outcome and add the keyboard equivalent (`role="button"`, `tabIndex`, Enter/Space handling, and visible focus). If it is absent, do not advertise a false interactive row. This is an accessibility equivalent, not a new action or route.
- Promote row amounts from the current desktop `text-sm` to a readable tabular `text-base`/`text-lg` treatment without changing the formatted string or native/converted currency meaning. Keep pending text and non-color labels/icons.

### `accounts-overview.tsx`

Keep the hook, BCV rate use, account mapping, balance-change calculations, account order, native currency string (`Bs... VES` or the existing currency code), empty copy, and total calculation unchanged.

- Remove the internal `Cuentas`/`Resumen General` header because the branch surface supplies the section heading.
- Replace the account `space-y-3` card rows with a `divide-y` list. Rows use `min-w-0`, `gap-4`, and `py-4`; remove `transition-ios`, `rounded-2xl`, per-row borders/backgrounds, `shadow-ios-sm`, `backdrop-blur-xl`, and `hover:scale-[1.01]`/hover shadow. Use a subtle hover background only if needed for scanability.
- Remove the account icon container's rounded border, shadow, and blur; retain a fixed icon target/colored icon marker. Keep `Inactiva` and `Nuevo` pills because they convey status, but do not treat them as cards.
- Flatten the total footer by retaining its divider and spacing but removing `ios-card`, its background gradient as a nested surface, border/blur/shadow/hover behavior, and inner `p-6`. Render the total as an `amount-emphasis-main text-3xl tabular-nums` value and retain the change indicator/copy.
- Keep the empty icon as plain content and make the existing `Crear cuenta` button explicitly 44px high with focus styling. Do not add a handler or change its current behavior.

### `quick-actions.tsx`

Keep `ACTIONS_DATA`, priority order, `handleActionClick`, `TransactionForm` types, `useModal`, and the exact `/transactions/add` and `/transfers` routes unchanged.

- The dashboard owns the quick-action section surface. The action buttons remain individual actionable controls, so they may retain a subtle border, rounded control shape, `shadow-ios-sm`/hover shadow, and `active:scale-[0.98]`.
- Remove `backdrop-blur-xl` from the button and remove the icon wrapper's `rounded-xl`, border, `bg-card/40`, `shadow-ios-sm`, blur, and hover border. The icon is a direct/fixed-size marker inside the control.
- Remove `hover:scale-[1.02]`; use color/contrast and the allowed control shadow for hover. Add/retain `min-h-[44px]`, `focus-ring`, and the current active state. This leaves elevation only on the actionable control, not on a card inside it.

### Desktop goals and the mobile insight

The Home desktop goals UI is inline in `desktop-dashboard.tsx`; `components/goals/goal-card.tsx` is not rendered by Home and is not changed. The goals repository call, catch/logger behavior, summary calculations, `slice(0, 2)`, CTA text, and ordering remain unchanged.

- Keep one goals surface and its heading/summary. Flatten loading placeholders to divider/plain skeleton rows, removing each placeholder's rounded border/background/blur/shadow.
- Flatten the two goal progress items and the final CTA tile by removing `rounded-xl`, per-tile border/background, `shadow-lg`, `backdrop-blur-sm`, and hover shadow/scale. Keep progress-bar rounding because it is a progress indicator, and keep state labels/icons/colors with text so meaning is not color-only. Keep the existing `Ver todas` control text and make its target/focus state 44px without inventing a route.
- Keep desktop's tip as a border-top subsection without a card. Keep mobile's `PERSPECTIVA FINANCIERA` as one flat section surface, removing its non-actionable hover-lift/active-scale/shadow escalation.

## 6. State, themes, and accessibility contract

### Loading, empty, and error states

Loading branches are preserved exactly: desktop summary loading remains the three-stat loading branch, but its placeholders are rendered as flat content inside the single metric surface rather than through the shared card-shaped `SkeletonStatCard`; chart loading remains `SpendingChartSkeleton`; income loading remains its 280px placeholder; recent transaction loading remains its skeleton list; goals loading remains its existing branch. The shared `components/ui/skeleton-stat-card.tsx` is left unchanged because it is also used by reports/accounts skeletons outside Home.

Empty messages and existing available actions remain verbatim and section-associated. Removing decorative shells must not turn an empty state into a zero amount or an indistinguishable blank.

`useOptimizedData` already has an `error` field, but the current Home branches do not render it; the desktop goals loader logs its error and follows its existing non-loading branch. This visual-only change will not add a new error/retry API, silently convert errors into calculated zeros, or alter the existing catch/finally behavior. If an existing caller supplies an error-bearing treatment, only its surrounding visual shell is flattened and its `role="alert"`, copy, and retry callback are retained. Error behavior is therefore not broadened into a separate feature in this bounded change.

### Light and dark themes

Use `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`, `text-success`, `text-error`, and `text-warning` tokens for touched surfaces and states. Keep the existing high-contrast category palette because it is data-driven and covered by chart tests. Statuses retain text/icon/badge labels in addition to color. Remove literal white text from the mobile balance. The existing CSS variables in `app/globals.css` and the `amount-strong` tabular utility already cover both themes; no global CSS change is needed.

### Accessibility and touch

- Keep semantic section headings/`aria-labelledby`, chart `role="img"` labels, tablist/tab selection, list roles, pending labels, and existing button labels.
- Every existing button/control gets at least `min-h-[44px] min-w-[44px]` where its natural width is not already sufficient: balance toggle, header shortcut, period tabs, quick actions, chart category controls, view-all, goal header control, account empty action, and existing mobile actions.
- Retain `focus-ring`/global `:focus-visible`; add it to chart tabs/category buttons and quick-action controls if the current class list does not already expose the shared focus treatment. Never replace focus with hover-only styling.
- Preserve DOM order for keyboard traversal and do not create a new overflow or focus-trap container. The existing `#root` scroll owner, mobile chrome padding, safe-area behavior, global FAB, and modal portal behavior remain unchanged.

## 7. Data flow and contracts

The data flow remains:

`HomePage -> LocalProvidersForRootDashboard -> MainLayout -> LazyDashboardContent -> DashboardContent -> DesktopDashboard|MobileDashboard`.

`DashboardContent` continues to own the shared period/reference selection and passes the same props to both charts. Dashboard branches continue to call `useOptimizedData`, rate hooks, and (desktop only) `repository.goals.getGoalsWithProgress`. The existing `useMemo` calculations and `loadAllData`/goals effects are not moved or rewritten.

`SpendingChart`, `IncomeSources`, `RecentTransactions`, `AccountsOverview`, and `QuickActions` keep their current exports and prop shapes. Only their returned visual wrappers/classes and, for transaction callbacks, keyboard-equivalent event handling change. Routes, modal types, scroll target `#quick-actions`, rate source/freshness disclosure, category navigation query string, transaction/account labels, source ordering, signs, precision, and currency provenance remain unchanged.

Desktop and mobile share the same surface/divider/amount/focus principles through parallel class composition. They are not merged: desktop has goals/tip and a different summary/projection presentation, while mobile has the insight section and its existing live-projection disclosure. This avoids a risky rewrite of two independent data/rendering branches.

## 8. Focused tests

Add only behavior/regression coverage that protects the visual refactor's contracts:

1. Extend or add `tests/components/home-summary-visual-hierarchy.test.tsx` with mocked repository/data dependencies to render each branch's visible balance. Assert the default visible VES/USD and equivalent/source text, click the toggle, assert `aria-pressed` and obscured values, click again, and assert the exact original values/disclosures return. Assert the branch does not introduce a descendant `glass-card` inside a Home section where a flat list/content renderer is expected.
2. Keep `tests/components/dashboard-period-sync.test.tsx` as the period synchronization contract: both chart consumers receive the same period and reference time after branch changes.
3. Keep `tests/components/spending-chart.test.tsx` for loading, empty, conversion, boundary filtering, category selection, and navigation; add only a small DOM assertion if needed to ensure the chart root/category details no longer carry nested card chrome.
4. Extend `tests/components/recent-transactions.test.tsx` with the existing VES/native-plus-equivalent display and, when a callback is supplied, keyboard activation/focus behavior. Do not snapshot formatted layout.
5. Run `tests/app/app-shell-scroll-contract.test.tsx` to guard the unchanged shell scroll owner, plus the existing mobile overflow suite and authenticated `tests/e2e/25-transfer-canonical-flow.spec.ts` to guard mobile containment and quick-action transfer navigation/no persistence.

Use semantic queries and focused class/role checks rather than broad snapshots. No new shared test fixture or design abstraction is warranted.

## 9. Real-run visual validation plan

After implementation, run the actual app in the repository's configured Playwright lane, not only mocked Jest renders:

1. Use the authenticated canonical-user lane for representative populated data (`PLAYWRIGHT_LANE=auth-required npm run e2e:auth-required ...`) and the no-auth/bypass lane for the honest empty-state shell. Keep test data isolated; do not seed production data.
2. Visit `/` and capture full-page screenshots at exact viewport widths **320, 375, 430, 768, 1024, 1280, and 1440** in both light and dark themes. At 768 confirm mobile navigation/row composition; at 1024 confirm the desktop branch boundary. Review hero, metrics, spending, income, recent, accounts, goals/tip or insight, and mobile chrome.
3. During the same real run, evaluate `document.documentElement.scrollWidth`, `document.body.scrollWidth`, and `#root.scrollWidth`; each must be no greater than `innerWidth + 1`. Check that long VES/USD values and provenance remain readable at 320px and that the period tablist scrolls internally rather than expanding the page.
4. Inspect the DOM/computed styles for the affected Home sections: no `.glass-card` is nested under another Home section surface; flat rows have dividers/subtle tint instead of per-row shadow/border cards; only the hero and actionable controls have elevation; section content has no second equivalent inset.
5. Exercise the real controls with pointer and keyboard: toggle amounts off/on and compare exact values/provenance, activate the header quick shortcut, open income/expense forms, verify `/transactions/add` and `/transfers`, change period tabs, select a chart category, use view-all when supplied, and tab through all controls. Verify focus rings and 44px hit boxes in both themes.
6. Repeat with loading throttling and an intentionally failed existing data request/repository path. Confirm skeleton/empty/error copy remains honest and no incomplete or fabricated monetary value appears. Do not introduce a new retry path as part of this visual change.
7. Finish with the configured checks: focused DOM tests, `npm run lint`, `npm run type-check`, `npm run build`, and the relevant Playwright suites. If visual differences are intentional, record the seven-width light/dark screenshots as review evidence rather than adding a broad snapshot baseline.

## 10. Rollout and rollback

Implement in one small visual commit limited to the dashboard renderers/child renderers and focused tests listed above. `components/layout/main-layout.tsx` and `app/globals.css` are reviewed but intentionally unchanged because their existing scroll, gutter, focus, theme, and tabular-number contracts are reusable and shared by other routes. Do not stage or alter unrelated copied `.claude` skill line-ending changes in the worktree.

Rollback is a normal revert of the visual commit; there is no migration, cache invalidation, API change, or data rollback. The primary release guard is the real-run seven-width light/dark check plus the existing period, overflow, shell, and action tests.
