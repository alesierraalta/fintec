/**
 * Pure PWA install-platform resolution.
 *
 * No React, no direct global reads, no DOM side effects. Every input is
 * injected explicitly (see `lib/pwa/environment.ts` for the module that
 * reads the actual globals) so this stays trivially unit-testable and a
 * new platform rule only ever touches this file.
 */

export type InstallPlatform =
  | 'android' // beforeinstallprompt-capable
  | 'ios' // manual Add to Home Screen
  | 'desktop' // beforeinstallprompt-capable desktop browser
  | 'installed' // already running standalone
  | 'unsupported'; // Capacitor native shell, or no install path

/**
 * What kind of install affordance a resolved platform should render.
 * Components MUST switch on this, never on the platform identity string,
 * so adding a platform only ever requires editing `resolveInstallPlatform`
 * and (if the intent mapping actually changes) `resolvePromptKind` below —
 * never the component tree.
 *
 * `'installed'` is distinct from `'none'`: both render no interruptive
 * banner, but a persistent entry point (e.g. a settings row) needs to tell
 * "already installed" apart from "no install path here" to show the right
 * message. `'none'` covers the Capacitor native shell and browsers with no
 * install path at all.
 */
export type PromptKind = 'native' | 'instructions' | 'installed' | 'none';

export interface InstallEnvironment {
  /** navigator.userAgent, injected so the module never reads globals. */
  userAgent: string;
  /** display-mode: standalone OR navigator.standalone. */
  isStandalone: boolean;
  /** True when running inside the Capacitor native shell. */
  isNativeShell: boolean;
  /**
   * navigator.maxTouchPoints. Needed to distinguish iPadOS (which reports a
   * desktop Macintosh user agent since iPadOS 13) from a real Mac.
   */
  maxTouchPoints: number;
}

const IOS_UA_RE = /iPad|iPhone|iPod/i;
const ANDROID_UA_RE = /Android/i;
const MACINTOSH_UA_RE = /Macintosh/i;

/**
 * iPadOS 13+ Safari reports a desktop Macintosh user agent string, so the
 * `IOS_UA_RE` check alone never matches an iPad. A real Mac never reports
 * more than one touch point (usually 0), so a touch-capable "Macintosh"
 * is iPadOS pretending to be desktop Safari.
 */
function isIpadOsDisguisedAsMac(env: InstallEnvironment): boolean {
  return env.maxTouchPoints > 1 && MACINTOSH_UA_RE.test(env.userAgent);
}

/**
 * Pure. Precedence: native shell -> installed -> ios -> android -> desktop -> unsupported.
 */
export function resolveInstallPlatform(
  env: InstallEnvironment
): InstallPlatform {
  if (env.isNativeShell) {
    return 'unsupported';
  }

  if (env.isStandalone) {
    return 'installed';
  }

  if (IOS_UA_RE.test(env.userAgent) || isIpadOsDisguisedAsMac(env)) {
    return 'ios';
  }

  if (ANDROID_UA_RE.test(env.userAgent)) {
    return 'android';
  }

  if (/Chrome|Chromium|Edg|OPR/i.test(env.userAgent)) {
    return 'desktop';
  }

  return 'unsupported';
}

/**
 * Pure. Maps a resolved platform to the kind of install affordance it
 * should render: a native `beforeinstallprompt`-driven action, manual
 * instructions (iOS), or nothing.
 */
export function resolvePromptKind(platform: InstallPlatform): PromptKind {
  switch (platform) {
    case 'android':
    case 'desktop':
      return 'native';
    case 'ios':
      return 'instructions';
    case 'installed':
      return 'installed';
    case 'unsupported':
      return 'none';
  }
}
