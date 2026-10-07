# FinTec Tailwind — Utility Catalogue

Relocated from SKILL.md. Source of truth: `tailwind.config.ts` and `app/globals.css`.

## Breakpoints

| Prefix  | Width  |
| ------- | ------ |
| `tiny:` | 350px  |
| `xs:`   | 475px  |
| `sm:`   | 640px  |
| `md:`   | 768px  |
| `lg:`   | 1024px |
| `xl:`   | 1280px |
| `2xl:`  | 1536px |

```tsx
<div className="grid grid-cols-1 gap-4 tiny:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
```

## Semantic Color Tokens (valid combinations)

| Token                                                  | Notes                                     |
| ------------------------------------------------------ | ----------------------------------------- |
| `primary` / `primary-foreground`                       | Actions, links, brand                     |
| `secondary` / `secondary-foreground`                   | Neutral actions                           |
| `destructive` / `destructive-foreground`               | Danger — NO `destructive-500`             |
| `success-{50..950}`                                    | Income, success — NO `success-foreground` |
| `warning-{50..950}`                                    | Alerts — NO `warning-foreground`          |
| `error-{50..950}`                                      | Errors — NO `error-foreground`            |
| `background`, `foreground`, `card`, `card-foreground`  | Surfaces/text                             |
| `muted`, `muted-foreground`, `border`, `ring`, `input` | Supporting                                |

Text color utilities defined in `app/globals.css`: `text-success`, `text-warning`, `text-error`.

```tsx
// Correct
<div className="bg-primary-500 text-primary-foreground">
<div className="bg-success-500/20 text-success">
<div className="bg-warning-500/20 text-warning">
<div className="bg-destructive text-destructive-foreground">

// Incorrect
<div className="bg-destructive-500 text-white">
<div className="bg-success-500 text-success-foreground">  {/* no such token */}
```

## iOS Shadows (actual values)

| Class                          | Value                          | Use                       |
| ------------------------------ | ------------------------------ | ------------------------- |
| `shadow-ios-sm`                | 0 4px 12px rgba(0,0,0,0.22)    | Subtle cards              |
| `shadow-ios` / `shadow-ios-md` | 0 10px 24px rgba(0,0,0,0.28)   | Standard cards, dropdowns |
| `shadow-ios-lg`                | 0 18px 40px rgba(0,0,0,0.35)   | Modals, FABs              |
| `shadow-soft`                  | 0 2px 15px -3px …              | Light web shadows         |
| `shadow-medium`                | 0 4px 25px -5px …              | Medium web shadows        |
| `shadow-strong`                | 0 10px 40px -10px …            | Strong web shadows        |
| `shadow-glow`                  | 0 0 20px rgba(59,130,246,0.15) | Primary glow              |
| `shadow-accent-glow`           | 0 0 20px rgba(168,85,247,0.15) | Accent glow               |

## Animations

`animate-fade-in`, `animate-fade-in-up`, `animate-slide-up`, `animate-scale-in`, `animate-bounce-gentle`, `animate-pulse-soft`, `animate-glow`, `animate-gradient`, `animate-wiggle`. Keyframes live in `tailwind.config.ts`; reduced-motion overrides in `app/globals.css`.

## iOS-Style Transitions

```tsx
<button className="transition-smooth hover:scale-105">
<button className="transition-smooth active:scale-[0.98]">
<div className="transition-smooth active:scale-[0.99] hover:scale-[1.02]">
```

`.transition-smooth` = `.transition-ios` = transition of colors/shadow/transform, 200ms ease-out.

## Safe Area & Dynamic Height

```tsx
<div className="pt-safe-top pb-safe-bottom">
<div className="pl-safe-left pr-safe-right">
<div className="h-dynamic-screen">
<div className="min-h-dynamic-screen">
```

Spacing tokens in `tailwind.config.ts`: `safe-top`, `safe-bottom`, `safe-left`, `safe-right` → `env(safe-area-inset-*)`.

## Glass Morphism Utilities (actual definitions)

```tsx
<div className="glass">      {/* border-white/20 bg-white/10 backdrop-blur-md */}
<div className="glass-card"> {/* backdrop-blur-xl */}
<div className="glass-light">{/* backdrop-blur-md */}
```

## Amount Display Utilities

- `.amount-strong` — font-semibold + tabular-nums
- `.amount-emphasis-white` — amount-strong + text-foreground
- `.amount-positive` — amount-strong + color hsl(var(--success))
- `.amount-negative` — amount-strong + color hsl(var(--error))

```tsx
<span className="amount-positive">+$1,234.56</span>
<span className="amount-negative">-$567.89</span>
<span className="amount-emphasis-white">$12,345.67</span>
```

## Focus / Hover / Scroll Utilities

- Focus: `focus-ring`, `focus-glow`
- Hover: `hover-lift` (translate -1px on hover), `hover-glow` (shadow-glow)
- Scroll: `no-horizontal-scroll`, `no-scrollbar`, `overflow-y-auto overscroll-contain`
- Micro interaction: `micro-bounce` (active:scale-[0.99])

## Responsive Patterns

```tsx
// CSS-only for simple layouts
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

// JS branching for complex components — useSidebar() from @/contexts/sidebar-context
const { isMobile } = useSidebar();
return isMobile ? <MobileComponent /> : <DesktopComponent />;
```

## Touch Targets

```tsx
<button className="min-h-[44px] min-w-[44px]">
```

## Commands

```bash
npm run lint
npm run build
```
