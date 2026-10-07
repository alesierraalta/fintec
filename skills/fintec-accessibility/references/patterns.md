# FinTec Accessibility — Code Patterns

Relocated from SKILL.md. Utilities referenced exist in `app/globals.css`; tokens (`text-ios-*`, `glass-card`) are defined in `tailwind.config.ts`.

## Keyboard Navigation

```tsx
// Correct: semantic button, Enter/Space handled natively
<button onClick={handleClick} className="focus-ring">
  Click Me
</button>

// Custom clickable div — only when no semantic element fits
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  className="cursor-pointer focus-ring"
>
  Custom Button
</div>

// Incorrect: div without role/tabindex is not keyboard accessible
<div onClick={handleClick}>Click Me</div>
```

## ARIA Labels

```tsx
<button aria-label="Close dialog" onClick={onClose} className="focus-ring">
  <X className="h-4 w-4" />
</button>

<nav aria-label="Main navigation">
  <ul>
    <li>
      <a href="/accounts" aria-current={isActive ? 'page' : undefined}>
        Accounts
      </a>
    </li>
  </ul>
</nav>

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

## Modal Dialog Accessibility

Prefer `components/ui/modal.tsx`. If custom:

```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    }
    return () => {
      previousFocus.current?.focus();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
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
          className="focus-ring absolute right-4 top-4"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};
```

## Screen Reader Announcements

```tsx
interface AnnouncerProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export function Announcer({ message, politeness = 'polite' }: AnnouncerProps) {
  return (
    <div aria-live={politeness} aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
```

## Skip Navigation Link

```tsx
// At the start of the layout
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-500 focus:text-white"
>
  Skip to main content
</a>

<main id="main-content">{children}</main>
```

## Reduced Motion

Already handled globally in `app/globals.css` (`@media (prefers-reduced-motion: reduce)`). Do not add per-component guards unless introducing a new animation not covered there.

## Focus Trap (mobile nav / overlays)

```tsx
const handleTabKey = (e: KeyboardEvent) => {
  if (!navRef.current) return;
  const focusable = navRef.current.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
};
```

## Color Contrast

- `.text-success`, `.text-error`, `.text-warning` (globals.css) are the semantic text colors — verify contrast on `--background`.
- Avoid `text-gray-500`/`text-gray-600` on near-black backgrounds (too dark).

## iOS VoiceOver

```tsx
<div aria-live="polite">Transaction created</div>
<div aria-hidden="true">Decorative icon</div>
<button aria-label="Delete transaction, $1,234.56">
  <Trash2 />
</button>
```

## WCAG 2.2 Minimum Ratios

- Normal text: 4.5:1 (AA), 7:1 (AAA)
- Large text: 3:1 (AA), 4.5:1 (AAA)
