---
name: fintec-accessibility
description: >
  Audit and improve web accessibility for FinTec following WCAG 2.2 guidelines. Covers keyboard navigation,
  screen reader support, ARIA patterns, and iOS VoiceOver compatibility.
  Trigger: "accessibility", "a11y", "WCAG", "keyboard navigation", "screen reader", "ARIA", "VoiceOver", "focus management"
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: '1.0'
---

## When to Use

- Auditando accesibilidad
- Implementando navegación por teclado
- Agregando ARIA labels
- Mejorando screen reader support
- Fixando focus management

## Critical Patterns

### 1. Focus Management (EXISTENTE)

FinTec ya tiene focus utilities:

```tsx
// Focus ring estándar
<button className="focus-ring">
  {/* Outline visible on focus */}
</button>

// Focus glow para elementos grandes
<input className="focus-glow">
```

### 2. Keyboard Navigation

TODO elemento interactivo debe ser navegable:

```tsx
// ✅ CORRECTO - Botones semánticos
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  }}
>
  Click Me
</button>

// ✅ Custom clickable con role y tabindex
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  }}
  className="cursor-pointer"
>
  Custom Button
</div>

// ❌ INCORRECTO - Div sin role/tabindex
<div onClick={handleClick}>
  Click Me
</div>
```

### 3. ARIA Labels

```tsx
// Icon buttons
<button
  aria-label="Close dialog"
  onClick={onClose}
>
  <X className="h-4 w-4" />
</button>

// Navigation
<nav aria-label="Main navigation">
  <ul>
    <li>
      <a
        href="/accounts"
        aria-current={isActive ? "page" : undefined}
      >
        Accounts
      </a>
    </li>
  </ul>
</nav>

// Forms
<label htmlFor="amount">Amount</label>
<input
  id="amount"
  type="number"
  aria-describedby="amount-error"
  aria-invalid={!!error}
/>
{error && (
  <span id="amount-error" role="alert">
    {error}
  </span>
)}
```

### 4. Modal/Dialog Accessibility

```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocus.current = document.activeElement;

      // Focus trap
      modalRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      // Restore focus
      previousFocus.current?.focus();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="glass-card relative mx-4 w-full max-w-lg rounded-2xl p-6 shadow-ios-lg">
        <h2 id="modal-title" className="mb-4 text-ios-title">
          {title}
        </h2>
        {children}
        <button
          aria-label="Close dialog"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};
```

### 5. Screen Reader Announcements

```tsx
import { useState, useEffect } from 'react';

interface AnnouncerProps {
  message: string;
  politeness: 'polite' | 'assertive';
}

export function Announcer({ message, politeness = 'polite' }: AnnouncerProps) {
  return (
    <div aria-live={politeness} aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

// Usage
const [announcement, setAnnouncement] = useState('');

// When transaction is created
setAnnouncement('Transaction created successfully');

<Announcer message={announcement} politeness="polite" />;
```

### 6. Skip Navigation Link

```tsx
// Agregar al inicio del layout
<a
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only
    focus:absolute
    focus:top-4
    focus:left-4
    focus:z-50
    focus:px-4
    focus:py-2
    focus:bg-primary-500
    focus:text-white
    focus:rounded-lg
  "
>
  Skip to main content
</a>

// En main content
<main id="main-content">
  {children}
</main>
```

### 7. Reduced Motion Support

FinTec YA tiene soporte para `prefers-reduced-motion`:

```tsx
// En globals.css ya existe:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 8. Form Accessibility

```tsx
<fieldset className="space-y-4">
  <legend className="mb-4 text-ios-headline">Transaction Details</legend>

  <div>
    <label htmlFor="amount" className="mb-2 block text-ios-body">
      Amount <span aria-hidden="true">*</span>
      <span className="sr-only">Required</span>
    </label>
    <input
      id="amount"
      type="number"
      required
      aria-required="true"
      aria-describedby="amount-description"
      className="input-field"
    />
    <p id="amount-description" className="mt-1 text-ios-footnote">
      Enter the transaction amount
    </p>
  </div>

  <div>
    <label htmlFor="category" className="mb-2 block text-ios-body">
      Category
    </label>
    <select
      id="category"
      aria-describedby="category-help"
      className="select-field"
    >
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
    <p id="category-help" className="mt-1 text-ios-footnote">
      Select the appropriate category
    </p>
  </div>
</fieldset>
```

### 9. Swipeable Card Accessibility

```tsx
import { useState } from 'react';

const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight }) => {
  const [swiped, setSwiped] = useState(false);

  return (
    <div
      role="listitem"
      aria-label="Swipeable transaction card"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          onSwipeLeft?.();
          setSwiped(true);
        }
        if (e.key === 'ArrowRight') {
          onSwipeRight?.();
          setSwiped(true);
        }
      }}
      className="swipeable-card"
    >
      {children}

      {/* Actions revealed on swipe */}
      <div role="group" aria-label="Card actions" className="swipe-actions">
        <button aria-label="Delete transaction" onClick={onSwipeLeft}>
          <Trash2 className="h-4 w-4" />
        </button>
        <button aria-label="Edit transaction" onClick={onSwipeRight}>
          <Edit className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
```

### 10. Color Contrast

FinTec usa dark theme, verificar contrast ratios:

```tsx
// ✅ GOOD contrast on dark backgrounds
<span className="text-white"> {/* #FFFFFF on #000000 = 21:1 */}
<span className="text-gray-300"> {/* ~#D1D5DB on #000000 = 10.7:1 */}
<span className="text-primary-400"> {/* Light blue on dark */}

// ❌ POOR contrast
<span className="text-gray-500"> {/* Too dark on dark bg */}
<span className="text-gray-600"> {/* Nearly invisible */}
```

Minimum ratios (WCAG 2.2):

- Normal text: 4.5:1 (AA), 7:1 (AAA)
- Large text: 3:1 (AA), 4.5:1 (AAA)

### 11. iOS VoiceOver

```tsx
// VoiceOver announcements
<div aria-live="polite">
  Transaction created
</div>

// Hidden from VoiceOver
<div aria-hidden="true">
  Decorative icon
</div>

// Custom VoiceOver text
<button
  aria-label="Delete transaction, $1,234.56"
>
  <Trash2 />
</button>
```

### 12. Focus Trap in Mobile Nav

```tsx
const MobileNav = () => {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (!navRef.current) return;

      const focusableElements = navRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <nav ref={navRef} aria-label="Mobile navigation">
      {/* Nav items */}
    </nav>
  );
};
```

## Audit Checklist

- [ ] All interactive elements have keyboard navigation
- [ ] Focus states visible and clear
- [ ] ARIA labels on icon buttons
- [ ] Form labels properly associated
- [ ] Modals trap focus and restore on close
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Reduced motion supported
- [ ] Skip navigation link present
- [ ] Screen reader announcements for dynamic content
- [ ] Touch targets minimum 44px
- [ ] No horizontal scroll

## Commands

```bash
# Run axe-core audit (if configured)
npm run test:a11y

# Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility

# Manual testing
# 1. Tab through entire page
# 2. Test with VoiceOver (Mac)
# 3. Test with NVDA (Windows)
# 4. Test with keyboard only
```

## Resources

- **WCAG 2.2**: See [references/](references/) for guidelines
- **Focus Utilities**: See [app/globals.css](../app/globals.css)
- **Modal Pattern**: See [components/ui/modal.tsx](../components/ui/modal.tsx)
