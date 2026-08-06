'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  resolveInstallPlatform,
  resolvePromptKind,
  type InstallPlatform,
  type PromptKind,
} from '@/lib/pwa/install-platform';
import { readInstallEnvironment } from '@/lib/pwa/environment';
import {
  isDismissalActive,
  readDismissal,
  recordDismissal,
} from '@/lib/pwa/install-dismissal';
import {
  isIosPromptEligible as computeIsIosPromptEligible,
  recordVisitOncePerLoad,
} from '@/lib/pwa/install-engagement';
import {
  clearDeferredInstallEvent,
  getDeferredInstallEvent,
  getIsAppInstalled,
  getServerDeferredInstallEvent,
  getServerIsAppInstalled,
  subscribe,
} from '@/lib/pwa/install-event-store';

export type PromptInstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface UsePwaInstallReturn {
  platform: InstallPlatform;
  /** Derived from `platform` via `resolvePromptKind` — the single source of truth for what to render. */
  promptKind: PromptKind;
  canInstall: boolean;
  /** Triggers the native prompt. No-op when no deferred event is retained. */
  promptInstall: () => Promise<PromptInstallOutcome>;
  /** Explicit, persisted dismissal — starts the 30-day cooldown. */
  dismiss: () => void;
  isDismissed: boolean;
  /**
   * Transient, session-only hide (e.g. an `Escape` keypress meant for some
   * unrelated open UI, such as `components/ui/modal.tsx`, which also
   * listens on `document`). Does NOT persist anything and does NOT start
   * the cooldown; a remount (a real new page load) always starts `false`
   * again. See `dismiss` for the persisted, explicit-close equivalent.
   */
  hideForSession: () => void;
  isHiddenThisSession: boolean;
  /** True once the iOS engagement threshold has been reached. */
  isIosPromptEligible: boolean;
}

export function usePwaInstall(): UsePwaInstallReturn {
  // SSR-safe: platform starts as 'unsupported' and is resolved on mount.
  const [platform, setPlatform] = useState<InstallPlatform>('unsupported');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHiddenThisSession, setIsHiddenThisSession] = useState(false);
  const [isIosPromptEligible, setIsIosPromptEligible] = useState(false);

  // The deferred `beforeinstallprompt` event and the "app installed" flag
  // are owned by `lib/pwa/install-event-store.ts`, a single module-level
  // store shared by every `usePwaInstall()` instance on the page — see
  // that module's docblock for why a per-hook-instance ref cannot do this.
  const deferredEvent = useSyncExternalStore(
    subscribe,
    getDeferredInstallEvent,
    getServerDeferredInstallEvent
  );
  const isAppInstalled = useSyncExternalStore(
    subscribe,
    getIsAppInstalled,
    getServerIsAppInstalled
  );
  const canInstall = deferredEvent !== null && !isAppInstalled;

  useEffect(() => {
    setPlatform(resolveInstallPlatform(readInstallEnvironment()));

    const dismissedAt = readDismissal();
    setIsDismissed(isDismissalActive(dismissedAt, Date.now()));

    // Guarded at module scope (see install-engagement.ts) so a visit is
    // counted once per real document load, not once per mounted
    // `usePwaInstall()` instance — the banner and the settings entry point
    // can both be mounted at once.
    const visitCount = recordVisitOncePerLoad();
    setIsIosPromptEligible(computeIsIosPromptEligible(visitCount));
  }, []);

  const promptInstall = useCallback(async (): Promise<PromptInstallOutcome> => {
    const event = getDeferredInstallEvent();
    if (!event) {
      return 'unavailable';
    }

    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      return outcome;
    } catch {
      // The browser only allows prompt() to be called once per captured
      // event — a second call (e.g. a race between two consumers) throws
      // InvalidStateError. Treat any failure as "no prompt available"
      // rather than leaving a dead button behind.
      return 'unavailable';
    } finally {
      // Clear regardless of outcome: the event is single-use either way,
      // and every subscribed consumer's `canInstall` must flip to `false`
      // together (see install-event-store.ts#clearDeferredInstallEvent).
      clearDeferredInstallEvent();
    }
  }, []);

  const dismiss = useCallback(() => {
    recordDismissal(Date.now());
    setIsDismissed(true);
  }, []);

  const hideForSession = useCallback(() => {
    setIsHiddenThisSession(true);
  }, []);

  return {
    platform,
    promptKind: resolvePromptKind(platform),
    canInstall,
    promptInstall,
    dismiss,
    isDismissed,
    hideForSession,
    isHiddenThisSession,
    isIosPromptEligible,
  };
}
