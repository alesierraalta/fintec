/**
 * The only place in `lib/pwa/` that reads browser globals directly. Every
 * other module in this directory (`install-platform.ts`,
 * `install-dismissal.ts`, `install-engagement.ts`) receives its inputs as
 * plain arguments so it stays trivially unit-testable.
 *
 * Native-shell detection itself is NOT owned here: see
 * `lib/platform/native-shell.ts` for why it lives one level up. This
 * module re-exports it so every existing `lib/pwa/` import site keeps
 * working unchanged.
 */

import { isNativeShell } from '@/lib/platform/native-shell';
import type { InstallEnvironment } from './install-platform';

export { isNativeShell };

/** Reads the platform-resolution inputs once from the browser globals. */
export function readInstallEnvironment(): InstallEnvironment {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      isStandalone: false,
      isNativeShell: false,
      maxTouchPoints: 0,
    };
  }

  const isStandaloneDisplayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isIosNavigatorStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    userAgent: navigator.userAgent,
    isStandalone: isStandaloneDisplayMode || isIosNavigatorStandalone,
    isNativeShell: isNativeShell(),
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  };
}
