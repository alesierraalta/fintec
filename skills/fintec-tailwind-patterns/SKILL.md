---
name: fintec-tailwind-patterns
description: >
  Tailwind CSS utility patterns for FinTec's custom design system including breakpoints, shadows, animations,
  and semantic color tokens. Use when styling components, implementing responsive layouts, or working with design tokens.
  Trigger: "Tailwind", "CSS", "styling", "responsive", "breakpoint", "shadow", "animation", "color token", "spacing"
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: '1.0'
---

## When to Use

- Aplicando clases Tailwind en componentes
- Trabajando con breakpoints custom
- Usando sombras, animaciones o transiciones
- Implementando responsive design
- Trabajando con tokens de color semánticos

## Critical Patterns

### 1. Custom Breakpoints

FinTec usa 7 breakpoints custom (NO usar defaults de Tailwind):

```tsx
// Breakpoints disponibles
tiny: 350px    // teléfonos muy pequeños
xs: 475px      // teléfonos pequeños
sm: 640px      // tablets pequeñas
md: 768px      // tablets
lg: 1024px     // laptops
xl: 1280px     // desktops
2xl: 1536px    // pantallas grandes
```

Ejemplo de uso:

```tsx
<div className="grid grid-cols-1 gap-4 tiny:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
  {cards}
</div>
```

### 2. Semantic Color Tokens

USAR tokens semánticos, NO colores hardcodeados:

```tsx
// ✅ CORRECTO
<div className="bg-primary-500 text-background">
<div className="bg-success-500 text-success-foreground">
<div className="bg-warning-500 text-warning-foreground">
<div className="bg-destructive-500 text-destructive-foreground">

// ❌ INCORRECTO
<div className="bg-blue-500 text-white">
<div className="bg-green-500 text-white">
<div className="bg-red-500">
```

Token map completo:

| Token              | Use                    |
| ------------------ | ---------------------- |
| `primary-{50-950}` | Actions, links, brand  |
| `success-{50-950}` | Income, success states |
| `warning-{50-950}` | Alerts, warnings       |
| `error-{50-950}`   | Expenses, destructive  |
| `background`       | Page background        |
| `foreground`       | Primary text           |
| `muted`            | Secondary backgrounds  |
| `muted-foreground` | Secondary text         |
| `card`             | Card backgrounds       |
| `card-foreground`  | Card text              |

### 3. iOS Shadow System

```tsx
// Sombras suaves (cards pequeñas)
<div className="shadow-ios">

// Sombras medias (cards estándar)
<div className="shadow-ios-sm">

// Sombras fuertes (modals, dropdowns)
<div className="shadow-ios-md">

// Sombras máximo (FAB, overlays)
<div className="shadow-ios-lg">
```

Jerarquía de elevación:

| Nivel | Uso                | Clase           |
| ----- | ------------------ | --------------- |
| 0     | Flat surfaces      | `shadow-none`   |
| 1     | Cards básicas      | `shadow-ios`    |
| 2     | Cards elevadas     | `shadow-ios-sm` |
| 3     | Dropdowns, headers | `shadow-ios-md` |
| 4     | Modals, FABs       | `shadow-ios-lg` |

### 4. Custom Animations

```tsx
// Fade in simple
<div className="animate-fade-in">

// Fade in desde abajo
<div className="animate-fade-in-up">

// Slide up (para sheets)
<div className="animate-slide-up">

// Scale in (para modals)
<div className="animate-scale-in">

// Bounce suave
<div className="animate-bounce-gentle">

// Pulse suave
<div className="animate-pulse-soft">

// Glow effect
<div className="animate-glow">

// Gradient animation
<div className="animate-gradient">

// Wiggle (para alerts)
<div className="animate-wiggle">
```

### 5. Transitions iOS-Style

```tsx
// Transición estándar iOS
<button className="transition-smooth">

// Con hover scale
<button className="transition-smooth hover:scale-105">

// Con active scale
<button className="transition-smooth active:scale-[0.98]">

// Para cards clickeables
<div className="transition-smooth active:scale-[0.99] hover:scale-[1.02]">
```

### 6. Safe Area Spacing

Para iOS/mobile con notches:

```tsx
// Padding para safe areas
<div className="pt-safe-top pb-safe-bottom">
<div className="pl-safe-left pr-safe-right">

// Full height con safe area
<div className="h-dynamic-screen">
<div className="min-h-dynamic-screen">
```

### 7. Glass Morphism Utilities

```tsx
// Glass estándar
<div className="glass">
  {/* backdrop-blur-md, bg-black/40 */}
</div>

// Glass para cards
<div className="glass-card">
  {/* backdrop-blur-xl, bg-black/60, border subtle */}
</div>

// Glass ligero
<div className="glass-light">
  {/* backdrop-blur-md, bg-white/5 */}
</div>
```

### 8. Amount Display Utilities

```tsx
// Para montos positivos (income)
<span className="amount-positive">
  {/* Emerald-400 con green glow */}
</span>

// Para montos negativos (expenses)
<span className="amount-negative">
  {/* Rose-500 con red glow */}
</span>

// Para énfasis/totales
<span className="amount-emphasis-white">
  {/* White con glow sutil */}
</span>

// Para tablas/lists (números tabulares)
<span className="amount-strong">
  {/* font-semibold + tabular-nums */}
</span>
```

### 9. Focus Utilities

```tsx
// Focus ring estándar
<input className="focus-ring">

// Focus glow para inputs grandes
<input className="focus-glow">

// Hover lift para cards
<div className="hover-lift">

// Hover glow para botones
<button className="hover-glow">
```

### 10. Scroll Control

```tsx
// Prevenir scroll horizontal
<div className="no-horizontal-scroll">

// Ocultar scrollbar pero mantener funcionalidad
<div className="no-scrollbar">

// Scroll container con iOS bounce
<div className="overflow-y-auto overscroll-contain">
```

## Spacing Scale

Usar escala de Tailwind con extensiones FinTec:

```
0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
```

Custom utilities de safe area:

- `pt-safe-top` / `pb-safe-bottom`
- `pl-safe-left` / `pl-safe-right`

## Responsive Patterns

### Mobile-First con Branching

```tsx
// Pattern 1: CSS-only para layouts simples
<div className="
  grid
  grid-cols-1
  md:grid-cols-2
  xl:grid-cols-3
  gap-4
">

// Pattern 2: JS branching para componentes complejos
const { isMobile } = useSidebar();

return isMobile ? (
  <MobileComponent {...props} />
) : (
  <DesktopComponent {...props} />
);
```

### Touch Targets

TODO elemento interactivo debe tener:

```tsx
<button className="min-h-[44px] min-w-[44px]">
<a className="min-h-[44px] min-w-[44px]">
<div className="min-h-[44px] min-w-[44px]">
```

## Commands

```bash
# Verificar clases no utilizadas
npx tailwindcss build

# Verificar linting
npm run lint
```

## Resources

- **Tailwind Config**: See [tailwind.config.ts](../tailwind.config.ts)
- **Global CSS**: See [app/globals.css](../app/globals.css)
- **Design Spec**: See [DESIGN.md](../DESIGN.md) sections 2, 5, 6, 7
