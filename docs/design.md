# FinTec Design System

> **AI Agent Quick-Reference**: This document is the single source of truth for all visual, interaction, and layout decisions in the FinTec app. Read it fully before generating any UI code. Every token, class, and pattern described here is **already implemented** and must be reused — never invent new styling conventions.

---

## Table of Contents

1. [Visual Theme & Atmosphere](#1-visual-theme--atmosphere)
2. [Color Palette & Roles](#2-color-palette--roles)
3. [Typography Rules](#3-typography-rules)
4. [Component Stylings](#4-component-stylings)
5. [Layout Principles](#5-layout-principles)
6. [Depth & Elevation](#6-depth--elevation)
7. [Responsive Behavior](#7-responsive-behavior)
8. [Design Guardrails](#8-design-guardrails)
9. [Agent Prompt Guide](#9-agent-prompt-guide)

---

## 1. Visual Theme & Atmosphere

### 1.1 Core Identity

FinTec is a **dark-mode-first financial management application** with an **iOS-native aesthetic**. The design language combines:

- **Black theme**: Pure black (`#000000`) background, not gray or dark gray
- **Glass morphism**: Translucent surfaces with `backdrop-blur` throughout
- **iOS-native feel**: Subtle scale animations (`active:scale-[0.98]`), cubic-bezier easing, rounded corners (`rounded-xl` to `rounded-3xl`)
- **Financial clarity**: High-contrast amounts with colored emphasis (green positive, red negative)

### 1.2 Design Philosophy

| Principle                     | Rule                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Dark mode is mandatory**    | `className="dark"` is forced on `<html>`. No light mode toggle exists.                               |
| **Black over gray**           | Background is `#000000`. Cards are `rgba(8, 8, 8, 0.95)`. Never use dark gray as primary background. |
| **Glass over solid**          | Surfaces use `.glass`, `.glass-card`, `.glass-light` with `backdrop-blur`. Avoid opaque backgrounds. |
| **Subtle over flashy**        | Animations are 120–350ms, ease-out, gentle scale shifts. No dramatic transforms.                     |
| **Tabular numbers for money** | All monetary amounts use `font-variant-numeric: tabular-nums` via `.amount-strong`.                  |

### 1.3 Theme Tokens (CSS Variables)

The app uses HSL CSS variables defined in `app/globals.css` under `:root` (light defaults, unused) and `.dark` (active):

| Token                  | Dark Mode Value | Usage                        |
| ---------------------- | --------------- | ---------------------------- |
| `--background`         | `0 0% 0%`       | Page background (pure black) |
| `--foreground`         | `0 0% 98%`      | Primary text                 |
| `--card`               | `0 0% 3%`       | Card surfaces                |
| `--card-foreground`    | `0 0% 98%`      | Card text                    |
| `--primary`            | `211 100% 65%`  | Bright blue for black theme  |
| `--primary-foreground` | `0 0% 0%`       | Text on primary              |
| `--secondary`          | `0 0% 8%`       | Secondary surfaces           |
| `--muted`              | `0 0% 5%`       | Muted surfaces               |
| `--muted-foreground`   | `0 0% 70%`      | Muted/secondary text         |
| `--border`             | `0 0% 12%`      | Border color                 |
| `--ring`               | `211 100% 65%`  | Focus ring                   |
| `--destructive`        | `0 75% 70%`     | Error/destructive actions    |

**Usage**: Reference via Tailwind utilities: `bg-background`, `text-foreground`, `border-border`, `ring-ring`.

---

## 2. Color Palette & Roles

### 2.1 Primary Blue (HSL 211° 100%)

The brand color. Used for CTAs, links, active states, focus rings.

| Scale         | Hex       | Usage                      |
| ------------- | --------- | -------------------------- |
| `primary-50`  | `#eff6ff` | Hover tints                |
| `primary-100` | `#dbeafe` | Light overlays             |
| `primary-200` | `#bfdbfe` | Disabled states            |
| `primary-300` | `#93c5fd` | Secondary accents          |
| `primary-400` | `#60a5fa` | Hover states               |
| `primary-500` | `#3b82f6` | Default blue (light theme) |
| `primary-600` | `#2563eb` | Active states              |
| `primary-700` | `#1d4ed8` | Pressed states             |
| `primary-800` | `#1e40af` | Dark backgrounds           |
| `primary-900` | `#1e3a8a` | Deep backgrounds           |
| `primary-950` | `#172554` | Darkest blue               |

**Dark mode active**: `--primary: 211 100% 65%` (brighter variant, maps to ~`primary-400`)

### 2.2 Success Green (#22c55e)

Used for positive amounts, income, success states, confirmations.

| Scale         | Hex       | Usage                                                                        |
| ------------- | --------- | ---------------------------------------------------------------------------- |
| `success-50`  | `#f0fdf4` | Light tint backgrounds                                                       |
| `success-100` | `#dcfce7` | Badge backgrounds                                                            |
| `success-200` | `#bbf7d0` | Hover tints                                                                  |
| `success-300` | `#86efac` | Secondary success text                                                       |
| `success-400` | `#4ade80` | **Positive amount color** (`#34d399` emerald-400 used in `.amount-positive`) |
| `success-500` | `#22c55e` | Default green                                                                |
| `success-600` | `#16a34a` | Active states                                                                |
| `success-700` | `#15803d` | Pressed states                                                               |
| `success-800` | `#166534` | Dark overlays                                                                |
| `success-900` | `#14532d` | Deep backgrounds                                                             |
| `success-950` | `#052e16` | Darkest green                                                                |

### 2.3 Warning Amber (#f59e0b)

Used for warnings, pending states, attention indicators.

| Scale         | Hex       | Usage             |
| ------------- | --------- | ----------------- |
| `warning-50`  | `#fffbeb` | Light tint        |
| `warning-100` | `#fef3c7` | Badge backgrounds |
| `warning-200` | `#fde68a` | Hover tints       |
| `warning-300` | `#fcd34d` | Secondary warning |
| `warning-400` | `#fbbf24` | Hover states      |
| `warning-500` | `#f59e0b` | Default amber     |
| `warning-600` | `#d97706` | Active states     |
| `warning-700` | `#b45309` | Pressed states    |
| `warning-800` | `#92400e` | Dark overlays     |
| `warning-900` | `#78350f` | Deep backgrounds  |
| `warning-950` | `#451a03` | Darkest amber     |

### 2.4 Error Red (#ef4444)

Used for errors, destructive actions, negative amounts, deletions.

| Scale       | Hex       | Usage             |
| ----------- | --------- | ----------------- |
| `error-50`  | `#fef2f2` | Light tint        |
| `error-100` | `#fee2e2` | Badge backgrounds |
| `error-200` | `#fecaca` | Hover tints       |
| `error-300` | `#fca5a5` | Secondary error   |
| `error-400` | `#f87171` | Hover states      |
| `error-500` | `#ef4444` | Default red       |
| `error-600` | `#dc2626` | Active states     |
| `error-700` | `#b91c1c` | Pressed states    |
| `error-800` | `#991b1b` | Dark overlays     |
| `error-900` | `#7f1d1d` | Deep backgrounds  |
| `error-950` | `#450a0a` | Darkest red       |

### 2.5 Semantic Color Mapping

| Semantic Token            | Resolves To          | Usage                             |
| ------------------------- | -------------------- | --------------------------------- |
| `bg-background`           | `hsl(0 0% 0%)`       | Page root                         |
| `bg-card/80`              | `hsl(0 0% 3% / 0.8)` | Card surfaces                     |
| `text-foreground`         | `hsl(0 0% 98%)`      | Primary text                      |
| `text-muted-foreground`   | `hsl(0 0% 70%)`      | Secondary text                    |
| `border-border`           | `hsl(0 0% 12%)`      | Default borders                   |
| `bg-muted`                | `hsl(0 0% 5%)`       | Muted surfaces                    |
| `bg-secondary`            | `hsl(0 0% 8%)`       | Secondary surfaces                |
| `text-text-primary`       | `hsl(0 0% 98% / 1)`  | Legacy alias for foreground       |
| `text-text-muted`         | `hsl(0 0% 70% / 1)`  | Legacy alias for muted-foreground |
| `bg-background-primary`   | `hsl(0 0% 0%)`       | Legacy alias                      |
| `bg-background-secondary` | `hsl(0 0% 8%)`       | Legacy alias                      |
| `bg-background-tertiary`  | `hsl(0 0% 5%)`       | Legacy alias                      |

### 2.6 Accent Purple (HSL 285° range)

Used in gradients, hero sections, and accent elements.

| Scale        | Hex       |
| ------------ | --------- |
| `accent-50`  | `#fdf4ff` |
| `accent-100` | `#fae8ff` |
| `accent-200` | `#f5d0fe` |
| `accent-300` | `#f0abfc` |
| `accent-400` | `#e879f9` |
| `accent-500` | `#d946ef` |
| `accent-600` | `#c026d3` |
| `accent-700` | `#a21caf` |
| `accent-800` | `#86198f` |
| `accent-900` | `#701a75` |
| `accent-950` | `#4a044e` |

**Gradient usage**: `hero-gradient` = `linear-gradient(135deg, primary 0%, accent 100%)`

---

## 3. Typography Rules

### 3.1 Font Families

| Family   | CSS Value                                  | Usage                                 |
| -------- | ------------------------------------------ | ------------------------------------- |
| **Sans** | `Inter, system-ui, sans-serif`             | All UI text, headings, body           |
| **Mono** | `JetBrains Mono, Menlo, Monaco, monospace` | Code, transaction IDs, technical data |

**Font loading**: Inter is loaded via `@fontsource/inter` in the app. `display: 'swap'` is used.

### 3.2 iOS-like Typography Scale

These are Tailwind classes defined in `tailwind.config.ts`:

| Class                  | Size              | Line-height | Letter-spacing | Usage                       |
| ---------------------- | ----------------- | ----------- | -------------- | --------------------------- |
| `text-ios-large-title` | `2rem` (32px)     | `1.2`       | `-0.01em`      | Page titles, hero headings  |
| `text-ios-title`       | `1.5rem` (24px)   | `1.25`      | `-0.01em`      | Section titles, card titles |
| `text-ios-headline`    | `1.125rem` (18px) | `1.3`       | `-0.005em`     | Subtitles, prominent labels |
| `text-ios-body`        | `1rem` (16px)     | `1.5`       | `0`            | Body text, descriptions     |
| `text-ios-caption`     | `0.875rem` (14px) | `1.4`       | `0`            | Captions, metadata          |
| `text-ios-footnote`    | `0.75rem` (12px)  | `1.35`      | `0`            | Footnotes, timestamps       |

### 3.3 Display Sizes (Large Headings)

| Class              | Size      | Line-height | Letter-spacing | Usage                 |
| ------------------ | --------- | ----------- | -------------- | --------------------- |
| `text-display-2xl` | `4.5rem`  | `1`         | `-0.05em`      | Hero titles           |
| `text-display-xl`  | `4.5rem`  | `1`         | `-0.05em`      | Hero titles           |
| `text-display-lg`  | `3.75rem` | `1`         | `-0.025em`     | Large section headers |
| `text-display-md`  | `3rem`    | `1.25`      | `-0.025em`     | Section headers       |
| `text-display-sm`  | `2.25rem` | `1.25`      | `0`            | Sub-headers           |

### 3.4 Letter Spacing Scale

| Class              | Value      | Usage                        |
| ------------------ | ---------- | ---------------------------- |
| `tracking-tighter` | `-0.05em`  | Large display text           |
| `tracking-tight`   | `-0.025em` | Headings                     |
| `tracking-normal`  | `0`        | Body text                    |
| `tracking-wide`    | `0.025em`  | Uppercase labels, captions   |
| `tracking-wider`   | `0.05em`   | Over-labels, section markers |
| `tracking-widest`  | `0.1em`    | Extreme emphasis labels      |

### 3.5 Typography Rules

1. **Mobile text never below 16px** for inputs (prevents iOS zoom): `text-base` on inputs, `md:text-sm` for desktop
2. **Tabular numbers for money**: `.amount-strong` applies `font-variant-numeric: tabular-nums`
3. **Font features enabled**: `rlig` (required ligatures) and `calt` (contextual alternates) on body
4. **No custom font-weight below 400**: Minimum is `font-medium` (500) for readability on black

---

## 4. Component Stylings

### 4.1 Button

**File**: `components/ui/button.tsx`

**Base styles**: `inline-flex items-center justify-center font-medium transition-ios ease-[cubic-bezier(0.25,0.46,0.45,0.94)] focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none micro-bounce hover-lift shadow-sm hover:shadow-lg backdrop-blur-sm`

| Variant     | Classes                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `primary`   | `bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl glass-light border border-primary/30` |
| `secondary` | `bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/80 shadow-md hover:shadow-lg glass-card`                 |
| `success`   | `bg-gradient-to-r from-success to-success/90 text-white hover:from-success/90 hover:to-success/80 shadow-lg hover:shadow-xl hover-glow`                                        |
| `warning`   | `bg-gradient-to-r from-warning to-warning/90 text-white hover:from-warning/90 hover:to-warning/80 shadow-lg hover:shadow-xl`                                                   |
| `danger`    | `bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive/80 shadow-lg hover:shadow-xl`                  |
| `ghost`     | `hover:bg-muted/50 hover:text-foreground glass-card backdrop-blur-sm border border-border/20 hover:border-border/40`                                                           |
| `outline`   | `border-2 border-primary bg-background/70 hover:bg-primary/10 hover:text-primary glass-light backdrop-blur-md hover:border-primary/50`                                         |

| Size | Classes                          |
| ---- | -------------------------------- |
| `sm` | `h-9 px-4 text-sm rounded-lg`    |
| `md` | `h-11 px-6 text-base rounded-xl` |
| `lg` | `h-12 px-8 text-lg rounded-xl`   |

**Features**: Supports `loading` prop (shows spinner), `icon` prop, `variant`, `size`.

### 4.2 Input

**File**: `components/ui/input.tsx`

**Base styles**: `flex h-12 w-full rounded-xl border-2 border-input/50 bg-background/80 px-4 py-3 text-base font-medium ring-offset-background file:border-0 file:bg-transparent md:text-sm focus-glow disabled:cursor-not-allowed disabled:opacity-50 transition-smooth backdrop-blur-sm text-foreground dark:text-white/95 placeholder:text-muted-foreground placeholder:opacity-100 glass-light shadow-lg hover:shadow-xl hover:border-primary/30 hover:bg-background/90 focus:border-primary/60 animate-fade-in-up`

**Features**: `label`, `error`, `icon`, `suffix` props. Error triggers `animate-wiggle`.

**Dark mode input fix**: All inputs in `.dark` context get `color: #ffffff`, `caret-color: #ffffff`, `-webkit-text-fill-color: #ffffff`, `appearance: none`.

### 4.3 Card

**File**: `components/ui/card.tsx`

**Base**: `rounded-2xl border border-border/50 bg-card/80 text-card-foreground glass-card shadow-ios-md hover:shadow-ios-lg hover-lift transition-smooth will-change-transform active:scale-[0.98] active:bg-muted/10 hover:border-primary/20 hover:bg-card/90`

| Sub-component     | Classes                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `CardHeader`      | `flex flex-col space-y-2 p-6 pb-4`                                                                |
| `CardTitle`       | `text-xl font-semibold leading-tight tracking-tight text-foreground`                              |
| `CardDescription` | `text-sm leading-relaxed text-muted-foreground`                                                   |
| `CardContent`     | `px-6 pb-6`                                                                                       |
| `CardFooter`      | `flex items-center justify-between rounded-b-2xl border-t border-border/50 bg-muted/20 px-6 py-4` |

### 4.4 Badge

**File**: `components/ui/badge.tsx`

| Variant   | Classes                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| `default` | `bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`                |
| `success` | `bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200`    |
| `warning` | `bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200`    |
| `danger`  | `bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200`            |
| `info`    | `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`                |
| `outline` | `border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300` |

| Size | Classes                 |
| ---- | ----------------------- |
| `sm` | `px-2 py-0.5 text-xs`   |
| `md` | `px-2.5 py-1 text-sm`   |
| `lg` | `px-3 py-1.5 text-base` |

### 4.5 Modal

**File**: `components/ui/modal.tsx`

- Uses `backdrop-blur` overlay
- Contains `ModalHeader`, `ModalContent`, `ModalFooter` sub-components
- Dark theme with `.black-theme-card` styling

### 4.6 Alert Dialog

**File**: `components/ui/alert-dialog.tsx`

- Confirms destructive actions
- Contains `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`

### 4.7 Floating Action Button (FAB)

**File**: `components/ui/floating-action-button.tsx`

- Mobile-only (`mobileOnly` prop)
- Position: `bottom-right`
- Variants: `primary`, `success`, etc. (matches Button variants)

### 4.8 Swipeable Card

**File**: `components/ui/swipeable-card.tsx`

- iOS-style swipe actions
- Uses `memo` for performance
- Supports left/right swipe actions with icons and labels

### 4.9 Select

**File**: `components/ui/select.tsx`

- Custom select with glass morphism
- Options with icons support

### 4.10 Switch / Checkbox

**Files**: `components/ui/switch.tsx`, `components/ui/checkbox.tsx`

- iOS-style toggle for Switch
- Standard checkbox with focus-ring

### 4.11 Progress Components

**Files**: `components/ui/progress.tsx`, `components/ui/progress-ring.tsx`

- Linear progress bar
- Circular progress ring

### 4.12 Loading States

**Files**: `components/ui/loading.tsx`, `components/ui/suspense-loading.tsx`

| Component          | Usage                                       |
| ------------------ | ------------------------------------------- |
| `Loading`          | Generic spinner with optional text          |
| `Spinner`          | Standalone spinner, sizes: `sm`, `md`, `lg` |
| `PageLoading`      | Full-page loading state                     |
| `SuspenseLoading`  | Generic suspense wrapper                    |
| `FormLoading`      | Form skeleton                               |
| `ChartLoading`     | Chart skeleton                              |
| `DashboardLoading` | Dashboard skeleton                          |
| `ReportsLoading`   | Reports skeleton                            |

### 4.13 Alert

**File**: `components/ui/alert.tsx`

- Variants: `info`, `success`, `warning`, `error`
- Supports icon, title, description

### 4.14 Empty State

**File**: `components/ui/empty-state.tsx`

- Icon, title, description, optional CTA button

### 4.15 Collapsible Section

**File**: `components/ui/collapsible-section.tsx`

- Accordion-style sections with animated expand/collapse

### 4.16 Navigation Components

| Component        | File                                    | Description                                      |
| ---------------- | --------------------------------------- | ------------------------------------------------ |
| `Sidebar`        | `components/layout/sidebar.tsx`         | Desktop sidebar, collapsible (64px to 256px)     |
| `MobileNav`      | `components/layout/mobile-nav.tsx`      | Bottom tab bar, portal-rendered to `#modal-root` |
| `MobileMenuFAB`  | `components/layout/mobile-menu-fab.tsx` | Floating menu button on mobile                   |
| `Header`         | `components/layout/header.tsx`          | Top bar with logo, notifications, user menu      |
| `MainLayout`     | `components/layout/main-layout.tsx`     | App shell combining all navigation               |
| `PageTransition` | `components/layout/page-transition.tsx` | Page transition wrapper                          |

### 4.17 Amount Styling Utilities

Defined in `app/globals.css`:

| Class                    | Styles                                                                       | Usage                      |
| ------------------------ | ---------------------------------------------------------------------------- | -------------------------- |
| `.amount-strong`         | `font-semibold; font-variant-numeric: tabular-nums`                          | All monetary amounts       |
| `.amount-emphasis-white` | `amount-strong; color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.25)` | Neutral/total amounts      |
| `.amount-positive`       | `amount-strong; color: #34d399; text-shadow: 0 0 8px rgba(52,211,153,0.25)`  | Income, positive changes   |
| `.amount-negative`       | `amount-strong; color: #f43f5e; text-shadow: 0 0 8px rgba(244,63,94,0.25)`   | Expenses, negative changes |

### 4.18 Utility Classes

Defined in `app/globals.css`:

| Class                | Styles                                                                                                                                     | Usage                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `.cn()`              | `twMerge(clsx(...))`                                                                                                                       | Class merging utility (from `lib/utils.ts`) |
| `.transition-ios`    | `transition-colors transition-shadow transition-transform duration-200 ease-out`                                                           | Standard iOS transition                     |
| `.transition-smooth` | Same as `.transition-ios`                                                                                                                  | Alias                                       |
| `.focus-ring`        | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` | Focus accessibility                         |
| `.focus-glow`        | Same as `.focus-ring`                                                                                                                      | Alias                                       |
| `.hover-lift`        | `transform-gpu transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0`                                      | Hover elevation                             |
| `.micro-bounce`      | `active:scale-[0.99]`                                                                                                                      | Press feedback                              |
| `.hover-glow`        | `hover:shadow-glow`                                                                                                                        | Hover glow effect                           |

---

## 5. Layout Principles

### 5.1 Spacing Scale

Uses Tailwind's default spacing scale (0.25rem increments):

| Token | Value            |
| ----- | ---------------- |
| `1`   | `0.25rem` (4px)  |
| `2`   | `0.5rem` (8px)   |
| `3`   | `0.75rem` (12px) |
| `4`   | `1rem` (16px)    |
| `6`   | `1.5rem` (24px)  |
| `8`   | `2rem` (32px)    |
| `12`  | `3rem` (48px)    |
| `16`  | `4rem` (64px)    |

### 5.2 Grid System

- **Desktop**: Centered content with `max-w-6xl mx-auto px-6 py-8`
- **Mobile**: Full-width with `px-4 py-6`
- **Gap**: Use `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)

### 5.3 Responsive Breakpoints (Custom)

Defined in `tailwind.config.ts`:

| Breakpoint | Width    | Usage                           |
| ---------- | -------- | ------------------------------- |
| `tiny`     | `350px`  | Very small phones, label hiding |
| `xs`       | `475px`  | Small phones                    |
| `sm`       | `640px`  | Large phones                    |
| `md`       | `768px`  | Tablets                         |
| `lg`       | `1024px` | Small desktops, sidebar visible |
| `xl`       | `1280px` | Standard desktops               |
| `2xl`      | `1536px` | Large monitors                  |

### 5.4 Mobile-First Rules

1. **No horizontal scroll**: `.no-horizontal-scroll` applied globally (`overflow-x: hidden`)
2. **Single scroll owner**: `#root` is the only vertical scroll container. `html`, `body`, `main` are `overflow: hidden`
3. **Dynamic viewport height**: Use `.h-dynamic-screen` or `.min-h-dynamic-screen` instead of `h-screen` / `min-h-screen`
4. **Safe area padding**: Use `pl-safe-left`, `pr-safe-right`, `pt-safe-top`, `pb-safe-bottom` or `env(safe-area-inset-*)`
5. **Touch targets**: Minimum `44x44px` (`min-h-[44px] min-w-[44px]`) for all interactive elements
6. **Bottom padding on mobile**: Main content gets `pb-24` on mobile to account for bottom nav bar

### 5.5 Scroll Ownership

```css
html,
body {
  height: 100%;
  overflow: hidden;
}
#root {
  height: var(--app-height, 100dvh);
  overflow-y: auto;
}
```

This prevents nested scroll contexts and mobile scroll jank.

---

## 6. Depth & Elevation

### 6.1 Shadow System

Defined in `tailwind.config.ts`:

| Class                | Value                                                                 | Usage              |
| -------------------- | --------------------------------------------------------------------- | ------------------ |
| `shadow-soft`        | `0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)` | Subtle elevation   |
| `shadow-medium`      | `0 4px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`  | Standard cards     |
| `shadow-strong`      | `0 10px 40px -10px rgba(0,0,0,0.15), 0 4px 25px -5px rgba(0,0,0,0.1)` | Elevated panels    |
| `shadow-glow`        | `0 0 20px rgba(59,130,246,0.15)`                                      | Blue glow effect   |
| `shadow-accent-glow` | `0 0 20px rgba(168,85,247,0.15)`                                      | Purple glow effect |

### 6.2 iOS Shadows

| Class           | Value                          | Usage                |
| --------------- | ------------------------------ | -------------------- |
| `shadow-ios`    | `0 10px 24px rgba(0,0,0,0.28)` | Standard iOS card    |
| `shadow-ios-sm` | `0 4px 12px rgba(0,0,0,0.22)`  | Small elements       |
| `shadow-ios-md` | `0 10px 24px rgba(0,0,0,0.28)` | Medium cards         |
| `shadow-ios-lg` | `0 18px 40px rgba(0,0,0,0.35)` | Large panels, modals |

### 6.3 Glass Morphism Surfaces

| Class          | Styles                                                | Usage                                    |
| -------------- | ----------------------------------------------------- | ---------------------------------------- |
| `.glass`       | `border border-white/20 bg-white/10 backdrop-blur-md` | Generic glass surface                    |
| `.glass-card`  | `backdrop-blur-xl`                                    | Card-level glass (combined with bg-card) |
| `.glass-light` | `backdrop-blur-md`                                    | Lighter glass (buttons, inputs)          |

### 6.4 Black Theme Surfaces

| Class                  | Styles                                                                                                       | Usage                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `.black-theme-header`  | `background: rgba(8,8,8,0.95); border-bottom: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px)` | Top navigation bar       |
| `.black-theme-sidebar` | `background: rgba(8,8,8,0.95); border-right: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px)`  | Desktop sidebar          |
| `.black-theme-card`    | `background: rgba(8,8,8,0.95); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px)`         | Dropdown menus, popovers |

### 6.5 Gradient Backgrounds

| Class                                         | Value                                                                            | Usage                     |
| --------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| `bg-hero-gradient`                            | `linear-gradient(135deg, primary 0%, accent 100%)`                               | Hero sections, hero cards |
| `bg-card-gradient`                            | `linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)` | Card surfaces             |
| `bg-gradient-to-r from-primary to-primary/90` | Horizontal primary gradient                                                      | Buttons, CTAs             |

### 6.6 Elevation Hierarchy

```text
Level 0: Page background (black, #000000)
Level 1: Cards (glass-card + shadow-ios-md)
Level 2: Hovered cards (shadow-ios-lg + scale)
Level 3: Overlays/Dropdowns (black-theme-card + shadow-xl)
Level 4: Modals (black-theme-card + shadow-2xl + backdrop-blur)
Level 5: Notifications/Toasts (sonner, top-right)
```

---

## 7. Responsive Behavior

### 7.1 Separate Mobile/Desktop Components

The app uses **explicit mobile/desktop branching** within components rather than CSS-only responsive design:

```tsx
// Pattern used in Header, MainLayout, etc.
const { isMobile } = useSidebar();

if (isMobile) {
  return <MobileLayout />; // Compact, bottom nav, FABs
}

return <DesktopLayout />; // Sidebar, full header, wider content
```

### 7.2 Mobile Chrome Layout

| Element         | Mobile                                     | Desktop                                      |
| --------------- | ------------------------------------------ | -------------------------------------------- |
| Navigation      | Bottom tab bar (`MobileNav`)               | Left sidebar (`Sidebar`)                     |
| Header          | Compact (logo + user avatar)               | Full (logo + balance + notifications + user) |
| Content padding | `px-4 py-6`                                | `mx-auto max-w-6xl px-6 py-8`                |
| Bottom spacing  | `pb-24` (for tab bar)                      | None                                         |
| FABs            | Visible (`MobileMenuFAB`, transaction FAB) | Hidden                                       |
| Sidebar         | Hidden (use FAB to open)                   | Visible, collapsible                         |

### 7.3 Safe Area Support

Defined in `tailwind.config.ts`:

```ts
spacing: {
  'safe-top': 'env(safe-area-inset-top)',
  'safe-right': 'env(safe-area-inset-right)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-left': 'env(safe-area-inset-left)',
}
```

**Usage patterns**:

```css
/* Mobile nav bottom padding */
padding-bottom: max(0.75rem, env(safe-area-inset-bottom));

/* Header top padding */
style={{ height: 'env(safe-area-inset-top)' }}

/* Content side padding */
padding-left: max(1rem, env(safe-area-inset-left));
```

### 7.4 iOS Viewport Handling

```tsx
// In app/layout.tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent pinch-zoom distortion
  userScalable: false, // Lock zoom on mobile
  viewportFit: 'cover', // For iOS safe areas
  interactiveWidget: 'resizes-visual', // Keyboard adjusts viewport
};
```

### 7.5 Dynamic Viewport Height

```css
.h-dynamic-screen {
  height: var(--app-height, 100dvh);
}
.min-h-dynamic-screen {
  min-height: var(--app-height, 100dvh);
}
```

The `--app-height` variable is updated dynamically via JavaScript to handle iOS Safari's dynamic toolbar.

### 7.6 iOS Safari Specific Fixes

```css
/* Force input text visibility in dark mode */
.dark input,
.dark textarea,
.dark select {
  color: #ffffff;
  caret-color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  -webkit-appearance: none;
}

/* Fix autofill styling */
.dark input:-webkit-autofill {
  -webkit-text-fill-color: #ffffff !important;
  transition: background-color 9999s ease-in-out 0s;
}

/* Date input icon visibility */
.dark input[type='date']::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.8);
}
```

### 7.7 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .transition-ios {
    transition-duration: 0ms !important;
  }
  .hover-lift,
  .micro-bounce {
    transform: none !important;
  }
  /* All animations disabled */
}
```

---

## 8. Design Guardrails

### 8.1 Do's

| Rule                                                         | Example                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| **DO use semantic color tokens**                             | `bg-background`, `text-foreground`, `border-border`                   |
| **DO use `.cn()` for class merging**                         | `cn('base-class', conditional && 'active-class', className)`          |
| **DO use `.transition-ios` for all transitions**             | `className="transition-ios hover:scale-105"`                          |
| **DO use `rounded-xl` to `rounded-3xl` for containers**      | Cards: `rounded-2xl`, Buttons: `rounded-xl`, StatCards: `rounded-3xl` |
| **DO use `glass-card` + `shadow-ios-*` for surfaces**        | `className="glass-card shadow-ios-md"`                                |
| **DO use `.amount-positive` / `.amount-negative` for money** | `<span className="amount-positive">+${amount}</span>`                 |
| **DO use `min-h-[44px] min-w-[44px]` for touch targets**     | All buttons, links, icons                                             |
| **DO use `data-*` attributes for overlays**                  | `data-overlay-backdrop="notifications"`                               |
| **DO use `portal` for overlays on mobile**                   | `createPortal(..., document.getElementById('modal-root'))`            |
| **DO use `useMemo` for expensive calculations**              | Balance totals, formatted strings                                     |
| **DO use `useCallback` for event handlers**                  | `onClick`, `onChange`                                                 |
| **DO use `React.forwardRef` for UI components**              | All components in `/components/ui/`                                   |
| **DO use domain-driven component folders**                   | `components/transactions/`, `components/budgets/`                     |
| **DO respect `tiny` breakpoint (350px) for label hiding**    | `@media (max-width: 350px) { .nav-label { display: none; } }`         |

### 8.2 Don'ts

| Rule                                                                          | Anti-pattern                                          | Fix                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| **DON'T use light mode classes**                                              | `bg-white`, `text-black`                              | Use `bg-background`, `text-foreground`                       |
| **DON'T use `h-screen` or `min-h-screen`**                                    | Causes black bars on iOS Safari                       | Use `.h-dynamic-screen` or `.min-h-dynamic-screen`           |
| **DON'T create nested scroll contexts**                                       | `overflow-y: auto` on child elements                  | Let `#root` own scrolling                                    |
| **DON'T use hardcoded colors**                                                | `#3b82f6`, `#22c55e`                                  | Use semantic tokens: `text-primary`, `text-success`          |
| **DON'T use `font-weight: 300` or lighter**                                   | Unreadable on black                                   | Minimum `font-medium` (500)                                  |
| **DON't use `!important` unless matching existing patterns**                  | Breaks cascade                                        | Only in `.black-theme-*` classes (already established)       |
| **DON'T use `hover:` on mobile-only elements**                                | No hover on touch                                     | Use `active:` for touch feedback                             |
| **DON'T use `onClick` without `type="button"`**                               | Triggers form submission                              | Always `type="button"` on non-submit buttons                 |
| **DON'T use inline `style` for layout**                                       | `style={{ display: 'flex' }}`                         | Use Tailwind classes                                         |
| **DON'T use `px-0` on mobile content**                                        | Touches edges                                         | Minimum `px-4` on mobile                                     |
| **DON'T create new animation keyframes without adding to tailwind.config.ts** | Inconsistent animations                               | Add to `theme.extend.keyframes` and `theme.extend.animation` |
| **DON'T bypass the `cn()` utility**                                           | `className={\`base ${conditional ? 'active' : ''}\`}` | Use `cn('base', conditional && 'active')`                    |
| **DON'T use `blur()` without `backdrop-` prefix**                             | Blurs element, not background                         | Use `backdrop-blur-md`                                       |
| **DON'T forget `aria-*` attributes on interactive elements**                  | Accessibility violation                               | Always add `aria-label`, `aria-expanded`, `aria-controls`    |

### 8.3 Naming Conventions

| Convention              | Pattern                            | Example                                             |
| ----------------------- | ---------------------------------- | --------------------------------------------------- |
| **Component files**     | `kebab-case.tsx`                   | `stat-card.tsx`, `transaction-form.tsx`             |
| **Component functions** | `PascalCase`                       | `function StatCard()`, `function TransactionForm()` |
| **CSS classes**         | `kebab-case` or Tailwind utilities | `.glass-card`, `.amount-positive`                   |
| **CSS variables**       | `--kebab-case`                     | `--safe-area-top`, `--app-height`                   |
| **Domain folders**      | `kebab-case`                       | `components/transactions/`, `components/budgets/`   |
| **UI primitives**       | `/components/ui/`                  | `button.tsx`, `card.tsx`, `input.tsx`               |
| **Hooks**               | `use-kebab-case.ts`                | `use-auth.ts`, `use-subscription.ts`                |
| **Types**               | `PascalCase` interfaces/types      | `ButtonProps`, `ButtonVariant`                      |

---

## 9. Agent Prompt Guide

### 9.1 Quick-Reference Token Map

When generating UI code, use this token map:

```text
Background     → bg-background (pure black #000000)
Surface        → bg-card/80 glass-card shadow-ios-md
Text primary   → text-foreground
Text secondary → text-muted-foreground
Border         → border-border/50
Primary CTA    → bg-gradient-to-r from-primary to-primary/90 text-primary-foreground
Success        → text-success / bg-success
Warning        → text-warning / bg-warning
Error          → text-destructive / bg-destructive
Positive money → amount-positive
Negative money → amount-negative
Total/neutral  → amount-emphasis-white
Transition     → transition-ios
Touch feedback → active:scale-[0.98] micro-bounce
Hover effect   → hover-lift hover:scale-105
Focus          → focus-ring
```

### 9.2 Common Patterns

#### Pattern: New Card Component

```tsx
import { cn } from '@/lib/utils';

interface MyCardProps {
  className?: string;
  children: React.ReactNode;
}

export function MyCard({ className, children }: MyCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-card/80 text-card-foreground',
        'glass-card shadow-ios-md hover:shadow-ios-lg',
        'hover-lift transition-smooth active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
}
```

#### Pattern: New Button Variant

Add to `components/ui/button.tsx` `variants` object:

```ts
myVariant: 'bg-gradient-to-r from-X to-X/90 text-white shadow-lg hover:shadow-xl glass-light',
```

#### Pattern: Responsive Content Area

```tsx
<div className={cn(isMobile ? 'px-4 py-6' : 'mx-auto max-w-6xl px-6 py-8')}>
  {children}
</div>
```

#### Pattern: Mobile/Desktop Branch

```tsx
const { isMobile } = useSidebar();

if (isMobile) {
  return <MobileVersion />;
}

return <DesktopVersion />;
```

#### Pattern: Portal Overlay

```tsx
const overlayHost =
  typeof document !== 'undefined'
    ? (document.getElementById('modal-root') ?? document.body)
    : null;

return overlayHost
  ? createPortal(
      <div className="black-theme-card fixed z-[55] rounded-xl shadow-xl">
        {/* content */}
      </div>,
      overlayHost
    )
  : null;
```

### 9.3 AI Prompt Templates

#### Template: Create a new UI component

```text
Create a {component name} component in components/ui/{kebab-name}.tsx
- Use React.forwardRef with proper TypeScript types
- Apply base styles: rounded-2xl border border-border/50 bg-card/80 glass-card shadow-ios-md
- Add transition-ios, hover-lift, active:scale-[0.98]
- Use cn() for class merging with className prop
- Follow the existing patterns in components/ui/card.tsx
```

#### Template: Create a new domain component

```text
Create a {component name} in components/{domain}/{kebab-name}.tsx
- Import UI primitives from @/components/ui/
- Use semantic color tokens (bg-background, text-foreground)
- Apply responsive pattern: isMobile ? 'px-4 py-6' : 'mx-auto max-w-6xl px-6 py-8'
- Use amount-positive/amount-negative for monetary values
- Follow domain-driven organization
```

#### Template: Fix a styling issue

```text
The {component} has {issue}. Fix it by:
- Using semantic tokens instead of hardcoded colors
- Applying transition-ios for any transitions
- Ensuring touch targets are min-h-[44px] min-w-[44px]
- Checking mobile/desktop branching
- Using cn() for class composition
```

### 9.4 File Structure Reference

```text
app/
  layout.tsx          # Root layout, font loading, viewport config, forced dark mode
  globals.css         # All custom CSS classes, animations, dark mode fixes
  page.tsx            # Dashboard page (default route)

components/
  ui/                 # Primitive UI components (shadcn-inspired)
    button.tsx        # 7 variants, 3 sizes, loading state
    card.tsx          # Card + Header + Title + Description + Content + Footer
    input.tsx         # With label, error, icon, suffix
    badge.tsx         # 6 variants, 3 sizes
    modal.tsx         # Modal + Header + Content + Footer
    alert-dialog.tsx  # Confirmation dialogs
    alert.tsx         # Info/success/warning/error alerts
    select.tsx        # Custom select
    switch.tsx        # iOS-style toggle
    checkbox.tsx      # Checkbox with focus-ring
    badge.tsx         # Status badges
    progress.tsx      # Linear progress bar
    progress-ring.tsx # Circular progress
    loading.tsx       # Spinner, PageLoading
    suspense-loading.tsx # Skeleton loaders
    skeleton.tsx      # Skeleton placeholder
    empty-state.tsx   # Empty state with CTA
    swipeable-card.tsx # iOS swipe actions
    collapsible-section.tsx # Accordion
    floating-action-button.tsx # FAB
    index.ts          # Barrel exports
  layout/             # App shell components
    main-layout.tsx   # Combines Sidebar + Header + MobileNav
    header.tsx        # Top bar (notifications, user, balance)
    sidebar.tsx       # Desktop sidebar navigation
    mobile-nav.tsx    # Bottom tab bar
    mobile-menu-fab.tsx # Mobile menu FAB
    page-transition.tsx # Page transition wrapper
  branding/           # Logo, brand assets
    fintec-logo.tsx   # FinTec logo component
  forms/              # Form components
    transaction-form.tsx
    account-form.tsx
    category-form.tsx
    budget-form.tsx
    goal-form.tsx
    icon-picker.tsx
    color-picker.tsx
    balance-alert-settings.tsx
  dashboard/          # Dashboard-specific
    stat-card.tsx     # Dashboard stat cards
  transactions/       # Transaction domain
  accounts/           # Account domain
  budgets/            # Budget domain
  goals/              # Goal domain
  categories/         # Category domain
  transfers/          # Transfer domain
  debts/              # Debt domain
  currency/           # Currency/exchange rate
  filters/            # Filter components
  auth/               # Auth forms
  reports/            # Reports components
  ai/                 # AI chat components
  onboarding/         # Onboarding flow
  waitlist/           # Waitlist components

hooks/                # Custom React hooks
lib/                  # Utilities, services, domain logic
types/                # TypeScript types
contexts/             # React contexts (sidebar, auth, etc.)
providers/            # Provider components
```

### 9.5 Checklist Before Generating Code

- [ ] Using `cn()` for class composition?
- [ ] Using semantic color tokens (not hardcoded hex)?
- [ ] Using `transition-ios` for transitions?
- [ ] Using `rounded-xl` to `rounded-3xl` for containers?
- [ ] Using `glass-card` or `glass-light` for surfaces?
- [ ] Touch targets are `min-h-[44px] min-w-[44px]`?
- [ ] `aria-*` attributes on interactive elements?
- [ ] `type="button"` on non-submit buttons?
- [ ] Using `amount-positive`/`amount-negative` for money?
- [ ] No `h-screen` / `min-h-screen` (use dynamic viewport)?
- [ ] No nested scroll contexts?
- [ ] Mobile/desktop branching considered?
- [ ] Component uses `React.forwardRef`?
- [ ] Proper TypeScript interfaces exported?
- [ ] File named in `kebab-case.tsx`?
- [ ] Component function in `PascalCase`?
- [ ] Placed in correct domain folder?

---

> **Last updated**: 2026-04-15
> **Maintained by**: Design system conventions established in the FinTec codebase
> **Source files**: `app/globals.css`, `tailwind.config.ts`, `components/ui/*`, `app/layout.tsx`
