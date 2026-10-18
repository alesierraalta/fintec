# FinTec UI/UX, Landing, Mobile, Motion, and Skills Compliance Audit

**Audit date:** 2026-08-31
**Repository:** FinTec
**Audit mode:** Read-only source audit coordinated by six independent exploration subagents
**Report status:** Complete exploration handoff; no application code or skills were modified
**Objective:** Identify what the current application does not satisfy from the relevant UI, UX, accessibility, landing, mobile, motion, and design-system guidance, while preserving the existing FinTec black/blue/green identity as a future redesign constraint.

---

## Executive verdict

FinTec has a recognizable identity and a useful technical foundation: semantic CSS variables, safe-area utilities, a centralized application shell, explicit mobile/desktop branches on several complex flows, accessible newer mobile navigation, and reusable form primitives.

The application does not comply consistently with its own design skills or with the external UI/UX standards selected for this audit. The main issue is systemic rather than cosmetic:

> Glass, blur, rounded corners, borders, shadows, and interaction effects are applied to too many surfaces at once.

That policy creates the exact symptoms reported by the product owner:

- boxes inside boxes;
- weak distinction between page, section, card, control, and overlay;
- several visual systems living beside one another;
- motion that is present but fragmented or decorative;
- route-local exceptions that bypass shared primitives;
- documentation and implementation that disagree;
- a landing funnel whose conversion cannot currently be measured reliably.

### Overall assessment

| Area                    | Assessment     | Highest concern                                                                                                                                       |
| ----------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual direction        | PARTIAL / FAIL | Recognizable dark/iOS/glass intent, but generic gradients, emoji headers, Inter, and repeated card grids reduce distinctiveness.                      |
| Surface hierarchy       | FAIL — P0      | The default Card and route compositions are simultaneously structural, glass, elevated, hoverable, and pressable.                                     |
| Nested containers       | FAIL — P0      | Equivalent surfaces are stacked in dashboards, charts, forms, admin sections, and product routes.                                                     |
| Token discipline        | FAIL — P1      | Semantic tokens exist but route code frequently uses raw colors and legacy aliases.                                                                   |
| Documentation alignment | FAIL — P0      | Dark values, glass aliases, route groups, and amount treatments do not consistently match implementation.                                             |
| UX/accessibility        | PARTIAL        | Newer navigation, focus styles, inputs, and mobile targets are strong; dialogs, labels, errors, menus, and hidden actions are inconsistent.           |
| Motion                  | PARTIAL / FAIL | CSS reduced motion exists, but Framer Motion is not governed by the same policy and route continuity is absent.                                       |
| Mobile                  | PARTIAL        | Safe areas, shell geometry, and several explicit branches are good; breakpoints, drawers, keyboard states, and duplicated actions need consolidation. |
| Landing conversion      | PARTIAL        | The active landing is coherent in several places, but mobile routing and incomplete funnel instrumentation suppress learning.                         |
| Runtime certainty       | UNKNOWN        | No complete browser, device, contrast, Lighthouse, or authenticated-flow pass was part of this source audit.                                          |

### Severity definitions

- **P0:** Systemic or money-flow issue that should be resolved or explicitly accepted before broad redesign work.
- **P1:** High-impact issue affecting multiple routes, accessibility, conversion, motion safety, or maintainability.
- **P2:** Important polish, discoverability, consistency, or cleanup issue for the bounded migration.

### Status definitions

- **PASS:** The source consistently satisfies the criterion.
- **PARTIAL:** The pattern exists but is inconsistent, bypassed, or incomplete.
- **FAIL:** The implementation contradicts the criterion or creates a repeated defect.
- **UNKNOWN:** Static inspection cannot prove runtime behavior.

---

## 1. Audit method and evaluated sources

### 1.1 Exploration topology

Six independent read-only exploration passes were used:

1. Visual language: surfaces, hierarchy, palette, typography, glass, cards, gradients, and anti-generic design.
2. UX and accessibility: forms, dialogs, menus, focus, keyboard, labels, errors, touch targets, and feedback.
3. Landing and conversion: public routes, hero, CTAs, trust, pricing, auth transitions, responsive acquisition, and analytics instrumentation.
4. Mobile, responsive, and motion: breakpoints, safe areas, drawers, FABs, onboarding, Framer Motion, CSS motion, and reduced motion.
5. Design-system architecture: tokens, primitives, aliases, duplication, route shells, charts, and documentation drift.
6. Whole-app reconnaissance: route inventory, product-area hotspots, shell ownership, loading states, and browser validation gaps.

Each subagent was instructed to read applicable skills first, remain read-only, avoid generated/worktree snapshots, distinguish facts from hypotheses, and provide paths and line ranges.

### 1.2 Local skills evaluated

| Skill                       | Intended responsibility                                                           | Result                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| frontend-aesthetics         | Distinctive, production-grade visual direction; avoid generic AI aesthetics       | PARTIAL / FAIL: intent exists, but generic repeated patterns dominate.                                            |
| mobile-ux-design            | Mobile-first layout, safe areas, Tailwind, animation, responsive behavior         | PARTIAL: shell foundation is good, but motion, drawer, breakpoint, and target contracts are fragmented.           |
| web-interface-guidelines    | Accessibility, interaction, forms, focus, motion, performance, theming, UX review | PARTIAL / FAIL: several reusable patterns fail consistent focus, labels, errors, and reduced-motion expectations. |
| fintec-frontend-design      | FinTec black/iOS/glass conventions and financial presentation                     | PARTIAL: applied broadly, but the policy itself causes surface nesting and is not consistently followed.          |
| fintec-accessibility        | WCAG, keyboard, screen readers, ARIA, VoiceOver, reduced motion                   | PARTIAL: newer navigation and inputs are stronger than legacy dialogs/forms/gestures.                             |
| fintec-tailwind-patterns    | Semantic colors, breakpoints, spacing, shadows, animation, tokens                 | FAIL: token definitions exist but are not enforced in route code.                                                 |
| fintec-nextjs-patterns      | Route groups, server/client boundaries, lazy loading, Next.js page architecture   | PARTIAL / FAIL: good boundaries exist, but documented route groups and shell ownership do not match the tree.     |
| vercel-react-best-practices | React/Next performance and data-fetching patterns                                 | UNKNOWN / PARTIAL: lazy boundaries exist, but a runtime performance baseline was not captured.                    |

### 1.3 External skills and references

Adoption numbers are approximate snapshots from skills.sh and indicate adoption, not correctness.

| Source                            | Adoption/reputation signal                                               | Useful contribution                                                                      | Decision                                                       |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Anthropic frontend-design         | About 838K installs; official Anthropic repository with about 172K stars | Intentional visual direction, type/color/composition/motion/texture, anti-generic output | Recommended foundation                                         |
| Vercel web-design-guidelines      | About 594K installs; official Vercel repository with about 30K stars     | 100+ accessibility, form, focus, typography, performance, touch, theme, and motion rules | Recommended quality gate                                       |
| Taste-Skill design-taste-frontend | About 426K installs; community repository with about 83K stars           | Brief inference, anti-slop critique, design variance, motion intensity, visual density   | Optional critique lens                                         |
| UI/UX Pro Max                     | About 338K installs; community repository with about 123K stars          | Large style, palette, type, pattern, chart, and stack catalog                            | Optional idea generator only; Trust Hub security audit flagged |
| Mobile App UI Design              | About 8K installs; 296 stars; security checks shown as passing           | Mobile screen polish and professional app patterns                                       | Optional Capacitor supplement                                  |
| Landing Page Conversion Audit     | About 34K installs; source repository showed 0 stars                     | Ranked, element-specific conversion findings                                             | Methodology only until source confidence improves              |
| Web Motion Design                 | About 1K installs; 78 stars                                              | Disney 12 principles translated to web motion                                            | Optional specialist reference                                  |

### 1.4 Authoritative references

- **Refactoring UI — Adam Wathan and Steve Schoger:** hierarchy, whitespace, spacing systems, type scale, limited choices, personality, and avoiding the urge to fill every surface.
- **Nielsen Norman Group — Jakob Nielsen:** visibility of system status, consistency, error prevention, recognition over recall, user control, and aesthetic/minimalist design.
- **Vercel Geist:** high-contrast colors, grid, typography, materials, and modern component foundations.
- **Apple and Material motion guidance:** motion should explain continuity and state changes rather than become permanent decoration.

### 1.5 Limitations

- No complete authenticated browser journey was executed.
- No full real-device visual pass was executed at all target widths.
- No complete WCAG contrast calculation, axe scan, Lighthouse run, or Core Web Vitals baseline was captured.
- No live screen-reader traversal was performed.
- Source counts are grep-based and are not visual-quality scores.
- Runtime verification is required before treating every source finding as a confirmed production defect.

---

## 2. Current application surface inventory

| Area                 | Main routes and evidence                                               | Current architecture                                                              | Main concern                                                          |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Landing/public       | /; app/page.tsx:83-110; app/(public)/components/landing-page.tsx:12-28 | Server route chooses authenticated dashboard, desktop landing, or mobile redirect | Anonymous mobile traffic can bypass the value proposition.            |
| Public conversion    | /pricing, /download, /waitlist, privacy, terms                         | Separate page-specific shells; public layout is effectively empty                 | Public-to-auth transitions are not one visible or measurable system.  |
| Auth                 | /auth/login, /auth/register, forgot/reset                              | Client forms with session redirects; native onboarding from login                 | Form semantics, confirmation flow, and attribution are inconsistent.  |
| Dashboard/home       | /; dashboard-content; mobile-dashboard; desktop-dashboard              | Strong explicit mobile/desktop split                                              | Deep nested surfaces and duplicated visual rules.                     |
| Accounts             | /accounts; accounts-page-client.tsx                                    | Auth-guarded client page with extensive Framer Motion                             | Motion and card decoration compete with financial data.               |
| Transactions         | /transactions, /transactions/add                                       | Explicit list/add mobile and desktop variants                                     | Money-entry auth and overlay behavior require runtime verification.   |
| Budgets              | /budgets; app/budgets/page.tsx                                         | Client page with local loading, forms, and FAB                                    | Repeated metric cards, pulses, raw colors, and local shell ownership. |
| Goals                | /goals; app/goals/page.tsx                                             | Client CRUD/contribution page with modal forms                                    | Repeated surfaces, hover-only actions, local filters.                 |
| Debts                | /debts; debts-page-client.tsx                                          | Auth-guarded client page, mostly CSS responsive                                   | Opaque legacy styling and inconsistent states.                        |
| Recurring            | /recurring; recurring-page-client.tsx                                  | Client CRUD with direct API fetches                                               | Solid status cards diverge from the dark system.                      |
| Transfers            | /transfers; transfer-content.tsx                                       | Explicit mobile/desktop content split                                             | No observed route-level auth guard; money-flow verification required. |
| Reports              | /reports; lazy-reports-content; mobile/desktop reports                 | Good lazy boundary and responsive split                                           | Chart and scroll behavior require device validation.                  |
| Chat/AI              | /chat; chat-page-client.tsx                                            | Full-height shell exception                                                       | Keyboard, composer, viewport, and nested-scroll risk.                 |
| Pricing/subscription | /pricing, /subscription, /subscription/success                         | Anonymous/authenticated pricing branches and manual checkout                      | Pricing expectations are not fully explained before auth.             |
| Settings/profile     | /settings, /profile                                                    | Auth-guarded client pages with local shell ownership                              | Small toggles and inconsistent semantics.                             |
| Admin                | /admin, /admin/payment-orders                                          | Main page server guard; payment orders retain a client guard                      | Centralized stats but still surface-heavy; two guard patterns.        |
| Onboarding           | Native-only overlay from login                                         | Safe-area-aware mobile component                                                  | Recent work is stronger; motion policy is not unified.                |
| Supporting routes    | Categories, calculator, backups, P2P, payment orders                   | Mixed client/server and route-local composition                                   | Several visual, loading, and action systems coexist.                  |

### Shared shell observations

- app/layout.tsx:42-78 sets locale, Inter, viewport fit, providers, root scroll container, analytics, toaster, service worker, and modal root.
- components/layout/main-layout.tsx:38-147 owns sidebar, header, mobile drawer, mobile nav, FAB, transaction modal, safe-area padding, and the chat full-height exception.
- components/layout/navigation.tsx:21-45 defines five mobile primary destinations; secondary destinations are behind a drawer.
- Dashboard, reports, transfers, and add-transaction use explicit mobile/desktop composition branches.
- Budgets, goals, debts, recurring, settings, categories, and backups mostly rely on CSS responsiveness and local compositions.

---

## 3. Current design baseline

### 3.1 Declared identity

The design documentation at docs/design.md:21-43 declares:

- dark-mode-first;
- pure black background;
- glass morphism throughout;
- iOS-native rounded surfaces;
- subtle 120–350ms motion;
- high-contrast financial amounts;
- tabular money numbers.

Global glass definitions exist in app/globals.css:155-188. Semantic and brand token families exist in tailwind.config.ts:21-138.

The identity is recognizable. The redesign problem is role discipline: the system does not sufficiently distinguish a canvas, grouping, card, control, interactive object, and overlay.

### 3.2 Source inventory signals

A conservative scan of app/ and components/ produced:

| Pattern                      | Approximate occurrences | Interpretation                                             |
| ---------------------------- | ----------------------: | ---------------------------------------------------------- |
| glass-card                   |                      42 | Glass frequently acts as a default structural wrapper.     |
| Rounded utility classes      |                   1,162 | Radius is pervasive and not role-specific.                 |
| Borders                      |                   1,708 | Borders are frequently combined with other elevation cues. |
| Shadows                      |                     394 | Elevation is repeated even for static content.             |
| Transition utilities         |                     487 | Motion is distributed rather than governed.                |
| Tailwind animation utilities |                     184 | Loading and decoration share broad mechanisms.             |
| Framer Motion elements       |                     116 | JS-driven motion is substantial.                           |
| AnimatePresence              |                      25 | Present, but not a route continuity system.                |
| ViewTransition               |                       0 | No native route/shared-element transition layer observed.  |

These are source indicators, not a visual score.

### 3.3 Legacy governance risk

skills/fintec-frontend-design/SKILL.md makes glass morphism a mandatory critical pattern and emphasizes black-theme/iOS-card conventions. The design document also encourages glass throughout.

That is now a governance risk. If future agents are told every new surface must be glass, they will continue producing nested blur/border/radius/shadow combinations even when a modern redesign is intended.

The skill should be revised after the target surface matrix is selected. Glass should remain part of the FinTec identity, but become an optional material with explicit roles rather than a universal structural rule.

---

## 4. Cross-cutting design-system findings

### DS-001 — Default Card is overloaded and creates false interactivity

**Status:** FAIL
**Severity:** P0
**Skills:** frontend-aesthetics, fintec-frontend-design, fintec-tailwind-patterns, web-interface-guidelines

**Evidence:** components/ui/card.tsx:10-20 combines rounded-2xl, border, bg-card/80, glass-card, shadow-ios-md, hover shadow, hover background, hover lift, transition, and active scale.

A structural container therefore looks clickable. Consumers then add additional radius, background, border, blur, and shadow classes.

**Impact:** Static information appears interactive, while true interactive surfaces do not have a unique grammar.

**Remediation principle:** Split Surface, Card, InteractiveCard, Overlay, and Control roles. Neutral content must not receive hover lift or active scale by default.

### DS-002 — Equivalent surfaces are nested repeatedly

**Status:** FAIL
**Severity:** P0
**Skills:** frontend-aesthetics, Refactoring UI, fintec-frontend-design

**Evidence:**

- components/dashboard/desktop-dashboard.tsx:431-646;
- components/dashboard/mobile-dashboard.tsx:286-508;
- components/dashboard/spending-chart.tsx:399-605;
- app/budgets/page.tsx:267-371;
- app/goals/page.tsx:314-388;
- components/admin/admin-stats-dashboard.tsx:97-149;
- components/admin/page-visits-section.tsx:44-148.

Outer sections, metric cards, chart legends, empty states, filters, and labels repeatedly use equivalent rounded, border, translucent, blur, and shadow treatments.

**Impact:** Users parse decoration instead of financial hierarchy.

**Remediation principle:** Prefer whitespace, typography, separators, and alignment. A child surface must have a clearly different semantic role from its parent.

### DS-003 — Documentation and runtime tokens disagree

**Status:** FAIL
**Severity:** P0
**Skills:** fintec-frontend-design, fintec-tailwind-patterns, fintec-nextjs-patterns

**Evidence:**

- docs/design.md:46-58 documents dark card around 3%, secondary around 8%, muted around 5%, and muted text around 70%;
- app/globals.css:51-82 uses card around 9%, secondary around 16%, muted around 12%, and muted foreground around 65%;
- docs/design.md:39 says dark mode is mandatory, while app/route-aware-providers.tsx:39-55 uses ThemeProvider defaultTheme system and app/layout.tsx does not visibly force a dark class;
- docs describe black-theme/opaque treatments, while app/globals.css:253-259 aliases black-theme-card to ios-card;
- amount text-shadow behavior is documented but was not found in the inspected global implementation;
- the Next.js skill describes a public/app route-group structure, while most authenticated pages are directly under app/ and manually wrap MainLayout.

**Impact:** Future agents receive contradictory instructions and can reintroduce drift after every redesign slice.

**Remediation principle:** Choose the source of truth, update docs and skills together, and add explicit examples of allowed non-glass surfaces and non-interactive cards.

### DS-004 — Semantic color tokens are defined but not enforced

**Status:** FAIL
**Severity:** P1
**Skills:** fintec-tailwind-patterns, fintec-frontend-design, Vercel web-design-guidelines

**Evidence:** raw green, red, blue, purple, amber, yellow, gray, neutral, and white/dark utilities remain in dashboard, goals, budgets, reports, filters, categories, accounts, and recurring. Representative locations include:

- components/dashboard/mobile-dashboard.tsx:244,341,389,438,529;
- components/dashboard/desktop-dashboard.tsx:372,467,497,527,723-744;
- components/categories/category-card.tsx:95,113,155-156;
- components/dashboard/accounts-overview.tsx:218-232,289;
- components/filters/transaction-filters.tsx:136-286;
- components/reports/mobile-reports.tsx:213-815;
- app/recurring/recurring-page-client.tsx:424-478.

**Impact:** Status meaning and contrast vary by page. Palette preservation is difficult when color role is encoded in local class strings.

**Remediation principle:** Map positive, negative, warning, info, neutral, and accent roles centrally while preserving FinTec blue, green, and black hues.

### DS-005 — Typography is available but not governed

**Status:** PARTIAL
**Severity:** P1
**Skills:** frontend-aesthetics, Refactoring UI, fintec-tailwind-patterns

**Evidence:** tailwind.config.ts:144-190 defines display and iOS scales, but app/layout.tsx:14-18 globally loads Inter and public/product routes frequently use raw text-3xl through text-7xl. components/dashboard/stat-card.tsx uses the iOS scale while nearby dashboard compositions use raw sizes.

**Impact:** Marketing and product surfaces feel like separate systems without a documented reason. The result is competent but generic.

**Remediation principle:** Define one body family, one display treatment, a finite type scale, line-length limits, and explicit public/product exceptions.

### DS-006 — Shared primitives are bypassed or carry too much decoration

**Status:** PARTIAL / FAIL
**Severity:** P1
**Evidence:**

- components/ui/button.tsx:28-46 adds shadow, blur, hover lift, and micro-bounce behavior to base/variants;
- the small Button size is h-9, below the local 44px target expectation;
- components/ui/input.tsx:43-76 combines h-12, rounded-xl, border-2, translucent background, glass-light, shadow, hover shadow, blur, and entrance animation;
- components/ui/select.tsx:33-41 uses card-level glass and shadow for a form control;
- components/ui/badge.tsx:11-20 uses direct gray/blue/status colors;
- important route controls bypass Button/Input/Select in accounts, filters, headers, goals, categories, landing, and forms.

**Remediation principle:** Make primitives semantically minimal. Controls should not look like cards. Elevation and motion must be opt-in.

### DS-007 — Charts lack canonical presentation primitives

**Status:** FAIL
**Severity:** P1
**Evidence:** components/dashboard/spending-chart.tsx:399-605 contains an outer glass surface, a surfaced period selector, a surfaced empty state, a surfaced chart center label, and surfaced legend rows. Admin charts use a separate simpler grammar.

**Impact:** Data visualization becomes one of the densest parts of the interface.

**Remediation principle:** Establish ChartPanel, ChartHeader, ChartPeriodTabs, ChartLegend, ChartTooltip, and ChartEmptyState with one surface contract.

### DS-008 — Shell ownership and route architecture are inconsistent

**Status:** PARTIAL / FAIL
**Severity:** P0/P1
**Skills:** fintec-nextjs-patterns, mobile-ux-design, vercel-react-best-practices

**Evidence:** debts wraps a client page in MainLayout at route level, while budgets, goals, and subscription render MainLayout inside client implementations. The public layout is effectively empty. Most authenticated routes are not in the documented app route group.

**Impact:** Loading behavior, scroll ownership, responsive padding, shell transitions, and future redesign boundaries are harder to reason about.

**Remediation principle:** Choose one shell ownership model and document it before broad visual migration.

### DS-009 — Public, app, admin, and native surfaces lack an explicit relationship

**Status:** PARTIAL
**Severity:** P1/P2

The surfaces share some brand colors but use different combinations of glass, ios-card, bg-card, bg-background, direct colors, radius, and shadow. The repository does not document which differences are intentional.

**Remediation principle:** Define shared brand foundations and contextual rules for public marketing, product workspace, admin/data-dense views, and native onboarding.

---

## 5. UX and accessibility findings

### UX-001 — Modal focus containment is incomplete

**Status:** FAIL
**Severity:** P1
**Evidence:**

- components/ui/modal.tsx:68-85,125-130 focuses/restores focus but does not trap Tab;
- components/ui/alert-dialog.tsx:97-123 handles Escape and aria-modal but lacks complete initial focus, restoration, and title/description association;
- components/layout/mobile-drawer.tsx:20-39,56-76 focuses the drawer but does not contain keyboard focus;
- app/(public)/components/mobile-menu.tsx:20-102 is stronger, creating an inconsistent modal family.

**Remediation principle:** Use one dialog primitive with focus containment, initial focus, restoration, Escape handling, background isolation, and reliable labels.

### UX-002 — Form labels are not consistently associated

**Status:** FAIL
**Severity:** P1
**Evidence:**

- components/forms/goal-form.tsx:177-221,249-258 uses labels without reliable htmlFor association;
- the goal textarea label is not explicitly associated;
- components/forms/budget-form.tsx:140-185 places labels beside Select/Input controls with unrelated generated IDs;
- components/forms/account-form.tsx:235-266 labels a choice group without clear group semantics or selected-state exposure.

**Remediation principle:** Every field gets one stable ID and one associated label. Choice groups expose group name and selected state.

### UX-003 — Async errors are not consistently announced

**Status:** PARTIAL / FAIL
**Severity:** P1
**Evidence:**

- components/ui/input.tsx:55-77 exposes invalid/described-by state, but error text lacks a consistent live-region strategy;
- components/forms/account-form.tsx:215-220 renders errors without role alert or aria-live;
- components/forms/category-form.tsx:112-120 replaces the modal with an error panel without alert semantics;
- components/forms/budget-form.tsx:107-109 has an empty submission catch block.

**Remediation principle:** Keep field errors beside fields and announce async failures visibly and to assistive technology.

### UX-004 — Menus and dialogs lack one complete naming/focus pattern

**Status:** PARTIAL / FAIL
**Severity:** P1
**Evidence:** alert-dialog has alertdialog and aria-modal without robust labelledby/describedby; header dropdowns have aria-expanded without a complete menu/focus contract; notification panel focus movement/restoration is inconsistent.

**Remediation principle:** Treat menus, dialogs, notification panels, and drawers as complete interaction patterns, not styled containers.

### UX-005 — Goal actions are hover-revealed

**Status:** FAIL
**Severity:** P2
**Evidence:** components/goals/goal-card.tsx:135-159 hides View/Edit/Delete controls with opacity-0 and group-hover. There is no equivalent focus-within reveal and title attributes are not sufficient labels.

**Remediation principle:** Keep critical actions visible or reveal them on hover and focus-within with explicit labels.

### UX-006 — Gesture actions are not sufficiently discoverable

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/ui/swipeable-card.tsx:109-151 provides keyboard activation and labelled action buttons, but important actions are primarily revealed after a gesture and the swipe hint is visual.

**Remediation principle:** Gestures are shortcuts, never the only discoverable path.

### UX-007 — Loading states are not consistently announced

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/ui/loading.tsx:17-43, components/ui/suspense-loading.tsx:27-44, app/loading.tsx, app/transactions/loading.tsx, and route-local spinners use different visual/status contracts.

**Remediation principle:** Preserve page context, expose busy/status state, and use motion-safe skeleton or spinner variants consistently.

### UX-008 — Search controls rely on placeholders instead of labels

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/layout/header.tsx:390-409, app/goals/page.tsx:449-457, and app/categories/page.tsx:420-433.

**Remediation principle:** Placeholders are hints, not labels. Use visible or visually hidden labels.

### UX-009 — Too many competing primary-action locations

**Status:** PARTIAL
**Severity:** P2

The same create action can appear in the sidebar, header add menu, global FAB, and route-local FAB. Categories adds view/filter controls beside a large summary. This increases scanning and decision cost.

**Remediation principle:** Establish one primary action location per viewport and keep secondary actions contextual.

### UX-010 — Visual decoration competes with task comprehension

**Status:** PARTIAL
**Severity:** P2

Animated status dots, gradient headings, pulse layers, and glow effects appear in goals, budgets, accounts, transactions, empty states, and the FAB without always communicating a changing state.

**Remediation principle:** Reserve emphasis and motion for status change, progress, feedback, and navigation continuity.

### Positive UX/accessibility evidence

- app/globals.css:111-119 provides a visible focus outline.
- components/layout/mobile-nav.tsx:13-29 uses semantic navigation, active state, safe-area padding, and 44px targets.
- components/layout/mobile-drawer.tsx:56-76 provides dialog semantics, Escape handling, safe areas, and focus restoration.
- components/ui/input.tsx:19-77 supports generated IDs, invalid state, and described-by relationships when used through its label API.
- components/ui/swipeable-card.tsx:149-177 provides keyboard activation and labelled actions.
- app/(public)/components/mobile-menu.tsx:20-102 has stronger focus trapping/restoration than the app drawer.
- components/layout/sidebar.tsx:112-127 correctly uses aria-current for active navigation.

---

## 6. Mobile, responsive, and motion findings

### MOT-001 — Framer Motion is not governed by reduced-motion preference

**Status:** FAIL
**Severity:** P1
**Evidence:** No useReducedMotion usage was found. Framer Motion is used in auth, accounts, header, modals, FABs, swipe cards, loading, and other components. CSS media queries cannot reliably suppress JS-driven transforms, springs, drag scale, and stagger behavior.

**Remediation principle:** Establish one motion preference policy shared by CSS and Framer Motion. Preserve state/content changes while disabling spatial, spring, drag, stagger, pulse, and chart movement when requested.

### MOT-002 — There is no route/page continuity system

**Status:** FAIL
**Severity:** P1
**Evidence:** No ViewTransition, view-transition-name, or route-level AnimatePresence transition was observed. app/route-aware-providers.tsx:26-51 only handles providers.

**Remediation principle:** Add lightweight route transitions using View Transitions where supported, opacity/transform fallback, and reduced-motion handling.

### MOT-003 — Mobile drawer motion and focus behavior are inconsistent

**Status:** PARTIAL / FAIL
**Severity:** P1/P2
**Evidence:** components/layout/mobile-drawer.tsx:55-81 renders without enter/exit motion and lacks a focus trap. app/(public)/components/mobile-menu.tsx:127-130 has transition-transform and stronger focus behavior. The public menu lacks explicit background inertness and bottom safe-area padding.

**Remediation principle:** Make app and public drawers one interaction family.

### MOT-004 — Breakpoint ownership is fragmented

**Status:** PARTIAL
**Severity:** P1
**Evidence:** the app shell uses a 1024px boundary in contexts/sidebar-context.tsx:31 and components/ui/floating-action-button.tsx:51; public navigation switches around md/768px in app/(public)/components/mobile-menu.tsx:103,115,128.

**Remediation principle:** Define breakpoint ownership centrally or document why contexts intentionally differ.

### MOT-005 — Decorative infinite animation is excessive

**Status:** FAIL
**Severity:** P2
**Evidence:** pulse/ping/glow effects occur in goals, budgets, accounts, transactions, empty state, and components/ui/floating-action-button.tsx:91-142.

**Remediation principle:** No infinite decoration by default. Use motion for loading, progress, success, navigation, or direct feedback.

### MOT-006 — Multiple motion systems are uncoordinated

**Status:** PARTIAL
**Severity:** P2
**Evidence:** CSS motion exists in app/globals.css:160-218, Tailwind animations in tailwind.config.ts:220-273, central Framer variants in lib/animations/index.ts:23-404, and local definitions throughout components. No imports of central variants were found outside that file.

**Remediation principle:** Adopt one variant/token source or remove/deprecate unused variants.

### MOT-007 — Loading motion is fragmented

**Status:** PARTIAL
**Severity:** P1
**Evidence:** skeleton pulse, Framer entrance, animate-spin, pulsing text, route-local spinners, and text-only loading states coexist in shared loaders and product routes.

**Remediation principle:** Use skeleton-first states for known structure and one motion-safe spinner for indeterminate operations.

### MOT-008 — Touch targets are inconsistent

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/layout/header.tsx:194 uses h-10 w-10 for mobile menu; settings toggles in app/settings/settings-page-client.tsx:203-210,262-270 are visually below 44px; small Button is h-9; mobile nav/drawer links satisfy the target contract.

**Remediation principle:** Every interactive hit area should be at least 44px even when the visible icon is smaller.

### MOT-009 — Onboarding needs the global motion contract

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/onboarding/mobile-onboarding.tsx:52-119 is safe-area-aware and native-only, but its transition behavior and reduced-motion path are not governed by the same policy as the rest of the app.

**Remediation principle:** Keep the single full-screen onboarding surface while sharing motion preference, direction, and no-decoration rules.

### Positive mobile/motion evidence

- app/globals.css:340-378 includes global CSS reduced-motion handling.
- Safe-area variables/utilities exist in app/globals.css:7-10,148-151 and tailwind.config.ts:192-195.
- components/layout/mobile-nav.tsx:24 uses large mobile targets.
- hooks/use-mobile-chrome-geometry.ts and MainLayout provide measured mobile chrome compensation.
- Dashboard, reports, transfers, and add-transaction have explicit mobile/desktop branches where semantics differ.
- Recent onboarding and FAB work provides stronger containment and geometry foundations than older routes.

---

## 7. Landing page and conversion findings

### LAND-001 — Anonymous mobile web traffic can bypass the landing page

**Status:** FAIL
**Severity:** P1
**Evidence:** app/page.tsx:96-107 redirects unauthenticated mobile user agents directly to /auth/login before they see hero, product explanation, rate cockpit, pricing, FAQ, trust content, or final CTA.

**Impact:** If mobile is a primary acquisition context, the product explanation is removed from the visitor who needs it most.

**Remediation principle:** Keep anonymous mobile web visitors on the landing. Route to auth only after an explicit CTA or distinguish native Capacitor traffic from ordinary mobile web reliably.

### LAND-002 — CTA and registration events are incomplete

**Status:** PARTIAL
**Severity:** P1
**Evidence:**

- event definitions: lib/analytics/landing-events.ts:1-23;
- tracked hero links: app/(public)/components/hero-section.tsx:18-20;
- untracked final CTA: app/(public)/components/cta-section.tsx:25-39;
- untracked pricing CTAs: app/(public)/components/pricing-preview-section.tsx:110-131;
- untracked nav actions: app/(public)/components/landing-nav.tsx:38-59;
- untracked waitlist form: components/waitlist/WaitlistForm.tsx:22-61.

Defined but apparently unused events include register_start, register_complete, binance_exit_click, rate_cockpit_view, rate_state_change, and rate_retry_click.

**Remediation principle:** Track CTA impression/click by location, register arrival, form start, submit, account creation, email verification, login success, pricing selection, download, and waitlist outcomes.

### LAND-003 — The waitlist popularity claim is unsupported in source

**Status:** FAIL
**Severity:** P1
**Evidence:** components/waitlist/WaitlistForm.tsx:177-180 claims more than 2,000 people are waiting, but no supporting dynamic source was found.

Related honesty signals are stronger elsewhere: testimonials are intentionally disabled in app/(public)/components/data.ts:45-47, social links are empty in data.ts:94-96, and the beta disclaimer appears in app/(public)/components/landing-footer.tsx:136-140.

**Remediation principle:** Remove the claim or connect it to a dated, verifiable source.

### LAND-004 — Structured metadata contains placeholder social profiles

**Status:** PARTIAL / FAIL
**Severity:** P1
**Evidence:** app/page.tsx:20-48 includes sameAs values for x.com/fintec, github.com/fintec, and linkedin.com/company/fintec while visible social links are intentionally empty.

**Remediation principle:** Remove unverified sameAs entries or replace them with confirmed profiles.

### LAND-005 — The conversion story is broad instead of sharply differentiated

**Status:** PARTIAL
**Severity:** P1
**Evidence:** hero, features, pricing, and footer communicate accounts, transactions, budgets, currency conversion, BCV rates, Binance P2P, security, AI, mobile, and plans.

The strongest differentiator is the Venezuelan rate cockpit, but it is presented as one feature rather than the central reason to choose FinTec.

**Remediation principle:** Lead with one outcome: help Venezuelan users make financial decisions in changing currency conditions. Make every section reinforce that promise.

### LAND-006 — Pricing expectations are not fully explained before auth

**Status:** PARTIAL
**Severity:** P1/P2
**Evidence:** app/pricing/public-pricing-client.tsx:15-167, app/pricing/page.tsx:7-20, and app/pricing/pricing-page-client.tsx:34-41.

The landing does not clearly explain why payment uses Binance Pay, what happens after registration, whether a selected plan survives auth, or when a paid plan becomes active.

**Remediation principle:** Explain create-account → activate-plan → payment before the click and preserve the selected plan through auth.

### LAND-007 — Hero mockup is honest but not sufficiently demonstrative

**Status:** PARTIAL
**Severity:** P2
**Evidence:** app/(public)/components/hero-section.tsx:24-36 shows an illustrative dashboard with balance, accounts, progress, and movements, but not the strongest rate-to-budget decision workflow.

**Remediation principle:** Demonstrate a real workflow: rate change → recalculated budget → clear decision.

### LAND-008 — Active and orphaned landing components are ambiguous

**Status:** PARTIAL / UNKNOWN
**Severity:** P2

The active tree renders landing-nav, hero-section, rate-cockpit, evidence-strip, features-section, FAQ-section, pricing-preview-section, CTA-section, and landing-footer. stats-section.tsx, testimonials-section.tsx, and live-rates-section.tsx exist but are not rendered.

**Remediation principle:** Mark alternatives as deprecated or remove them in a landing-only cleanup.

### LAND-009 — Navigation prioritizes actions inconsistently

**Status:** PARTIAL
**Severity:** P2

The landing navigation exposes Inicio, Pricing, Descargar, Iniciar Sesión, and Registrarse. Login receives filled primary styling while registration is outlined in landing-nav.tsx:52-56. Pricing remains English inside mostly Spanish copy, and Download competes for prominence.

**Remediation principle:** Use Planes, make registration the primary acquisition action, and subordinate Download unless it is the main acquisition path.

### LAND-010 — Registration has friction and weak lifecycle visibility

**Status:** PARTIAL
**Severity:** P2
**Evidence:** components/auth/register-form.tsx:78-104,117-185,303-457.

The form requests full name, email, password, and confirmation before value is experienced. Email confirmation introduces a five-second redirect delay. Complete registration lifecycle events were not observed, and privacy/terms consent was not observed in the inspected form.

**Remediation principle:** Clarify why each field is needed, measure every transition, and consider a shorter first step only if product policy permits.

### 7.1 Landing analytics context

The Vercel production project was queried for the 30-day window ending 2026-08-31:

- 234 pageviews;
- 40 period-unique anonymous visitor IDs;
- 8 days with non-zero traffic;
- daily peaks of 99 pageviews/10 daily IDs on 2026-08-25 and 68 pageviews/10 daily IDs on 2026-08-28;
- / pageviews: 79;
- /auth/register: 5 pageviews and 3 unique IDs;
- /auth/login: 22 pageviews;
- /admin: 20 pageviews;
- /accounts: 26 pageviews;
- /transactions: 16 pageviews;
- /download: 15 pageviews.

Vercel visitor IDs are anonymous and reset daily; they are not people and cannot be joined to Supabase users. The current code has the global Analytics mount but no custom registration tracking.

**Interpretation:** Internal routes and existing-user activity inflate visits relative to registration. Separate public acquisition from admin/app traffic and add lifecycle events before evaluating a redesign.

### Positive landing evidence

- The landing has a coherent component sequence and Spanish product copy.
- The rate cockpit is a credible differentiator.
- Beta status is explicit and fabricated testimonials/social proof are intentionally avoided in several places.
- Public mobile menu has stronger focus behavior than several authenticated overlays.
- Rate-related content uses lazy/intersection loading.
- The waitlist code avoids pulling unnecessary validation dependencies into the public bundle.

---

## 8. Whole-app flow and route risks

### FLOW-001 — Money-entry routes need explicit auth verification

**Status:** UNKNOWN / HIGH RISK
**Severity:** P0
**Evidence:** app/transactions/add/page.tsx:1-13 directly renders MainLayout/add content without an observed server auth guard; app/transfers/page.tsx:1-12 directly renders TransferContent without an observed route-level auth guard; MainLayout exposes a global action to transactions/add.

This may be protected indirectly by providers or client behavior, but the source audit did not establish the same server-protected contract used elsewhere.

**Required follow-up:** Verify direct unauthenticated URL access, redirect flashes, provider failure, and form reachability before redesigning these money flows.

### FLOW-002 — Mobile shell density and overlay collisions are high risk

**Status:** PARTIAL / UNKNOWN
**Severity:** P0/P1

Every authenticated page can receive header, bottom nav, mobile drawer, and FAB. Selected pages add route actions, forms, transaction modals, chat composer, receipt overlays, or toasts.

**Required follow-up:** Test 320–390px widths, landscape, keyboard-open forms/chat, iPhone safe areas, Android back, and FAB/nav/modal/toast stacking.

### FLOW-003 — Chat has a unique scroll contract

**Status:** UNKNOWN
**Severity:** P1
**Evidence:** MainLayout opts chat out of regular padding and uses full-height/overflow behavior; app/chat/page.tsx:22-49 adds a full-height flex structure.

**Required follow-up:** Verify composer visibility, keyboard resizing, safe areas, nested scroll, and transitions.

### FLOW-004 — Loading/error/empty contracts vary by product area

**Status:** FAIL
**Severity:** P1

Only a subset of routes have route-level loading files. Budgets, goals, recurring, debts, settings, backups, and other data-heavy routes use local spinners, text loading, toast-only errors, or local empty panels.

**Remediation principle:** Define page-shaped loading, honest empty, retryable error, and mutation-pending states for every data-heavy route.

### FLOW-005 — Public, auth, app, and admin transitions do not share one visible shell

**Status:** PARTIAL
**Severity:** P1/P2

The public layout is empty; landing, auth, download, waitlist, legal, app, and admin pages own different shells.

**Remediation principle:** Define when branding, navigation, spacing, and surface rules persist across transitions and when a mode change is intentional.

### FLOW-006 — Header contains possible dead-end destinations

**Status:** UNKNOWN / PARTIAL
**Severity:** P2
**Evidence:** components/layout/header.tsx:92-137 contains pushes/title mappings for /security and /support while the route inventory did not find those pages. It also contains legacy labels such as /budget, /savings, /crypto, and /cards.

**Required follow-up:** Exercise every user-menu action and remove or redirect dead destinations.

### FLOW-007 — Explicit mobile branches are strongest in only some areas

**Status:** PARTIAL
**Severity:** P1

Dashboard, reports, transfers, and add-transaction use explicit mobile/desktop components. Budgets, goals, debts, recurring, settings, categories, and backups mostly use CSS variants. This is not inherently wrong, but the repository does not distinguish semantic differences from historical duplication.

**Remediation principle:** Keep separate compositions only when interaction semantics differ; otherwise share structure and vary layout tokens.

---

## 9. Product-area hotspot matrix

| Area                    | Visual state                                                               | UX/motion state                                                               | Priority |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------: |
| Landing                 | Coherent but broad; generic type and incomplete active component ownership | Mobile redirect and incomplete conversion instrumentation                     |       P1 |
| Auth                    | Functional but separate from public brand shell                            | Labels, confirmation delay, missing lifecycle measurement, reduced-motion gap |       P1 |
| Dashboard               | Strongest responsive architecture but deepest nested-card density          | Decorative motion, repeated actions, no route continuity                      |    P0/P1 |
| Accounts                | Polished and animated                                                      | Heavy local Framer Motion and duplicated card styling                         |       P1 |
| Transactions            | Feature-rich and responsive                                                | Money-entry auth/overlay/scroll behavior requires verification                |    P0/P1 |
| Budgets                 | Repeated metric panels with gradients/pulses                               | Local loading/error/action patterns and raw status colors                     |       P1 |
| Goals                   | Repeated metric cards and custom hero                                      | Hover-only controls, filter semantics, duplicated actions                     |    P1/P2 |
| Debts                   | Opaque/legacy relative to dashboard                                        | Loading, filters, and field patterns vary                                     |       P1 |
| Recurring               | Solid status cards diverge from dark/glass language                        | Direct fetch/loading/toast patterns                                           |       P1 |
| Transfers               | Explicit responsive branch                                                 | Missing observed auth boundary                                                |       P0 |
| Reports                 | Good lazy/mobile-desktop architecture                                      | Chart, scroll, and contrast validation needed                                 |       P1 |
| Chat/AI                 | Unique full-height shell                                                   | Keyboard/composer/nested-scroll risk                                          |    P0/P1 |
| Pricing/subscription    | Mixed standard and custom surfaces                                         | Auth/plan/payment expectations unclear                                        |       P1 |
| Settings/profile        | Form-oriented but locally styled                                           | Toggle target/semantics and shell ownership                                   |    P1/P2 |
| Admin                   | Centralized data composition                                               | Consistent but over-cardized                                                  |       P1 |
| Onboarding              | Recent single-surface work is strong                                       | Global motion contract missing                                                |    P1/P2 |
| Categories              | Functional but dense                                                       | Search labels, semantic tokens, action hierarchy                              |       P2 |
| Calculator              | Motion-rich                                                                | Verify whether effects aid comprehension                                      |       P2 |
| Backups                 | Data/form heavy                                                            | Loading, scroll, overlays, keyboard states                                    |       P1 |
| P2P                     | Product-specific utility                                                   | Shell, auth, and loading consistency                                          |       P1 |
| Download/waitlist/legal | Public utility pages with separate shells                                  | Conversion, trust, mobile continuity                                          |    P1/P2 |

---

## 10. Recommended target design policy

This is a research-derived target, not an implementation instruction.

### 10.1 Preserve brand, change hierarchy

Keep the recognizable FinTec palette:

- pure black or near-black canvas;
- FinTec blue for primary action, active state, and links;
- emerald/green for positive financial meaning;
- red for negative/destructive meaning;
- restrained purple/accent use only where it has a product role.

Modernize role usage before changing hues.

### 10.2 Surface matrix

Use no more than three normal visual levels:

1. **Canvas:** page background; no blur, border, shadow, or radius.
2. **Section:** transparent or low-contrast grouping separated by whitespace and typography; optional hairline divider.
3. **Content surface:** one fill or one controlled translucent material, one border, and one elevation choice.

Exceptional levels:

- interactive surface: content surface plus explicit hover/focus/press state;
- overlay: stronger contrast/elevation for dialog/popover/drawer;
- control: compact input/select/button treatment, never card-level decoration.

Rules:

- no equivalent card inside a card;
- no hover lift on static content;
- no blur without a defined material role;
- no default border + shadow + blur + gradient stack;
- glass is an optional material, not a universal layout primitive.

### 10.3 Typography and spacing

- Define a finite display/body scale used across public and product contexts.
- Choose a distinctive display treatment without damaging financial readability.
- Bound body line length.
- Use whitespace before containers.
- Document when larger editorial spacing is allowed.
- Use tabular numerals and financial emphasis consistently.

### 10.4 Motion system

Provisional starting values for evaluation:

- micro interaction: 120–180ms;
- standard state transition: 180–240ms;
- major route or hero transition: 320–400ms;
- opacity and transform before layout-affecting properties;
- one primary motion narrative per page;
- no infinite decorative pulse;
- CSS and Framer Motion honor the same reduced-motion decision;
- reduced motion preserves content/state changes while removing spatial or repeating movement.

### 10.5 Product application direction

The authenticated app should become an open workspace rather than a grid of cards:

- one page header with clear context;
- one primary financial summary surface when necessary;
- sections separated by alignment and whitespace;
- contextual actions near the object they modify;
- charts and tables treated as data views, not decorative cards;
- fewer parallel create-action locations;
- calm surfaces around high-frequency financial information.

### 10.6 Landing direction

The landing should tell one story:

1. Venezuelan financial problem.
2. FinTec promise.
3. One concrete rate/budget/decision workflow.
4. Evidence that the product is real and honest about beta status.
5. One primary registration CTA.
6. Pricing and next steps without surprises.

Use product proof instead of unsupported popularity claims. Track the complete funnel before judging visual changes.

### 10.7 Mobile direction

- One documented breakpoint owner for shell behavior.
- One drawer/modal interaction contract.
- Persistent 44px hit areas.
- Safe-area and keyboard behavior tested as layout requirements.
- Gestures as shortcuts, not hidden primary actions.
- Shared shell and surface primitives across native onboarding, public mobile web, and authenticated mobile app.

---

## 11. Recommended remediation sequence

### Phase 0 — Freeze visual policy before broad restyling

1. Write a short target-direction brief.
2. Decide whether FinTec remains dark-only or supports system/light mode.
3. Reconcile docs/design.md, globals.css, tailwind.config.ts, and local skills.
4. Define the surface matrix and the no-equivalent-nesting rule.
5. Record the intentional differences between public, product, admin, and native contexts.

### Phase 1 — Establish neutral primitives

1. Split Surface, Card, InteractiveCard, Overlay, and Control roles.
2. Remove hover/press effects from neutral structural primitives.
3. Make Button, Input, Select, and Badge semantically minimal.
4. Preserve behavior, loading, labels, errors, icons, and financial semantics.
5. Make default interactive hit areas at least 44px.

### Phase 2 — Canonicalize repeated sections

Create and migrate gradually:

- PageHeader;
- SectionHeader;
- MetricCard or StatPanel;
- StatusBadge;
- ChartPanel;
- ChartEmptyState;
- SearchInput;
- FilterPanel;
- Field and FieldGroup;
- Dialog/Drawer interaction primitive.

Start with one representative route from dashboard, accounts, a CRUD page, admin, and landing.

### Phase 3 — Normalize colors, type, and spacing

1. Map raw status colors to semantic roles.
2. Replace legacy aliases or document exact use.
3. Migrate raw heading sizes to the agreed type scale.
4. Define page-level spacing contracts.
5. Keep palette hues stable until hierarchy is proven.

### Phase 4 — Unify motion

1. Define motion tokens and purposes.
2. Add one reduced-motion policy shared by CSS and Framer Motion.
3. Remove or gate infinite decorative pulses.
4. Adopt View Transitions or a lightweight route fallback.
5. Adopt lib/animations/index.ts or remove/deprecate it.

### Phase 5 — Unify shell ownership and responsive behavior

1. Choose route-level or client-level MainLayout ownership.
2. Define public, authenticated, admin, and native shell boundaries.
3. Document breakpoint ownership.
4. Unify drawer focus, safe-area, and motion behavior.
5. Keep explicit mobile/desktop markup only where semantics differ.

### Phase 6 — Fix high-impact UX/accessibility contracts

1. Focus-trap and label all dialogs/drawers.
2. Associate all form labels and choice groups.
3. Announce async errors and loading states.
4. Make hover-only actions keyboard/touch discoverable.
5. Label all search inputs.
6. Verify 44px targets and contrast.

### Phase 7 — Rebuild the landing funnel around evidence

1. Keep anonymous mobile web visitors on the landing.
2. Make registration the primary CTA.
3. Track CTA and registration lifecycle events.
4. Remove unsupported claims and placeholder metadata.
5. Sharpen the hero around one Venezuelan financial workflow.
6. Explain pricing/auth/payment continuity.
7. Compare conversion, not pageviews alone.

### Phase 8 — Runtime validation and guarded rollout

For each migrated slice:

- desktop and mobile browser pass;
- keyboard and screen-reader pass;
- reduced-motion pass;
- loading/error/empty/mutation pass;
- contrast and touch-target pass;
- Core Web Vitals and bundle impact check;
- route/auth/data behavior preserved.

Roll out by vertical slice, not by changing every card in the repository at once.

---

## 12. Acceptance criteria for a future redesign

### Visual hierarchy

- Page title, primary value, primary action, and current state are identifiable without parsing nested cards.
- Static content does not look interactive.
- Each child surface has a different semantic role from its parent.
- The palette remains recognizably FinTec without requiring gradients or multiple shadows.
- Public, app, admin, and native screens feel like one product with contextual modes.

### UX and accessibility

- Dialogs/drawers trap and restore focus correctly.
- Fields have associated labels and error descriptions.
- Async errors and loading states are visible and announced.
- Important actions are discoverable without hover or gesture knowledge.
- Interactive hit areas meet the chosen minimum, preferably 44px.
- Keyboard, VoiceOver/screen-reader, reduced-motion, and contrast checks pass.

### Motion

- Every animation has a stated purpose.
- No infinite decorative animation runs by default.
- CSS and Framer Motion honor the same reduced-motion decision.
- Route transitions preserve spatial/contextual continuity.
- Animation does not delay access to content or hide state changes.

### Landing conversion

- Anonymous mobile web sees the value proposition before auth.
- Every CTA has a measured click event with location/destination.
- Registration start, submit, account creation, email verification, login success, and failure are measurable.
- Unsupported social/popularity claims are removed or sourced.
- Vercel Analytics is used for aggregate traffic; first-party authenticated data is used for account attribution.
- Conversion decisions use cohorts/events, not raw pageviews alone.

### Engineering and maintainability

- One source of truth exists for surface, color, type, spacing, and motion tokens.
- One source of truth exists for shell ownership and breakpoints.
- Canonical primitives are used by new and migrated routes.
- Documentation and skills match implementation.
- A future agent cannot satisfy the design skill by adding another glass card to every section.

---

## 13. Browser/runtime validation still required

1. Direct unauthenticated access to transactions/add, transfers, payment-orders, and admin/payment-orders.
2. 320px, 350px, 375px, 390px, 430px, 768px, 1024px, 1280px, and 1440px rendering.
3. iPhone safe areas, Android back behavior, landscape, and keyboard-open forms.
4. Header menu, drawer, modal, FAB, bottom nav, and toast stacking.
5. Chat composer and scroll ownership.
6. Loading, empty, error, retry, and mutation states for every data-heavy route.
7. Actual contrast ratios in all active themes and surfaces.
8. Keyboard traversal and screen-reader announcements.
9. Framer Motion behavior with reduced motion.
10. Public-to-auth-to-dashboard continuity.
11. Vercel Core Web Vitals and bundle transfer before/after visual effect migration.
12. Landing CTA and registration funnel events after instrumentation.

---

## 14. Non-goals

- No application code was changed.
- No design system was rewritten.
- No skill was installed or removed.
- No palette replacement was proposed.
- No database, auth, payment, or business-logic refactor was proposed.
- No claim was made that every source finding is a confirmed runtime defect.
- No recommendation was made to add animation merely because the app feels static.

---

## Appendix A — Finding index

| ID       | Finding                                                               | Status          | Severity |
| -------- | --------------------------------------------------------------------- | --------------- | -------: |
| DS-001   | Default Card combines structure, material, elevation, and interaction | FAIL            |       P0 |
| DS-002   | Equivalent surfaces are nested across routes                          | FAIL            |       P0 |
| DS-003   | Documentation and runtime design contracts disagree                   | FAIL            |       P0 |
| DS-004   | Raw color utilities bypass semantic roles                             | FAIL            |       P1 |
| DS-005   | Typography scale exists but is not governed                           | PARTIAL         |       P1 |
| DS-006   | Primitives are bypassed or visually overloaded                        | PARTIAL/FAIL    |       P1 |
| DS-007   | Charts lack canonical presentation primitives                         | FAIL            |       P1 |
| DS-008   | Shell ownership and route architecture are inconsistent               | PARTIAL/FAIL    |    P0/P1 |
| DS-009   | Public/app/admin/native relationships are undocumented                | PARTIAL         |    P1/P2 |
| UX-001   | Dialog focus containment is incomplete                                | FAIL            |       P1 |
| UX-002   | Form labels are not consistently associated                           | FAIL            |       P1 |
| UX-003   | Async errors are inconsistently announced                             | PARTIAL/FAIL    |       P1 |
| UX-004   | Menus/dialogs lack one complete naming/focus contract                 | PARTIAL/FAIL    |       P1 |
| UX-005   | Goal actions are hover-revealed                                       | FAIL            |       P2 |
| UX-006   | Gesture actions are not sufficiently discoverable                     | PARTIAL         |       P2 |
| UX-007   | Loading states are not consistently announced                         | PARTIAL         |       P2 |
| UX-008   | Search relies on placeholders in several routes                       | PARTIAL         |       P2 |
| UX-009   | Too many competing primary-action locations                           | PARTIAL         |       P2 |
| UX-010   | Decoration competes with task comprehension                           | PARTIAL         |       P2 |
| MOT-001  | Framer Motion ignores the global reduced-motion contract              | FAIL            |       P1 |
| MOT-002  | No route/page continuity system                                       | FAIL            |       P1 |
| MOT-003  | App/public drawers differ in motion and focus                         | PARTIAL/FAIL    |    P1/P2 |
| MOT-004  | Breakpoint ownership is fragmented                                    | PARTIAL         |       P1 |
| MOT-005  | Decorative infinite animation is excessive                            | FAIL            |       P2 |
| MOT-006  | Multiple motion systems are uncoordinated                             | PARTIAL         |       P2 |
| MOT-007  | Loading motion is fragmented                                          | PARTIAL         |       P1 |
| MOT-008  | Touch targets are inconsistent                                        | PARTIAL         |       P2 |
| MOT-009  | Onboarding needs the global motion contract                           | PARTIAL         |       P2 |
| LAND-001 | Anonymous mobile web can bypass landing                               | FAIL            |       P1 |
| LAND-002 | CTA and registration events are incomplete                            | PARTIAL         |       P1 |
| LAND-003 | Waitlist popularity claim is unsupported                              | FAIL            |       P1 |
| LAND-004 | Structured metadata has placeholder social profiles                   | PARTIAL/FAIL    |       P1 |
| LAND-005 | Conversion story is broad rather than differentiated                  | PARTIAL         |       P1 |
| LAND-006 | Pricing/auth/payment expectations are unclear                         | PARTIAL         |    P1/P2 |
| LAND-007 | Hero does not demonstrate strongest workflow                          | PARTIAL         |       P2 |
| LAND-008 | Active and orphaned landing components are ambiguous                  | PARTIAL         |       P2 |
| LAND-009 | Landing navigation priorities are inconsistent                        | PARTIAL         |       P2 |
| LAND-010 | Registration has friction and weak lifecycle visibility               | PARTIAL         |       P2 |
| FLOW-001 | Money-entry auth boundaries need direct verification                  | UNKNOWN         |       P0 |
| FLOW-002 | Mobile shell density and overlay collisions are high risk             | PARTIAL/UNKNOWN |    P0/P1 |
| FLOW-003 | Chat has a unique scroll/keyboard contract                            | UNKNOWN         |       P1 |
| FLOW-004 | Loading/error/empty contracts vary by area                            | FAIL            |       P1 |
| FLOW-005 | Public/auth/app/admin shells are not one documented journey           | PARTIAL         |    P1/P2 |
| FLOW-006 | Header contains possible dead-end destinations                        | UNKNOWN/PARTIAL |       P2 |
| FLOW-007 | Explicit mobile composition is inconsistent by route                  | PARTIAL         |       P1 |

---

## Appendix B — Key evidence files

- docs/design.md
- app/globals.css
- tailwind.config.ts
- app/layout.tsx
- app/route-aware-providers.tsx
- app/page.tsx
- app/(public)/layout.tsx
- app/(public)/components/landing-page.tsx
- app/(public)/components/landing-nav.tsx
- app/(public)/components/mobile-menu.tsx
- app/(public)/components/hero-section.tsx
- app/(public)/components/cta-section.tsx
- app/(public)/components/pricing-preview-section.tsx
- app/(public)/components/rate-cockpit.tsx
- app/(public)/components/data.ts
- components/ui/card.tsx
- components/ui/button.tsx
- components/ui/input.tsx
- components/ui/select.tsx
- components/ui/badge.tsx
- components/layout/main-layout.tsx
- components/layout/header.tsx
- components/layout/mobile-nav.tsx
- components/layout/mobile-drawer.tsx
- components/layout/sidebar.tsx
- components/dashboard/desktop-dashboard.tsx
- components/dashboard/mobile-dashboard.tsx
- components/dashboard/spending-chart.tsx
- components/ui/floating-action-button.tsx
- components/ui/swipeable-card.tsx
- components/ui/empty-state.tsx
- components/onboarding/mobile-onboarding.tsx
- components/admin/admin-stats-dashboard.tsx
- components/admin/admin-stats-charts.tsx
- components/admin/page-visits-section.tsx
- components/forms/goal-form.tsx
- components/forms/budget-form.tsx
- components/forms/account-form.tsx
- components/auth/register-form.tsx
- components/waitlist/WaitlistForm.tsx
- lib/animations/index.ts
- lib/analytics/landing-events.ts
- skills/fintec-frontend-design/SKILL.md
- skills/fintec-accessibility/SKILL.md
- skills/fintec-tailwind-patterns/SKILL.md
- skills/fintec-nextjs-patterns/SKILL.md
- .claude/skills/frontend-aesthetics/SKILL.md
- .claude/skills/mobile-ux-design/SKILL.md
- .claude/skills/web-interface-guidelines/SKILL.md

---

## Final conclusion

FinTec does not need more isolated polish. It needs a governing visual system that is simpler, more explicit, and harder for future agents to misapply.

The most important decision is to preserve the palette while changing hierarchy:

- fewer equivalent surfaces;
- fewer containers;
- less default blur, shadow, and radius;
- more typography and whitespace;
- semantic colors;
- one motion policy;
- one shell contract;
- complete conversion instrumentation;
- accessibility as a design constraint, not a final scan.

The recommended next action is not to restyle every route. Approve the target design policy, update the local FinTec design skills and documentation, then migrate one representative landing slice and one representative authenticated slice under the new rules.
