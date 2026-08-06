'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InstallSurfaceProps {
  children: ReactNode;
  /** Accessible name for the non-modal `role="region"` landmark. */
  label: string;
  /** Per-surface deltas layered on top of the shared chrome below — see
   * `install-prompt.tsx` and `ios-install-sheet.tsx` for what each surface
   * actually overrides (position, corners, max width). Restyling the
   * chrome both surfaces share (position strategy, z-index, background,
   * blur, shadow) is a one-file change here; restyling one surface's own
   * layout is not. */
  className?: string;
  /**
   * Called on `Escape`, while mounted. Intentionally NOT called by any
   * explicit close control inside `children` — callers wire their own
   * button `onClick`s directly. Escape and an explicit close button are
   * different user intents (see `hooks/use-pwa-install.ts`'s
   * `hideForSession` vs `dismiss`): an accidental Escape meant for some
   * other open UI (e.g. `components/ui/modal.tsx`, which also listens on
   * `document`) must never carry the same weight as a deliberate close.
   * Optional: a surface with no dismiss affordance can omit it.
   */
  onEscape?: () => void;
}

/**
 * Shared bottom-sheet / floating-card chrome for the install action prompt
 * and the iOS instructions sheet: position, z-index, background, blur,
 * shadow, and the `Escape` handler. Positioned strictly below the app's
 * navigation chrome (`components/layout/mobile-nav.tsx`'s bottom bar,
 * `components/layout/mobile-menu-fab.tsx`'s FAB and drawer, both at
 * `z-50`) and the modal/sheet layer above that
 * (`components/ui/modal.tsx` `z-[70]`, `components/layout/header.tsx`'s
 * sheets at `z-[54]`-`z-[60]`), so an open modal, sheet, or the mobile FAB
 * drawer always paints above an install surface, never behind it.
 */
const SHARED_SURFACE_CLASSES =
  'fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[48] border border-border/50 bg-card/95 p-4 pb-safe-bottom shadow-2xl backdrop-blur-xl lg:bottom-6';

export function InstallSurface({
  children,
  label,
  className,
  onEscape,
}: InstallSurfaceProps) {
  useEffect(() => {
    if (!onEscape) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);

  return (
    <div
      role="region"
      aria-label={label}
      className={cn(SHARED_SURFACE_CLASSES, className)}
    >
      {children}
    </div>
  );
}
