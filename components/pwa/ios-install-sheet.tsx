'use client';

import { Share, SquarePlus } from 'lucide-react';
import { InstallSurface } from './install-surface';
import { IOS_INSTRUCTIONS_TITLE } from './copy';

export interface IosInstallSheetProps {
  open: boolean;
  /** Explicit close (the "Entendido" button). */
  onDismiss: () => void;
  /**
   * Escape-key close. Defaults to `onDismiss` when omitted — safe for
   * callers whose `onDismiss` is already a purely local, non-persisted
   * state toggle (e.g. `install-app-setting.tsx`). A caller whose
   * `onDismiss` persists something (e.g. `install-prompt.tsx`'s cooldown)
   * MUST pass a distinct, non-persisting `onEscape`.
   */
  onEscape?: () => void;
}

/**
 * iOS Safari never fires `beforeinstallprompt`, so there is nothing to
 * defer or trigger — this is a purely instructional sheet for the manual
 * Share -> Add to Home Screen flow. Instructions match the real iOS UI
 * labels verbatim so they can be followed as written.
 */
export function IosInstallSheet({
  open,
  onDismiss,
  onEscape,
}: IosInstallSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <InstallSurface
      label={IOS_INSTRUCTIONS_TITLE}
      onEscape={onEscape ?? onDismiss}
      className="rounded-t-3xl sm:mx-auto sm:max-w-md sm:rounded-3xl"
    >
      <h2 className="text-ios-body font-semibold text-foreground">
        {IOS_INSTRUCTIONS_TITLE}
      </h2>
      <ol className="mt-3 space-y-2 text-ios-caption text-muted-foreground">
        <li className="flex items-center gap-2">
          <Share className="h-4 w-4 flex-shrink-0 text-foreground" />
          Toca el botón <span className="font-medium">Compartir</span> del
          navegador
        </li>
        <li className="flex items-center gap-2">
          <SquarePlus className="h-4 w-4 flex-shrink-0 text-foreground" />
          Selecciona{' '}
          <span className="font-medium">Añadir a pantalla de inicio</span>
        </li>
      </ol>
      <button
        type="button"
        onClick={onDismiss}
        className="focus-ring mt-4 w-full rounded-xl bg-primary px-4 py-2 text-ios-caption font-medium text-primary-foreground"
      >
        Entendido
      </button>
    </InstallSurface>
  );
}
