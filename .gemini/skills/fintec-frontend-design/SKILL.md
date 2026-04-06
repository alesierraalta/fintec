---
name: fintec-frontend-design
description: >
  Create distinctive, production-grade frontend interfaces for FinTec's iOS-native glass morphism design system.
  Use when asked to create new UI components, pages, modals, forms, or style any interface element in FinTec.
  Trigger: "new component", "new page", "style this", "UI", "frontend", "glass morphism", "iOS design", "dark theme"
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: '1.0'
---

## When to Use

- Creating new components UI en FinTec
- Estilizando páginas, modals, forms o cards
- Implementando animaciones o transacciones
- Modificando componentes existentes
- Trabajando con glass morphism o black theme

## Critical Patterns

### 1. Glass Morphism Surfaces (OBLIGATORIO)

TODAS las superficies usan glass effects. NUNCA uses bg-solid colors.

```tsx
// ✅ CORRECTO - Glass card
<div className="glass-card shadow-ios-md">
  <h2>Account Balance</h2>
</div>

// ❌ INCORRECTO - Solid background
<div className="bg-gray-900 rounded-lg">
  <h2>Account Balance</h2>
</div>
```

Glass utilities disponibles:

- `.glass` — backdrop-blur-md, rgba(0,0,0,0.4)
- `.glass-card` — backdrop-blur-xl, rgba(0,0,0,0.6), border subtle
- `.glass-light` — backdrop-blur-md, rgba(255,255,255,0.05)

### 2. Black Theme Surfaces

Para headers, sidebars y cards del tema black:

```tsx
// Header
<div className="black-theme-header">
  {/* rgba(8, 8, 8, 0.95) with backdrop-blur */}
</div>

// Sidebar
<aside className="black-theme-sidebar">
  {/* Fixed sidebar with glass effect */}
</aside>

// Card
<div className="black-theme-card">
  {/* Elevated surface */}
</div>
```

### 3. iOS Interaction Model

TODO elemento interactivo DEBE tener:

```tsx
// Botón interactivo
<button className="transition-smooth min-h-[44px] min-w-[44px] hover:scale-105 active:scale-[0.98]">
  Click Me
</button>
```

Reglas:

- `active:scale-[0.98]` para botones
- `active:scale-[0.99]` para cards clickeables
- `transition-smooth` con cubic-bezier iOS
- Touch targets MÍNIMO 44px

### 4. Mobile/Desktop Branching

NO uses solo media queries. Usa branching explícito:

```tsx
const { isMobile } = useSidebar();

return isMobile ? (
  <MobileDashboard {...props} />
) : (
  <DesktopDashboard {...props} />
);
```

Pattern obligatorio:

- Crear `mobile-{component}.tsx`
- Crear `desktop-{component}.tsx`
- Componente padre hace branching con `useSidebar()`

### 5. Amount Display (Financial)

Para mostrar montos financieros:

```tsx
// ✅ Income/positive
<span className="amount-positive">
  +$1,234.56
</span>

// ✅ Expense/negative
<span className="amount-negative">
  -$567.89
</span>

// ✅ Total/emphasis
<span className="amount-emphasis-white">
  $12,345.67
</span>

// ✅ Tabular numbers for alignment
<span className="amount-strong">
  1,234.56
</span>
```

### 6. cn() Class Composition

ÚNICO patrón aceptado para clases condicionales:

```tsx
import { cn } from '@/lib/utils';

const Button = ({ className, variant = 'primary', ...props }) => (
  <button
    className={cn(
      'base-button-styles',
      {
        'primary-variant': variant === 'primary',
        'secondary-variant': variant === 'secondary',
      },
      className
    )}
    {...props}
  />
);
```

### 7. Typography Scale (iOS-like)

```tsx
// Títulos
<h1 className="text-ios-large-title">Dashboard</h1>
<h2 className="text-ios-title">Accounts</h2>
<h3 className="text-ios-headline">Transactions</h3>

// Body
<p className="text-ios-body">Content here</p>
<span className="text-ios-caption">$1,234</span>
<span className="text-ios-footnote">Last updated 2h ago</span>

// Code/monospace
<code className="font-mono">API_KEY</code>
```

### 8. Portal-Rendered Overlays

TODO modal/dropdown/mobile nav usa portal:

```tsx
import { createPortal } from 'react-dom';

const MobileNav = () => {
  return createPortal(
    <nav className="fixed bottom-0">{/* Navigation */}</nav>,
    document.getElementById('modal-root')!
  );
};
```

## Component Templates

### Button Variants

```tsx
// Primary action
<button className="
  glass-light
  bg-primary-500
  text-white
  active:scale-[0.98]
  hover:scale-105
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
  shadow-ios-sm
">
  Primary Action
</button>

// Secondary/ghost
<button className="
  text-gray-300
  hover:bg-white/5
  active:scale-[0.98]
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
">
  Secondary
</button>

// Danger
<button className="
  bg-destructive-500
  text-white
  active:scale-[0.98]
  hover:scale-105
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
">
  Delete
</button>
```

### Card Component

```tsx
<div className="glass-card rounded-2xl p-4 shadow-ios-md">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-ios-headline">Card Title</h3>
    <Badge variant="success">Active</Badge>
  </div>
  <p className="text-ios-body text-gray-300">Card content goes here</p>
  <div className="mt-4 border-t border-white/10 pt-4">
    <span className="amount-positive">+$1,234.56</span>
  </div>
</div>
```

### Input Component

```tsx
<input
  className="transition-smooth min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-ios-body text-white placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 active:scale-[0.99]"
  type="text"
  placeholder="Enter amount..."
/>
```

### Modal Component

```tsx
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="glass-card relative mx-4 w-full max-w-lg rounded-2xl p-6 shadow-ios-lg">
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};
```

## Commands

```bash
# Verificar linting de estilos
npm run lint

# Verificar tipos TypeScript
npm run type-check

# Build para validar compilación
npm run build
```

## Resources

- **Design System**: See [DESIGN.md](../DESIGN.md) for complete 9-section design spec
- **Tailwind Config**: See [tailwind.config.ts](../tailwind.config.ts) for tokens
- **Global Styles**: See [app/globals.css](../app/globals.css) for utilities
- **UI Components**: See [components/ui/](../components/ui/) for primitives
