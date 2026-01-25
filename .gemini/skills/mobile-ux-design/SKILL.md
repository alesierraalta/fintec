---
name: mobile-ux-design
description: >
  Guidance for UI/UX implementation, mobile responsiveness, and design system usage (Tailwind + Capacitor).
  Trigger: working on UI components, styling, mobile layout, animations, or responsive design.
metadata:
  version: '1.0'
  scope: [common]
  auto_invoke: 'styling components or fixing mobile UI'
---

## When to Use

- Creating or modifying UI components (React/Next.js).
- Fixing layout issues on mobile devices (iOS/Android).
- Implementing animations or transitions.
- Adjusting colors, typography, or spacing using the design system.
- Handling safe areas (notch/home indicator) in Capacitor.

## Critical Patterns

### 1. Mobile-First & Safe Areas
- **Safe Areas**: ALWAYS use `pt-safe-top`, `pb-safe-bottom`, `pl-safe-left`, `pr-safe-right` (or `p-safe`) for full-screen containers to avoid notch/home bar overlap.
  - These map to `env(safe-area-inset-*)` defined in `tailwind.config.ts`.
- **Touch Targets**: Ensure interactive elements are at least 44x44px (using `min-h-[44px]` or padding).
- **Inputs on Mobile**: Use `text-[16px]` or larger for inputs to prevent iOS automatic zoom on focus.

### 2. Design System Usage (Tailwind)
- **Colors**: Use semantic names (`bg-primary`, `text-muted-foreground`, `bg-card`) instead of hardcoded hex values.
  - Reference `app/globals.css` CSS variables for the palette.
- **Typography**: Use project-specific text styles like `text-ios-body`, `text-ios-headline`, `text-display-sm`.
- **Shadows**: Prefer `shadow-ios`, `shadow-ios-sm` for card depth.
- **Borders**: Use `border-border` (default) or `border-primary` for active states.

### 3. Animations
- Use predefined animations in `tailwind.config.ts`:
  - `animate-fade-in-up` for entrance.
  - `animate-slide-up` for modals/drawers.
  - `animate-pulse-soft` for loading skeletons.

### 4. Layout Structure
- **Root Layout**: Ensure `h-full` or `min-h-screen` is set correctly.
- **Scroll Areas**: Use `flex-1 overflow-y-auto` for scrollable content within a fixed-height flex container (common in mobile app shells).

## Code Examples

### Standard Mobile Page Layout
```tsx
export default function MobilePage() {
  return (
    // h-screen and safe areas are crucial for app-like feel
    <div className="flex h-screen flex-col bg-background pt-safe-top pb-safe-bottom">
      <header className="flex h-14 items-center justify-between px-4 border-b border-border">
        <h1 className="text-ios-headline font-semibold">Title</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl bg-card p-4 shadow-ios">
          <p className="text-ios-body text-foreground">Content goes here</p>
          <p className="text-ios-caption text-muted-foreground mt-1">Subtitle</p>
        </div>
      </main>
      
      <footer className="p-4 border-t border-border">
        <button className="w-full btn-primary h-12 rounded-full">
          Action
        </button>
      </footer>
    </div>
  );
}
```

### Safe Area Utility Usage
```tsx
// In a fixed bottom navigation or modal
<div className="fixed bottom-0 w-full bg-card border-t pb-safe-bottom">
  <div className="h-16 flex items-center justify-around">
    {/* Nav items */}
  </div>
</div>
```

## Commands

### Check Tailwind Config
```bash
# Verify available custom utilities
cat tailwind.config.ts
```

## Resources

- **Tailwind Config**: `tailwind.config.ts` (Theme definition)
- **Global Styles**: `app/globals.css` (CSS Variables)
