'use client';

import { Download, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { IosInstallSheet } from './ios-install-sheet';
import { InstallSurface } from './install-surface';
import {
  INSTALL_BANNER_TITLE,
  INSTALL_SURFACE_LABEL,
  INSTALL_TAGLINE,
} from './copy';

/**
 * Routes where the install banner must never interrupt: the app has not
 * authenticated the visitor yet, so an install pitch is noise at best and
 * a distraction from completing sign-in at worst. Mirrors the bypass idiom
 * already used by `app/route-aware-providers.tsx#shouldBypassAppProviders`
 * (a `pathname === X || pathname.startsWith(X + '/')` check) rather than
 * inventing a new one.
 */
function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === '/auth' || pathname.startsWith('/auth/');
}

/**
 * Presentational only: consumes `usePwaInstall()` and never touches
 * `beforeinstallprompt`, `navigator`, or `lib/pwa/` directly. Switches on
 * `promptKind` (`'native' | 'instructions' | 'none'`), never on the
 * platform identity — adding a platform only ever touches
 * `lib/pwa/install-platform.ts`.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const {
    promptKind,
    canInstall,
    promptInstall,
    dismiss,
    isDismissed,
    hideForSession,
    isHiddenThisSession,
    isIosPromptEligible,
  } = usePwaInstall();

  if (isAuthRoute(pathname) || isDismissed || isHiddenThisSession) {
    return null;
  }

  if (promptKind === 'instructions') {
    return (
      <IosInstallSheet
        open={isIosPromptEligible}
        onDismiss={dismiss}
        onEscape={hideForSession}
      />
    );
  }

  if (promptKind === 'native' && canInstall) {
    return (
      <InstallSurface
        label={INSTALL_SURFACE_LABEL}
        onEscape={hideForSession}
        className="flex items-center gap-3 sm:inset-x-auto sm:right-6 sm:max-w-sm sm:rounded-2xl"
      >
        <Download className="h-6 w-6 flex-shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-ios-caption font-semibold text-foreground">
            {INSTALL_BANNER_TITLE}
          </p>
          <p className="text-ios-footnote text-muted-foreground">
            {INSTALL_TAGLINE}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="focus-ring rounded-xl bg-primary px-3 py-2 text-ios-caption font-medium text-primary-foreground"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ahora no"
          className="focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </InstallSurface>
    );
  }

  return null;
}
