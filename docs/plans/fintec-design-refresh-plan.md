# FinTec Design Refresh Implementation Plan

**Plan date:** 2026-08-31
**Plan status:** Draft for approval
**External skills review:** 2026-09-02 — Taste-Skill `main`, README, CHANGELOG, and all 13 `skills/*/SKILL.md` files
**Source audit:** ../audits/fintec-ui-ux-skills-compliance-audit.md
**Scope:** FinTec public landing, authenticated web application, admin surfaces, native/mobile-facing UI, design system, UX/accessibility, responsive behavior, motion, and conversion measurement
**Current state:** No application implementation is changed by this plan

---

## Executive plan statement

FinTec should not be redesigned by restyling every existing card in place. The audit found a system problem: the current rules encourage every surface to combine glass, blur, borders, shadows, rounded corners, and interaction effects. That produces nested boxes, weak hierarchy, route-to-route visual drift, and decorative rather than purposeful motion.

The plan is therefore a **governed, incremental migration**:

1. Freeze and approve a new visual policy.
2. Make shared primitives neutral and role-based.
3. Establish one surface, token, typography, shell, and motion contract.
4. Prove the new language on one landing slice and one authenticated slice.
5. Migrate the rest of the application by vertical route groups.
6. Validate accessibility, mobile behavior, motion, performance, auth, and financial behavior after every slice.

The existing black/blue/green palette remains. The hierarchy, surface density, component roles, and motion model change.

---

## 1. Goals and non-goals

### 1.1 Goals

- Make FinTec feel current, deliberate, fluid, and visually memorable.
- Preserve brand recognition through the current black, blue, green, red, and restrained accent palette.
- Replace nested equivalent boxes with whitespace, typography, alignment, and semantic surfaces.
- Make static data look static and interactive data look interactive.
- Establish a coherent relationship between landing, auth, product, admin, and native surfaces.
- Add motion where it communicates navigation, state change, progress, feedback, or continuity.
- Make CSS and Framer Motion obey the same reduced-motion policy.
- Improve mobile density, touch targets, safe areas, keyboard behavior, and overlay stacking.
- Make accessibility a design-system requirement rather than a final cleanup pass.
- Make landing conversion measurable from CTA intent through account creation and verification.
- Preserve all money calculations, auth rules, API contracts, repository behavior, and financial semantics.

### 1.2 Non-goals

- Do not replace the FinTec brand palette as the first redesign step.
- Do not rewrite the backend, repositories, database schema, or payment behavior for visual reasons.
- Do not migrate every route in one large change.
- Do not add animation merely because a screen feels static.
- Do not use fingerprinting or send personal user identifiers to Vercel Analytics.
- Do not make glass, gradients, blur, or shadows mandatory for every surface.
- Do not use `ui-ux-pro-max`, `design-taste-frontend`, or any community skill as the sole design authority.
- Do not call a source-only audit a completed browser/device validation.
- Do not remove gesture shortcuts unless an equivalent interaction is preserved.

---

## 2. Inputs and current baseline

### 2.1 Audit findings that drive this plan

The source audit contains 45 findings:

- 6 P0 findings;
- 26 P1 findings;
- 19 P2 findings.

Highest-impact findings:

- DS-001: default Card combines structure, material, elevation, and interaction;
- DS-002: equivalent surfaces are nested across the app;
- DS-003: design documentation and runtime tokens disagree;
- DS-008: shell ownership and route architecture are inconsistent;
- UX-001 through UX-004: modal focus, form labels, error announcements, and menu naming are incomplete;
- MOT-001 and MOT-002: Framer reduced motion and route continuity are incomplete;
- LAND-001 and LAND-002: mobile acquisition routing and conversion instrumentation are incomplete;
- FLOW-001 and FLOW-002: money-entry auth and mobile overlay behavior require direct validation.

### 2.2 Existing strengths to preserve

- Semantic CSS variables exist in app/globals.css.
- Brand and status token families exist in tailwind.config.ts.
- Safe-area variables and mobile chrome geometry exist.
- MainLayout centralizes important shell behavior.
- Dashboard, reports, transfers, and add-transaction have explicit responsive branches.
- Mobile navigation and public mobile menu have useful accessibility mechanics.
- Input supports IDs, invalid state, hints, and described-by relationships when used correctly.
- Landing has a credible rate-cockpit differentiator and an explicit beta position.
- Financial amounts already have tabular-number conventions in several areas.
- Vercel Analytics and Speed Insights are mounted once.
- Existing app behavior and financial domain semantics are valuable assets and must not be changed accidentally.

### 2.3 Current source signals

The source inventory found approximately:

| Pattern                      | Approximate occurrences | Planning implication                                                       |
| ---------------------------- | ----------------------: | -------------------------------------------------------------------------- |
| glass-card                   |                      42 | Convert from default decoration to explicit material role.                 |
| rounded utility classes      |                   1,162 | Establish role-specific radius rather than removing radius blindly.        |
| borders                      |                   1,708 | Use borders as hierarchy separators, not a universal second elevation cue. |
| shadows                      |                     394 | Reserve elevation for actual surfaces and overlays.                        |
| transition utilities         |                     487 | Replace scattered effects with motion tokens and purpose.                  |
| Tailwind animation utilities |                     184 | Separate loading motion from decoration.                                   |
| Framer Motion elements       |                     116 | Add reduced-motion governance and reduce local variants.                   |
| AnimatePresence              |                      25 | Use selectively for continuity, not as a substitute for route transitions. |
| ViewTransition               |                       0 | A route transition layer is not yet present.                               |

### 2.4 Baseline measurement requirements

Before a visual slice is migrated, capture:

- page screenshots at agreed desktop and mobile widths;
- keyboard traversal notes;
- reduced-motion behavior;
- loading, empty, error, and mutation states;
- LCP, INP, CLS, JavaScript transfer size, and route load timing where available;
- Vercel pageviews by public versus internal route;
- CTA and registration funnel events after instrumentation;
- existing financial values and transaction counts for regression comparison.

---

## 3. Design governance and skill usage

### 3.1 Skill roles

The skills are a coordinated stack, not competing authorities. Use the exact names below; every implementation unit must declare which skills are **Required**, **Supporting**, and **Validation**.

| Responsibility                 | Required authority                                                           | Supporting or conditional                                               | When used                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Visual direction               | `frontend-design`, `fintec-frontend-design`                                  | `design-taste-frontend` for public/landing composition, `ui-ux-pro-max` | Phase 0 public direction, landing, and pilot composition; optional skills never override project policy. |
| Product design and tokens      | `fintec-frontend-design`, `fintec-tailwind-patterns`                         | `frontend-design`                                                       | Surface roles, typography, spacing, semantic colors, amounts, and route migration.                       |
| UX and accessibility gate      | `fintec-accessibility`, `web-design-guidelines`                              | `mobile-app-ui-design`                                                  | Every UI unit before and after implementation.                                                           |
| Next.js and route architecture | `fintec-nextjs-patterns`                                                     | `fintec-typescript-patterns`                                            | Shell ownership, route boundaries, Server/Client components, loading, and lazy boundaries.               |
| Mobile and native UI           | `mobile-app-ui-design`, `fintec-accessibility`, `fintec-tailwind-patterns`   | `vercel-react-view-transitions`, `web-motion-design`                    | Mobile shell, Capacitor onboarding, safe areas, keyboard, touch targets, and Android/iOS behavior.       |
| Motion                         | `vercel-react-view-transitions`, `web-motion-design`, `fintec-accessibility` | `fintec-tailwind-patterns`, `fintec-nextjs-patterns`                    | Route continuity, drawers, loading, gestures, and reduced-motion policy.                                 |
| Landing conversion             | `landing-page-conversion-audit`                                              | `frontend-design`, `fintec-frontend-design`                             | Landing-only work after funnel events and traffic context exist.                                         |
| Runtime UX validation          | `real-run-validation`                                                        | `ux-audit` when a compatible browser runner is available                | Exercise real flows, not only source or unit tests.                                                      |
| Test selection and scope       | `test-strategy`                                                              | `no-excess-tests`, `exploit-testing`, `silent-degradation`              | Choose behavioral tests, probe high-risk flows, and detect silent failures.                              |
| Documentation and scope        | `cognitive-doc-design`                                                       | `right-size`                                                            | Policy, plan, work-unit boundaries, and review-facing evidence.                                          |

`fintec-frontend-design` currently contains the legacy “glass everywhere” rule. U0 must update that skill before it is used as the visual authority for later units.

### 3.2 Skill availability and authority

The authoritative skill IDs for this plan are the project-local `fintec-*` skills under `skills/` plus the project specialist skills under `.pi/skills/` (mirrored under `.agents/skills/`). The global skills used for testing and runtime validation are referenced by their installed IDs. Only `design-taste-frontend` from the upstream Taste-Skill repository is currently installed in this project; every other upstream ID in the catalog below is conditional until explicitly installed and re-reviewed.

Do not write unavailable aliases into a task or agent prompt:

| Stale or unavailable name     | Use instead                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-aesthetics`         | `frontend-design` or `design-taste-frontend`, depending on whether the task is direction or critique.                                           |
| `mobile-ux-design`            | `mobile-app-ui-design` plus `fintec-accessibility` and `fintec-tailwind-patterns`.                                                              |
| `web-interface-guidelines`    | `web-design-guidelines`.                                                                                                                        |
| `vercel-react-best-practices` | `fintec-nextjs-patterns`; add `real-run-validation` for runtime evidence.                                                                       |
| `testing-strategy`            | `test-strategy`.                                                                                                                                |
| `nextjs-patterns`             | `fintec-nextjs-patterns`.                                                                                                                       |
| `money-handling`              | No installed skill. Use the financial invariants in Section 8.5 and the explicit regression gate; aesthetics never authorize financial changes. |
| `Refactoring UI`              | Reference material only, not an invocable skill ID.                                                                                             |

#### Upstream Taste-Skill catalog review

Reviewed the upstream README, CHANGELOG, and all 13 `skills/*/SKILL.md` files at `https://github.com/leonxlnx/taste-skill`. The repository's default `design-taste-frontend` is v2 experimental; `design-taste-frontend-v1` is preserved for backward compatibility. The repository contains both implementation skills and image-only skills. Do not load the repository as a bundle.

| Upstream folder            | Exact install/frontmatter ID | Modality                  | FinTec status                   | Bounded placement                                                                                                                         |
| -------------------------- | ---------------------------- | ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `taste-skill`              | `design-taste-frontend`      | Frontend code             | Supporting                      | U3 and Route group F landing work only; v2 explicitly excludes dashboards, data tables, and multi-step product UI.                        |
| `taste-skill-v1`           | `design-taste-frontend-v1`   | Frontend code             | Exclude                         | Legacy compatibility only; no default plan placement.                                                                                     |
| `gpt-tasteskill`           | `gpt-taste`                  | Frontend code             | Exclude                         | Mandatory RNG/AIDA/GSAP and motion-heavy rules conflict with governed FinTec migration.                                                   |
| `image-to-code-skill`      | `image-to-code`              | Images plus code          | Conditional                     | U3 only, when an image-first reference is explicitly approved and image generation is available.                                          |
| `imagegen-frontend-mobile` | `imagegen-frontend-mobile`   | Images only               | Conditional                     | U7/Phase 5 mobile concept references; never an implementation authority.                                                                  |
| `imagegen-frontend-web`    | `imagegen-frontend-web`      | Images only               | Conditional                     | U3/Phase 6 landing references; use only when separate section images are an actual deliverable.                                           |
| `brandkit`                 | `brandkit`                   | Images only               | Conditional                     | U0 brand-board exploration only; current plan preserves the existing brand, so this is not a default step.                                |
| `redesign-skill`           | `redesign-existing-projects` | Frontend code             | Supporting, conditional install | U3–U10 selected route migrations; use its scan/diagnose/fix sequence, never its global-rewrite interpretation.                            |
| `soft-skill`               | `high-end-visual-design`     | Frontend code             | Exclude                         | Mandatory visual complexity, overlap, glass, and motion conflict with explicit surfaces, calm data, and reduced motion.                   |
| `minimalist-skill`         | `minimalist-ui`              | Frontend code             | Supporting, selective install   | U1/U4/U9 and Groups A/C for flat hierarchy, no-gradient, low-shadow restraint; ignore its warm-light palette and dependency preferences.  |
| `output-skill`             | `full-output-enforcement`    | Output discipline         | Conditional helper              | U0/U11 documentation or exhaustive handoffs only; it is not a visual or implementation authority.                                         |
| `brutalist-skill`          | `industrial-brutalist-ui`    | Frontend code             | Exclude                         | CRT/degradation effects, dense uppercase telemetry, and single-substrate rules conflict with FinTec's calm, readable financial workspace. |
| `stitch-skill`             | `stitch-design-taste`        | Google Stitch `DESIGN.md` | Conditional, Stitch only        | Use only if Google Stitch becomes an approved prototyping surface; it does not govern the Next.js implementation.                         |

**Taste-Skill placement rules:**

- Use at most one Taste-Skill implementation/style lens in a bounded unit; never load multiple competing visual recipes.
- `design-taste-frontend` is limited to landing/public composition. `minimalist-ui` is limited to structural restraint in product surfaces. `redesign-existing-projects` is a migration process helper, not a design authority.
- Image-only skills (`brandkit`, `imagegen-frontend-web`, `imagegen-frontend-mobile`) produce references, not code. `image-to-code` is allowed only when the image-first workflow is approved before implementation.
- Do not use any Taste-Skill as the authority for accessibility, reduced motion, authentication, financial meaning, API contracts, or Section 8.5 regression evidence.
- The excluded skills remain excluded even if installed later unless a new documented direction explicitly replaces Dark Precision / Editorial Fintech.

`ui-ux-pro-max` and the Taste-Skill community skills are optional critique/ideation inputs. The audit recorded a Trust Hub security warning for UI/UX Pro Max, so it must not make unreviewed dependency or architecture changes. `ux-audit` is conditional because its installed metadata is Claude-Code-only and it requires a compatible live browser; without that capability, the result is **Incomplete**, never a pass.

### 3.3 Phase skill assignment matrix

| Phase                  | Required                                                                                                                  | Supporting                                                                                                                                                                     | Validation                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 0 — Policy             | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `cognitive-doc-design`                           | `design-taste-frontend` for public direction, `brandkit` if a brand board is approved, `ui-ux-pro-max`, `right-size`                                                           | `fintec-accessibility`, `web-design-guidelines`                           |
| 1 — Primitives         | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-typescript-patterns`, `fintec-accessibility`                | `frontend-design`, `minimalist-ui` for structural restraint if installed                                                                                                       | `web-design-guidelines`, `test-strategy`, `no-excess-tests`               |
| 2 — Shell              | `fintec-nextjs-patterns`, `fintec-tailwind-patterns`, `fintec-accessibility`, `mobile-app-ui-design`                      | `fintec-typescript-patterns`                                                                                                                                                   | `web-design-guidelines`, `test-strategy`, `real-run-validation`           |
| 3 — Pilots             | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `fintec-accessibility` | `design-taste-frontend`, `redesign-existing-projects` if installed, `imagegen-frontend-web` or `image-to-code` only for an approved visual-reference workflow, `ui-ux-pro-max` | `web-design-guidelines`, `test-strategy`, `real-run-validation`           |
| 4 — UX/a11y            | `fintec-accessibility`, `web-design-guidelines`, `fintec-typescript-patterns`                                             | `mobile-app-ui-design`, `fintec-tailwind-patterns`                                                                                                                             | `test-strategy`, `no-excess-tests`, `real-run-validation`                 |
| 5 — Motion/mobile      | `vercel-react-view-transitions`, `web-motion-design`, `mobile-app-ui-design`, `fintec-accessibility`                      | `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `imagegen-frontend-mobile` only for approved visual references                                                           | `web-design-guidelines`, `test-strategy`, `real-run-validation`           |
| 6 — Conversion         | `landing-page-conversion-audit`, `frontend-design`, `fintec-frontend-design`, `fintec-accessibility`                      | `web-design-guidelines`, `mobile-app-ui-design`, `imagegen-frontend-web` only for approved landing references                                                                  | `test-strategy`, `real-run-validation`, `ux-audit` when supported         |
| 7 — Route migration    | `fintec-*` skills listed for the selected route group in Section 7; never “all skills”                                    | Group-specific optional skills plus `redesign-existing-projects` if explicitly installed                                                                                       | `web-design-guidelines`, `test-strategy`, `real-run-validation`           |
| 8 — Validation/release | `fintec-accessibility`, `fintec-nextjs-patterns`, `test-strategy`                                                         | `mobile-app-ui-design`, `web-motion-design`, `vercel-react-view-transitions`, `silent-degradation`                                                                             | `web-design-guidelines`, `real-run-validation`, `ux-audit` when supported |

### 3.4 Governance rule

No agent may satisfy the redesign request by adding another glass card, shadow, gradient, or pulse to an existing route without identifying:

- the surface role;
- the semantic reason for elevation;
- the parent/child relationship;
- the motion purpose;
- the reduced-motion behavior;
- the accessibility impact;
- the before/after acceptance evidence.

### 3.5 Agent loading contract

For every phase, route group, and work unit:

1. Load every **Required** skill before planning or editing. If a required skill is unavailable, stop and report the exact missing ID; do not substitute silently.
2. Load **Supporting** skills only when their concern is present. Optional aesthetic skills may propose alternatives but cannot approve them.
3. Apply **Validation** skills after implementation and attach their evidence to the work unit. A source scan is not a browser/device result.
4. Union the skills for the selected unit and route group; do not load every skill in the repository by default.
5. Keep Section 8.5 financial, auth, API, and payment invariants as hard gates. No visual skill replaces those checks.

---

## 4. Target design policy

### 4.1 Recommended visual direction

**Working direction:** Dark Precision / Editorial Fintech.

Characteristics:

- black or near-black open canvas;
- FinTec blue used for action and focus;
- green reserved for positive financial meaning;
- restrained red for negative/destructive meaning;
- typography and spacing carry hierarchy;
- glass is a controlled material for selected hero/overlay/emphasis surfaces;
- charts and tables are calm information views, not decorative objects;
- one visual risk is allowed per context, not every component.

This direction keeps the current identity without preserving every current implementation detail.

### 4.2 Surface matrix

| Role                | Default treatment                                                               | Allowed behavior                                                          |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Canvas              | Background only                                                                 | No blur, border, shadow, or radius.                                       |
| Section             | Transparent or low-contrast grouping                                            | Whitespace, alignment, optional hairline divider.                         |
| Content surface     | One fill or one controlled translucent material; one border or elevation choice | Static by default.                                                        |
| Interactive surface | Content surface plus visible hover/focus/press state                            | Motion only on interaction/state change.                                  |
| Control             | Compact fill/border treatment                                                   | Must not look like a content card.                                        |
| Overlay             | Stronger contrast/elevation and backdrop handling                               | Focus containment, Escape, background isolation, reduced-motion behavior. |

Hard rules:

- No equivalent content card inside another content card.
- No hover lift or active scale on static content.
- No default combination of border, shadow, blur, gradient, and rounded container.
- No infinite decorative pulse.
- No control with card-level elevation unless it is an intentional overlay/control pattern.

### 4.3 Palette policy

Initially preserve the current values and semantic meaning. Change usage before changing hues.

- primary blue: actions, links, focus, active navigation;
- success green: positive balances, completed states, gains;
- destructive red: negative amounts, destructive actions, failures;
- warning amber: warning states only;
- neutral/muted roles: supporting copy and inactive state;
- accent purple: rare product-specific emphasis, not a generic decoration.

Every route-local color must either use a semantic role or document an intentional chart/brand exception.

### 4.4 Typography policy

- Define a finite display scale and body scale.
- Use a distinct display treatment for the landing without reducing financial readability.
- Use a stable product type hierarchy for titles, sections, labels, values, helper text, and metadata.
- Bound body line length.
- Keep financial amounts tabular and consistently emphasized.
- Do not use raw text sizes as unexplained substitutes for the type scale.

### 4.5 Motion policy

Starting evaluation values:

- micro interaction: 120–180ms;
- standard state transition: 180–240ms;
- major route or hero transition: 320–400ms;
- opacity and transform before layout-affecting properties;
- one primary motion narrative per page;
- no infinite decorative animation;
- no motion that delays content or hides state;
- CSS and Framer Motion honor the same reduced-motion preference;
- reduced motion preserves state/content updates but removes spatial/repeating movement.

### 4.6 Responsive policy

- Define one owner for authenticated shell breakpoint behavior.
- Document why public and authenticated breakpoints differ, if they must differ.
- Keep 44px hit areas even when the visible icon is smaller.
- Treat keyboard-open, safe-area, landscape, and Android back behavior as first-class states.
- Use gestures as shortcuts, never as the only discoverable action path.

---

## 5. Dependency map and workstreams

| Workstream            | Description                                                                                          | Depends on       | Required skills                                                                                            | Supporting skills                                                                                                                                                                                                           | Validation skills                                                                     | Output                             |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| W0 Governance         | Visual brief, design policy, decisions, baseline evidence                                            | None             | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `cognitive-doc-design`            | `design-taste-frontend` for public direction, `brandkit` if a brand board is approved, `ui-ux-pro-max`, `right-size`                                                                                                        | `fintec-accessibility`, `web-design-guidelines`                                       | Approved policy and guardrails     |
| W1 Foundation         | Surface, token, type, spacing, control, chart, dialog primitives                                     | W0               | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-typescript-patterns`, `fintec-accessibility` | `frontend-design`, `minimalist-ui` for structural restraint if installed                                                                                                                                                    | `web-design-guidelines`, `test-strategy`, `no-excess-tests`                           | Neutral canonical primitives       |
| W2 Shell              | MainLayout ownership, public/app/admin boundaries, breakpoints, loading                              | W0, W1           | `fintec-nextjs-patterns`, `fintec-tailwind-patterns`, `fintec-accessibility`, `mobile-app-ui-design`       | `fintec-typescript-patterns`                                                                                                                                                                                                | `web-design-guidelines`, `test-strategy`, `real-run-validation`                       | Stable route and shell contract    |
| W3 Landing            | Hero, CTA, proof, pricing/auth path, conversion events                                               | W0, W1, W2       | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-accessibility`            | `design-taste-frontend`, `redesign-existing-projects` if installed, `landing-page-conversion-audit` after event/traffic baseline, `imagegen-frontend-web` or `image-to-code` only for an approved visual-reference workflow | `web-design-guidelines`, `test-strategy`, `real-run-validation`                       | Measurable landing vertical slice  |
| W4 Product pilot      | Dashboard/home and admin information hierarchy                                                       | W1, W2           | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `fintec-accessibility`     | `frontend-design`, `minimalist-ui` for structural restraint, `redesign-existing-projects` if installed, `ui-ux-pro-max` only for optional alternatives                                                                      | `web-design-guidelines`, `test-strategy`, `real-run-validation`, `silent-degradation` | First authenticated proof slice    |
| W5 UX/a11y            | Dialogs, labels, errors, menus, search, touch, loading semantics                                     | W1, W2           | `fintec-accessibility`, `web-design-guidelines`, `fintec-typescript-patterns`                              | `mobile-app-ui-design`, `fintec-tailwind-patterns`                                                                                                                                                                          | `test-strategy`, `no-excess-tests`, `real-run-validation`                             | Cross-route interaction compliance |
| W6 Motion/mobile      | Reduced motion, route continuity, drawers, FAB, onboarding, keyboard                                 | W1, W2, W5       | `vercel-react-view-transitions`, `web-motion-design`, `mobile-app-ui-design`, `fintec-accessibility`       | `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `imagegen-frontend-mobile` only for approved visual references                                                                                                        | `web-design-guidelines`, `test-strategy`, `real-run-validation`                       | Unified motion/mobile contract     |
| W7 Route migration    | Accounts, transactions, budgets, goals, debts, recurring, reports, chat, settings, supporting routes | W1–W6            | `fintec-*` skills in the selected route-group row below                                                    | Group-specific optional skills plus `redesign-existing-projects` if explicitly installed                                                                                                                                    | `web-design-guidelines`, `test-strategy`, `real-run-validation`                       | Incremental whole-app migration    |
| W8 Validation/release | Browser, device, performance, analytics, regression, rollback                                        | Every workstream | `fintec-accessibility`, `fintec-nextjs-patterns`, `test-strategy`                                          | `mobile-app-ui-design`, `web-motion-design`, `vercel-react-view-transitions`, `silent-degradation`                                                                                                                          | `web-design-guidelines`, `real-run-validation`, `ux-audit` when supported             | Evidence-backed rollout            |

### Dependency rule

A later workstream may not introduce a competing abstraction for a responsibility already owned by an earlier workstream. For example, a migrated route may not create a second Surface, loading, drawer, or motion-token system.

---

## 6. Detailed execution phases

## Phase 0 — Freeze and approve the visual policy

**Priority:** P0
**Dependencies:** None
**Skill assignment:** See Section 3.3, Phase 0. Required: `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `cognitive-doc-design`.

### Tasks

- P0.1 Create a one-page design brief for Dark Precision / Editorial Fintech.
- P0.2 Decide whether the first migration remains dark-only. Recommended default: preserve dark-only behavior until hierarchy is stable.
- P0.3 Approve the surface matrix and no-equivalent-nesting rule.
- P0.4 Decide the display/body typography pairing and public/product distinction.
- P0.5 Decide whether public and authenticated breakpoints intentionally differ.
- P0.6 Decide one MainLayout ownership model.
- P0.7 Define semantic color roles and permitted chart/brand exceptions.
- P0.8 Define motion durations, easing, purpose categories, and reduced-motion behavior.
- P0.9 Record the policy in docs/design.md and update the local FinTec design skills so they no longer require glass on every surface.
- P0.10 Capture baseline screenshots, performance values, financial values, and current funnel behavior.
- P0.11 Directly verify the money-entry route auth boundary for transactions/add and transfers before visual work changes those routes.

### Exit gate

- The policy answers what a canvas, section, card, control, interactive card, chart, and overlay are.
- Future agents can identify a correct non-glass surface.
- The policy preserves the palette and financial semantics.
- No visual implementation slice begins while P0 decisions remain unresolved.

---

## Phase 1 — Build neutral canonical primitives

**Priority:** P0/P1
**Dependencies:** Phase 0
**Skill assignment:** See Section 3.3, Phase 1. Required: `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-typescript-patterns`, `fintec-accessibility`.

### 1A. Surface primitives

- P1.1 Introduce a neutral Surface role for structural grouping.
- P1.2 Reframe Card as static content by default.
- P1.3 Introduce InteractiveCard only where click/press semantics exist.
- P1.4 Define Overlay and Control material roles.
- P1.5 Encode radius, border, fill, blur, and elevation as explicit variants rather than caller combinations.
- P1.6 Add a source-level guard or review checklist against equivalent nested surfaces.

### 1B. Controls

- P1.7 Make Button visually neutral enough for all contexts; opt into elevation and motion.
- P1.8 Make default interactive hit areas meet the chosen minimum, preferably 44px.
- P1.9 Make Input and Select controls control-sized rather than card-sized.
- P1.10 Make Badge use semantic status roles.
- P1.11 Create Field and FieldGroup conventions for labels, descriptions, errors, and groups.
- P1.12 Preserve existing loading, disabled, icon, suffix, and error behavior.

### 1C. Data views

- P1.13 Define MetricCard or StatPanel with non-interactive default behavior.
- P1.14 Define ChartPanel, ChartHeader, ChartPeriodTabs, ChartLegend, ChartTooltip, and ChartEmptyState.
- P1.15 Define consistent empty, unavailable, and error treatments for data views.

### Test evidence

- RED: Add focused behavior tests for neutral/static versus interactive variants, field label association, invalid state, and hit-area contract.
- GREEN: Implement the smallest primitive changes.
- TRIANGULATE: Run focused DOM tests, keyboard checks, and source guideline review.
- REFACTOR: Remove caller-level duplicate surface classes from only the pilot consumers.

### Exit gate

- New primitives do not force glass, shadow, lift, or scale on static content.
- Pilot component tests pass.
- Existing visual/behavior contracts are preserved outside the pilot.

---

## Phase 2 — Stabilize shell and route boundaries

**Priority:** P0/P1
**Dependencies:** Phase 1
**Skill assignment:** See Section 3.3, Phase 2. Required: `fintec-nextjs-patterns`, `fintec-tailwind-patterns`, `fintec-accessibility`, `mobile-app-ui-design`.

### Tasks

- P2.1 Select route-level or client-level MainLayout ownership and document it.
- P2.2 Establish explicit public, authenticated, admin, and native shell boundaries without a broad route move unless necessary.
- P2.3 Define one shell breakpoint source of truth.
- P2.4 Define one loading contract for route skeletons, local async operations, empty data, errors, and retry.
- P2.5 Define shell-level spacing and scroll ownership.
- P2.6 Verify header, mobile drawer, mobile nav, FAB, modal root, and toast stacking.
- P2.7 Add runtime checks for direct unauthenticated access to money-entry routes.
- P2.8 Exercise possible dead header destinations such as security and support.

### Exit gate

- Every route has a clear shell owner.
- Public-to-auth-to-product transitions are intentional.
- Direct URL auth behavior is evidenced.
- No new route migration can introduce a second shell or scroll owner.

---

## Phase 3 — Prove the language on two vertical slices

**Priority:** P0/P1
**Dependencies:** Phases 1 and 2
**Skill assignment:** See Section 3.3, Phase 3. Required: `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `fintec-accessibility`.

Choose two bounded slices:

1. **Landing:** landing navigation → hero → rate cockpit → CTA/pricing.
2. **Authenticated product:** dashboard/home or admin analytics.

### Landing pilot tasks

- P3.1 Apply the surface matrix without changing palette.
- P3.2 Replace card stacks with open sections and type-led hierarchy.
- P3.3 Choose a distinctive display treatment while retaining financial readability.
- P3.4 Make one registration CTA primary and consistent.
- P3.5 Preserve or improve the rate cockpit as the differentiated workflow.
- P3.6 Keep anonymous mobile web on the public landing unless the request is explicitly native.
- P3.7 Remove or source unsupported popularity/social metadata claims.

### Product pilot tasks

- P3.8 Redesign one dashboard/admin page as an open information workspace.
- P3.9 Reduce nested metric cards and treat charts as calm data views.
- P3.10 Keep financial values, resource totals, and loading/error states unchanged.
- P3.11 Replace decorative status pulses with meaningful state indicators.
- P3.12 Validate desktop/mobile layouts before using the pilot as the template.

### Exit gate

- Reviewers can explain the hierarchy without mentioning card count.
- The same surface matrix works in public and product contexts with intentional differences.
- No pilot screen requires a new one-off surface abstraction.
- Baseline screenshots and performance are compared.

---

## Phase 4 — Fix cross-route UX and accessibility contracts

**Priority:** P1
**Dependencies:** Phases 1 and 2; pilot findings from Phase 3
**Skill assignment:** See Section 3.3, Phase 4. Required: `fintec-accessibility`, `web-design-guidelines`, `fintec-typescript-patterns`.

### Dialogs and menus

- P4.1 Add reliable focus trapping, initial focus, focus restoration, Escape handling, background isolation, and accessible naming to shared dialogs.
- P4.2 Bring MobileDrawer and public mobile menu into one interaction family.
- P4.3 Ensure notification panels and header menus have complete focus and naming contracts.

### Forms

- P4.4 Associate all labels and controls with stable IDs.
- P4.5 Add fieldset/group semantics to account-type and other choice groups.
- P4.6 Announce async submission failures and validation errors.
- P4.7 Remove empty error catches and preserve retry affordances.
- P4.8 Label search inputs independently of placeholders.

### Actions and states

- P4.9 Make goal actions visible or focus-within discoverable.
- P4.10 Keep swipe actions available through a non-gesture path.
- P4.11 Add consistent loading/status announcements.
- P4.12 Verify all important hit areas are at least 44px.
- P4.13 Verify contrast in every surface/status combination.

### Exit gate

- Shared primitives pass focused keyboard/DOM checks.
- Real-user UX audit reports no P1 focus/label/error blocker in the pilot.
- The same contracts can be reused by all remaining routes.

---

## Phase 5 — Unify motion and mobile behavior

**Priority:** P1
**Dependencies:** Phases 1, 2, and 4
**Skill assignment:** See Section 3.3, Phase 5. Required: `vercel-react-view-transitions`, `web-motion-design`, `mobile-app-ui-design`, `fintec-accessibility`.

### Motion

- P5.1 Define motion tokens for purpose, duration, easing, and property.
- P5.2 Add one shared reduced-motion decision for CSS and Framer Motion.
- P5.3 Remove or gate decorative pulse, ping, glow, spring, and stagger effects.
- P5.4 Add route transitions using View Transitions where supported and opacity/transform fallback otherwise.
- P5.5 Use shared element continuity only where the relationship is clear.
- P5.6 Adopt lib/animations/index.ts or remove/deprecate it; do not keep parallel unused motion systems.
- P5.7 Ensure charts, loading, swipe, FAB, modal, onboarding, and route transitions honor reduced motion.

### Mobile

- P5.8 Unify app/public drawer motion, focus, background isolation, and safe areas.
- P5.9 Verify header, settings toggles, FAB, bottom nav, and drawer hit areas.
- P5.10 Test keyboard-open chat and forms.
- P5.11 Test iPhone safe areas, Android back, landscape, and 320–390px widths.
- P5.12 Keep explicit mobile/desktop branches only where interaction semantics differ.
- P5.13 Share visual primitives, status roles, headers, chart panels, and spacing between branches.

### Exit gate

- No Framer Motion path bypasses reduced-motion policy.
- No infinite decoration remains without an explicit product-state justification.
- Route transitions do not block or hide content.
- Mobile shell and overlay tests pass at the agreed matrix.

---

## Phase 6 — Rebuild landing conversion measurement and experience

**Priority:** P1
**Dependencies:** Phases 1, 2, 3, and 5
**Skill assignment:** See Section 3.3, Phase 6. Required: `landing-page-conversion-audit`, `frontend-design`, `fintec-frontend-design`, `fintec-accessibility`.

### Measurement before optimization

- P6.1 Track CTA impression and click by location and destination.
- P6.2 Track registration page arrival and form start.
- P6.3 Track registration submit, account-created, email-verification-required, email-verified, login-success, and failure states.
- P6.4 Track pricing plan selection and transition to auth.
- P6.5 Track download click and waitlist submit/success/error/duplicate.
- P6.6 Separate public landing routes from internal admin/app routes in analysis.
- P6.7 Keep events aggregate and privacy-safe; do not send email or internal user IDs to Vercel.

### Experience changes

- P6.8 Keep anonymous mobile web on the landing.
- P6.9 Make the promise one clear Venezuelan financial outcome.
- P6.10 Demonstrate rate change → budget recalculation → decision.
- P6.11 Make registration the consistent primary CTA.
- P6.12 Use Planes consistently in Spanish.
- P6.13 Explain registration → plan activation → payment before checkout.
- P6.14 Replace unsupported 2,000+ claims or connect them to a dated source.
- P6.15 Remove placeholder social sameAs metadata.
- P6.16 Remove/deprecate orphaned landing components.

### Measurement outputs

- public landing visitor → CTA click;
- CTA click → register page;
- register page → form start;
- form start → submit;
- submit → account created;
- account created → verification;
- verification → first product session;
- pricing/download/waitlist secondary funnels.

### Exit gate

- A redesign can be evaluated by event funnel, not pageviews alone.
- Mobile and desktop CTAs are measurable.
- Registration completion is measurable without identifying visitors at Vercel.

---

## Phase 7 — Migrate the application by vertical route groups

**Priority:** P1/P2
**Dependencies:** Phases 1–6
**Skill assignment:** See the route-group matrix in this section. Use only the listed Required skills for the selected group plus the project-wide validation contract.

Do not migrate by CSS utility globally. Migrate by product flow and preserve behavior.

### Route group A — Dashboard and admin

- dashboard/home;
- admin analytics;
- admin payment orders.

Focus:

- open workspace hierarchy;
- MetricCard/StatPanel;
- ChartPanel;
- user/resource/feature data readability;
- auth and no-store behavior preserved;
- admin surfaces calmer than general product surfaces.

### Route group B — Money creation and review

- transactions;
- transactions/add;
- transfers;
- payment orders.

Focus:

- explicit auth boundaries;
- single primary action;
- form field semantics;
- keyboard and mobile keyboard states;
- mutation feedback;
- no financial calculation or transaction behavior changes.

### Route group C — Resource CRUD

- accounts;
- budgets;
- goals;
- categories;
- debts;
- recurring.

Focus:

- shared PageHeader, SectionHeader, MetricCard, Field, EmptyState, StatusBadge;
- visible actions and gesture alternatives;
- status role tokens;
- reduce repeated summary cards;
- consistent loading/error/empty states.

### Route group D — Analysis and communication

- reports;
- chat/AI;
- calculator;
- notifications.

Focus:

- chart and data hierarchy;
- chat keyboard/scroll contract;
- purposeful loading and transition motion;
- accessible notifications and data views;
- performance and lazy boundaries.

### Route group E — Account and monetization

- login/register/forgot/reset;
- pricing;
- subscription;
- subscription success;
- settings;
- profile.

Focus:

- public/auth/product continuity;
- labels, errors, focus, and confirmation states;
- pricing expectations;
- 44px controls;
- conversion and account lifecycle events.

### Route group F — Public/supporting

- download;
- waitlist;
- privacy;
- terms;
- P2P offers.

Focus:

- one public shell relationship;
- trust and honest copy;
- CTA hierarchy;
- responsive layout;
- no unsupported claims or placeholder links.

### Route-group skill assignment matrix

| Group                      | Required                                                                                                   | Supporting                                                                                                                                                                          | Validation                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A — Dashboard/admin        | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `fintec-accessibility`     | `frontend-design`, `minimalist-ui` for structural restraint if installed, `redesign-existing-projects` if installed, `ui-ux-pro-max` only for optional chart/hierarchy alternatives | `web-design-guidelines`, `test-strategy`, `real-run-validation`, `silent-degradation`                                        |
| B — Money creation/review  | `fintec-nextjs-patterns`, `fintec-typescript-patterns`, `fintec-accessibility`, `fintec-frontend-design`   | `mobile-app-ui-design`, `fintec-tailwind-patterns`, `redesign-existing-projects` if installed, `exploit-testing` for auth-boundary probes                                           | `web-design-guidelines`, `test-strategy`, `real-run-validation`, Section 8.5 financial regression gate                       |
| C — Resource CRUD          | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-accessibility`, `fintec-typescript-patterns` | `mobile-app-ui-design`, `minimalist-ui` for structural restraint if installed, `redesign-existing-projects` if installed                                                            | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                                              |
| D — Analysis/communication | `fintec-nextjs-patterns`, `fintec-accessibility`, `fintec-frontend-design`                                 | `redesign-existing-projects` if installed, `web-motion-design`, `vercel-react-view-transitions`, `fintec-tailwind-patterns`                                                         | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                                              |
| E — Account/monetization   | `fintec-nextjs-patterns`, `fintec-accessibility`, `fintec-frontend-design`, `fintec-typescript-patterns`   | `redesign-existing-projects` if installed, `landing-page-conversion-audit`, `mobile-app-ui-design`                                                                                  | `web-design-guidelines`, `test-strategy`, `real-run-validation`, `silent-degradation`, Section 8.5 financial regression gate |
| F — Public/supporting      | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-accessibility`            | `design-taste-frontend` for public composition only, `redesign-existing-projects` if installed, `landing-page-conversion-audit`, `mobile-app-ui-design`                             | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                                              |

`ux-audit` is added only for a major vertical slice or final live audit when its browser/runtime compatibility is available. It is not a default per-route gate.

### Per-route migration contract

Each route migration must include:

1. Before screenshot and state inventory.
2. Exact Required, Supporting, and Validation skills recorded from the route-group matrix.
3. RED tests for changed behavior/accessibility contract.
4. Smallest visual/primitive change.
5. GREEN focused checks.
6. TRIANGULATE browser/keyboard/reduced-motion checks.
7. REFACTOR cleanup of route-local duplicate styling.
8. Before/after screenshot and performance comparison.
9. Explicit list of unchanged contracts.
10. Rollback point or isolated work unit.

---

## 7.1 Suggested reviewable work units

Keep each work unit small enough for focused review. A suggested sequence:

| Unit | Scope                                  | Required skills                                                                                            | Supporting skills                                                                                                                                                            | Validation skills                                                                                      | Main outcome                                      |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| U0   | Design policy/docs/skills              | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `cognitive-doc-design`            | `design-taste-frontend` for public direction, `brandkit` if a brand board is approved, `ui-ux-pro-max`, `right-size`, `full-output-enforcement` only for exhaustive handoffs | `fintec-accessibility`, `web-design-guidelines`                                                        | New source of truth; no route migration           |
| U1   | Surface/control primitives             | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-typescript-patterns`, `fintec-accessibility` | `frontend-design`, `minimalist-ui` for structural restraint if installed                                                                                                     | `web-design-guidelines`, `test-strategy`, `no-excess-tests`                                            | Neutral roles and semantic controls               |
| U2   | Shell ownership/loading/breakpoints    | `fintec-nextjs-patterns`, `fintec-tailwind-patterns`, `fintec-accessibility`, `mobile-app-ui-design`       | `fintec-typescript-patterns`, `right-size`                                                                                                                                   | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                        | Stable route and responsive contract              |
| U3   | Landing hero/nav/CTA pilot             | `frontend-design`, `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-accessibility`            | `design-taste-frontend`, `redesign-existing-projects` if installed, `imagegen-frontend-web` or `image-to-code` only for an approved visual-reference workflow                | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                        | New public language and measurable CTA path       |
| U4   | Dashboard/admin pilot                  | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-nextjs-patterns`, `fintec-accessibility`     | `frontend-design`, `minimalist-ui` for structural restraint, `redesign-existing-projects` if installed, `ui-ux-pro-max` only for optional alternatives                       | `web-design-guidelines`, `test-strategy`, `real-run-validation`, `silent-degradation`                  | New authenticated hierarchy and charts            |
| U5   | Dialog/form/a11y primitives            | `fintec-accessibility`, `web-design-guidelines`, `fintec-typescript-patterns`                              | `mobile-app-ui-design`, `fintec-tailwind-patterns`                                                                                                                           | `test-strategy`, `no-excess-tests`, `real-run-validation`                                              | Shared interaction compliance                     |
| U6   | Motion/reduced-motion/view transitions | `vercel-react-view-transitions`, `web-motion-design`, `fintec-accessibility`                               | `fintec-tailwind-patterns`, `fintec-nextjs-patterns`                                                                                                                         | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                        | Continuity without decorative overload            |
| U7   | Mobile shell/onboarding/chat           | `mobile-app-ui-design`, `fintec-accessibility`, `fintec-nextjs-patterns`                                   | `vercel-react-view-transitions`, `web-motion-design`, `fintec-tailwind-patterns`, `imagegen-frontend-mobile` only for approved visual references                             | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                        | Device and keyboard reliability                   |
| U8   | Money-entry routes                     | `fintec-nextjs-patterns`, `fintec-typescript-patterns`, `fintec-accessibility`, `fintec-frontend-design`   | `mobile-app-ui-design`, `fintec-tailwind-patterns`, `exploit-testing`, `silent-degradation`                                                                                  | `web-design-guidelines`, `test-strategy`, `real-run-validation`, Section 8.5 financial regression gate | Auth-safe transaction/transfer UX                 |
| U9   | CRUD route group                       | `fintec-frontend-design`, `fintec-tailwind-patterns`, `fintec-accessibility`, `fintec-typescript-patterns` | `mobile-app-ui-design`, `minimalist-ui` for structural restraint, `redesign-existing-projects` if installed                                                                  | `web-design-guidelines`, `test-strategy`, `real-run-validation`                                        | Accounts/budgets/goals/debts/recurring/categories |
| U10  | Analysis/monetization/public support   | `fintec-nextjs-patterns`, `fintec-frontend-design`, `fintec-accessibility`                                 | `redesign-existing-projects` if installed, `landing-page-conversion-audit`, `frontend-design`, `mobile-app-ui-design`, `web-motion-design`                                   | `web-design-guidelines`, `test-strategy`, `real-run-validation`, `ux-audit` when supported             | Reports/chat/pricing/settings/download/waitlist   |
| U11  | Final cross-route validation           | `fintec-accessibility`, `fintec-nextjs-patterns`, `test-strategy`                                          | `mobile-app-ui-design`, `web-motion-design`, `vercel-react-view-transitions`, `silent-degradation`, `full-output-enforcement` only for exhaustive handoffs                   | `web-design-guidelines`, `real-run-validation`, `ux-audit` when supported                              | Evidence-backed rollout and cleanup               |

### Work-unit rules

- Load Required skills before work, Supporting skills only when the concern is present, and Validation skills after implementation.
- `ux-audit` is conditional for U10/U11 and major vertical slices; without a compatible live browser it cannot produce a pass verdict.
- For U8 and any subscription/payment change, Section 8.5 is a hard financial gate; no installed skill replaces it.
- Keep code, tests, docs, and screenshots in the same logical unit.
- Do not mix unrelated backend changes into a visual unit.
- Do not migrate more than one design-system responsibility in parallel without isolated worktrees.
- Stop and split the unit if it exceeds the agreed review workload.
- Do not claim overall redesign completion when only one pilot is complete.

---

## 8. Validation strategy

**Skill assignment:** Required: `fintec-accessibility`, `fintec-nextjs-patterns`, `test-strategy`. Supporting: `mobile-app-ui-design`, `web-motion-design`, `vercel-react-view-transitions`, `silent-degradation`. Validation: `web-design-guidelines`, `real-run-validation`, and `ux-audit` only when its live-browser compatibility is available.

### 8.1 Source validation

For every unit:

- applicable skill review;
- semantic token scan;
- nested surface scan;
- motion/reduced-motion scan;
- shared primitive usage check;
- route and shell ownership check;
- type-check and lint for the affected area;
- focused behavior and accessibility tests.

### 8.2 Browser validation matrix

Minimum widths:

- 320px;
- 350px;
- 375px;
- 390px;
- 430px;
- 768px;
- 1024px;
- 1280px;
- 1440px.

States:

- unauthenticated;
- authenticated regular user;
- administrator;
- slow network/loading;
- empty data;
- API error/retry;
- validation error;
- mutation pending/success/failure;
- reduced motion;
- keyboard open;
- landscape;
- long content/scroll;
- overlay stacking;
- direct route access.

### 8.3 Accessibility validation

- Keyboard traversal on every migrated route.
- Visible focus on all interactive elements.
- Dialog/drawer focus trap and restoration.
- Form label/description/error association.
- Screen-reader status announcements.
- 44px hit areas.
- Contrast ratio for body text, muted text, status colors, and translucent surfaces.
- Reduced-motion behavior for CSS and Framer Motion.
- Gesture alternatives.

### 8.4 Performance validation

Track before/after:

- LCP;
- INP;
- CLS;
- JavaScript transfer size;
- route navigation timing;
- lazy boundary timing;
- chart/render cost;
- animation frame stability on mobile;
- rate cockpit and chat load timing.

The redesign fails its performance gate if effects improve appearance while materially degrading mobile interaction or initial load.

### 8.5 Financial and behavior regression validation

For each product route, confirm unchanged:

- currency and amount calculations;
- account ownership;
- transaction counts and filtering;
- budget/goal progress;
- auth/authorization behavior;
- API request/response contracts;
- payment/order state transitions;
- offline/native behavior where applicable.

Visual changes cannot silently alter financial meaning.

---

## 9. Acceptance criteria for the complete refresh

### Design-system acceptance

- Surface roles are explicit and documented.
- No default structural primitive forces interactivity.
- No equivalent content surface is nested without documented semantic reason.
- Semantic colors are used for status and financial meaning.
- Public/product/admin/native differences are intentional and documented.
- Typography and spacing use one governed scale with explicit exceptions.
- The local FinTec skills no longer instruct agents to glass every surface.

### UX/accessibility acceptance

- Shared dialogs/drawers have complete focus and naming behavior.
- All form labels are associated.
- Async errors and loading states are announced.
- Important actions are discoverable without hover or gesture knowledge.
- Hit areas meet the chosen minimum.
- Keyboard and screen-reader checks pass for migrated routes.

### Motion acceptance

- Every remaining animation has a stated purpose.
- No infinite decorative animation remains by default.
- Framer Motion and CSS both honor reduced motion.
- Route transitions provide continuity without blocking content.
- Motion is not required to understand financial data.

### Mobile acceptance

- Shell breakpoint ownership is clear.
- Safe areas and mobile chrome do not cover content.
- Chat/forms remain usable with the keyboard open.
- Drawer/modal/FAB/nav/toast stacking is predictable.
- Android back and iPhone safe-area behavior are evidenced.

### Landing acceptance

- Anonymous mobile visitors see the value proposition before auth.
- One primary registration CTA is consistent.
- Hero demonstrates a concrete differentiated workflow.
- Pricing/auth/payment expectations are clear.
- Unsupported claims and placeholder social metadata are removed or sourced.
- Registration lifecycle and CTA events are measurable.

### Performance and regression acceptance

- Core Web Vitals do not regress beyond the agreed budget.
- Bundle and route timing remain within the baseline budget.
- Financial, auth, API, payment, and native behavior remain unchanged.
- Every migrated slice has browser/device evidence and a rollback point.

---

## 10. Risk register and mitigations

| Risk                                         | Consequence                                             | Mitigation                                                                                       |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Redesign becomes a global CSS rewrite        | Large review surface and hidden behavior regressions    | Use primitives and vertical slices; no broad utility replacement first.                          |
| Palette changes obscure financial meaning    | Users misread positive/negative values                  | Preserve semantic hues and validate contrast/meaning before visual variation.                    |
| Glass is removed everywhere                  | Brand identity becomes unrecognizable                   | Keep glass as an explicit hero/overlay/emphasis material.                                        |
| Glass remains mandatory                      | Nested-box problem returns                              | Update local skills and docs in Phase 0 with a surface matrix.                                   |
| Motion is added indiscriminately             | Cognitive load, motion sickness, performance regression | Purpose inventory, duration budget, no infinite decoration, reduced-motion gate.                 |
| Framer Motion ignores preference             | Accessibility failure                                   | Shared useReducedMotion policy and tests.                                                        |
| Shell ownership changes auth/scroll behavior | Broken routes or overlays                               | Decide ownership first; verify direct routes and scroll matrix.                                  |
| External skills conflict                     | Agents produce contradictory designs                    | Use role ownership table and explicit skill loading; Vercel/a11y overrides aesthetic preference. |
| Community skill security/content risk        | Unreviewed instructions or dependencies                 | Review installed skills; UI/UX Pro Max remains optional and not authoritative.                   |
| Landing redesign judged by pageviews         | False conversion conclusion                             | Add CTA/account lifecycle events and exclude internal paths.                                     |
| Unsupported social proof remains             | Trust damage                                            | Remove or source claims before visual polish.                                                    |
| Reviewer overload                            | Slow or shallow review                                  | Work units U0–U11 and split when scope grows.                                                    |
| Visual-only testing misses runtime defects   | Broken mobile/auth experience                           | Require browser/device/keyboard/reduced-motion validation per unit.                              |

---

## 11. Rollback and stop conditions

### Stop immediately when

- a visual unit changes financial values or domain behavior;
- a P0 auth/route boundary remains unverified;
- reduced motion is broken;
- a new surface abstraction duplicates an existing one;
- a route requires undocumented shell ownership;
- accessibility regressions appear in a shared primitive;
- performance budget is exceeded without an explicit decision;
- the unit grows beyond focused review capacity.

### Rollback strategy

- Keep each vertical slice isolated and revertible.
- Preserve before screenshots and behavior snapshots.
- Keep old and new surface variants side by side only during a bounded migration, then remove the old path after verification.
- Do not mix migration rollback with unrelated feature rollback.
- Preserve analytics event names once published; deprecate with a migration note rather than silently changing semantics.
- Use feature-level rollout or route-level release when available.

---

## 12. Decision gates requiring explicit approval

Before implementation begins, confirm:

1. **Visual direction:** accept Dark Precision / Editorial Fintech or choose another documented direction.
2. **Theme:** retain dark-only initially or introduce system/light behavior later.
3. **Surface policy:** accept maximum three normal surface levels and no equivalent nesting.
4. **Typography:** approve display/body pairing and scale.
5. **Shell ownership:** approve route-level or client-level MainLayout ownership.
6. **Motion:** approve duration/purpose/reduced-motion policy.
7. **Landing:** approve anonymous mobile landing behavior and primary CTA.
8. **Measurement:** approve privacy-safe CTA and registration lifecycle events.
9. **External skills:** approve only the bounded Taste-Skill IDs from Section 3.2; do not install or load the bundle, and confirm any image-generation or Stitch dependency separately.
10. **Rollout:** approve vertical-slice order and review workload limits.

Recommended defaults are recorded in Section 4 so implementation can proceed without rediscovering the same decisions.

---

## 13. First implementation slice recommendation

The smallest high-value starting slice is:

1. Phase 0 policy update.
2. Neutral Surface/Card/Button/Input/Select/Field primitives.
3. Landing hero and CTA pilot.
4. Dashboard home summary pilot.
5. Reduced-motion and accessibility checks for those pilots.
6. CTA/registration instrumentation.

Do not start by redesigning all dashboard cards or by adding a global animation layer. Prove that one open, type-led, calm surface system works on both the landing and the authenticated product before migrating the rest.

---

## Appendix A — Work item checklist

### Governance

- [ ] Visual brief approved.
- [ ] Dark/theme decision recorded.
- [ ] Surface matrix approved.
- [ ] Palette roles approved.
- [ ] Typography scale approved.
- [ ] Motion policy approved.
- [ ] Shell ownership approved.
- [ ] Taste-Skill candidates have an explicit status and availability check.
- [ ] No more than one conditional Taste-Skill is loaded per bounded unit.
- [ ] Baseline evidence captured.

### Foundation

- [ ] Surface variants defined.
- [ ] Card neutralized.
- [ ] InteractiveCard explicit.
- [ ] Controls made control-sized.
- [ ] Field/FieldGroup defined.
- [ ] MetricCard/StatPanel defined.
- [ ] ChartPanel family defined.
- [ ] Dialog/Drawer contract defined.

### Landing

- [ ] Anonymous mobile landing behavior verified.
- [ ] Hero promise sharpened.
- [ ] Rate/budget workflow demonstrated.
- [ ] Registration CTA made primary.
- [ ] Pricing/auth/payment story clarified.
- [ ] Unsupported claims removed or sourced.
- [ ] CTA events implemented.
- [ ] Registration lifecycle events implemented.

### Product

- [ ] Dashboard pilot migrated.
- [ ] Admin pilot migrated.
- [ ] Money-entry auth verified.
- [ ] CRUD route group migrated.
- [ ] Analysis/chat routes migrated.
- [ ] Settings/profile/auth routes migrated.
- [ ] Public supporting routes migrated.

### Mobile/motion/a11y

- [ ] CSS and Framer reduced motion unified.
- [ ] Route transitions validated.
- [ ] Drawers focus-trapped and safe-area-aware.
- [ ] Keyboard-open states validated.
- [ ] 44px target check complete.
- [ ] Form label check complete.
- [ ] Error/loading announcement check complete.
- [ ] Contrast check complete.

### Release

- [ ] Browser width matrix complete.
- [ ] Real-device matrix complete.
- [ ] Core Web Vitals compared.
- [ ] Financial regression evidence complete.
- [ ] Auth/API regression evidence complete.
- [ ] Analytics funnel baseline established.
- [ ] Rollback point documented.
- [ ] Final review workload accepted.

---

## Appendix B — Primary references

- Audit report: docs/audits/fintec-ui-ux-skills-compliance-audit.md
- Upstream Taste-Skill catalog reviewed: <https://github.com/leonxlnx/taste-skill> (README, CHANGELOG, and all 13 `skills/*/SKILL.md` files)
- Design rules: docs/design.md
- Global tokens and motion: app/globals.css
- Tailwind tokens and breakpoints: tailwind.config.ts
- Local visual skill: skills/fintec-frontend-design/SKILL.md
- Local accessibility skill: skills/fintec-accessibility/SKILL.md
- Local Tailwind skill: skills/fintec-tailwind-patterns/SKILL.md
- Local Next.js skill: skills/fintec-nextjs-patterns/SKILL.md
- Project visual skill: .pi/skills/frontend-design/SKILL.md
- Project anti-slop skill: .pi/skills/design-taste-frontend/SKILL.md
- Project mobile skill: .pi/skills/mobile-app-ui-design/SKILL.md
- Project web guidelines skill: .pi/skills/web-design-guidelines/SKILL.md
- Project motion skill: .pi/skills/web-motion-design/SKILL.md
- Project route-transition skill: .pi/skills/vercel-react-view-transitions/SKILL.md
- Project landing conversion skill: .pi/skills/landing-page-conversion-audit/SKILL.md
- Project runtime UX audit skill: .pi/skills/ux-audit/SKILL.md
- Global test-selection skill: `test-strategy` (installed global skill)
- Global real-run skill: `real-run-validation` (installed global skill)
- Anthropic frontend-design: <https://skills.sh/anthropics/skills/frontend-design>
- Vercel web-design-guidelines: <https://skills.sh/vercel-labs/agent-skills/web-design-guidelines>
- Vercel React view transitions: <https://skills.sh/vercel-labs/agent-skills/vercel-react-view-transitions>
- Refactoring UI: <https://www.refactoringui.com/>
- Nielsen Norman Group heuristics: <https://www.nngroup.com/articles/ten-usability-heuristics/>
- Vercel Geist: <https://vercel.com/geist>

---

## Final plan outcome

This plan deliberately separates **design policy**, **shared foundation**, **pilot proof**, **route migration**, and **runtime validation**. The application should become more attractive not by accumulating more decoration, but by making every visual decision carry a clear product, hierarchy, accessibility, or continuity purpose.
