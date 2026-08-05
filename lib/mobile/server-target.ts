/**
 * Resolves the remote origin that the Capacitor native shell loads.
 *
 * The shell bundles no web assets (`webDir` is a placeholder), so this origin is the
 * entire application surface on device. It is resolved from the environment rather than
 * hardcoded, which lets a released APK track every web deploy without being rebuilt.
 *
 * This module is intentionally pure and framework-free: it reads no `process.env`,
 * performs no I/O, and imports nothing from Capacitor. That keeps the contract unit
 * testable without invoking native tooling.
 */

/**
 * Environment variables this resolver understands.
 *
 * The index signature is what lets a real `process.env` be passed directly, without a
 * cast at the call site; unrelated keys are simply ignored.
 */
export interface CapacitorServerEnv {
  [key: string]: string | undefined;

  /**
   * Explicit override for local development against a machine on the LAN or the
   * Android emulator loopback (`http://10.0.2.2:3000`). Takes precedence when set.
   */
  CAP_SERVER_URL?: string;
  /**
   * The deployed origin. Already the project-wide name for this value, so it is reused
   * here rather than duplicated under a mobile-specific name.
   */
  NEXT_PUBLIC_APP_URL?: string;
}

/** The subset of Capacitor's `server` configuration this resolver owns. */
export interface CapacitorServerTarget {
  /** Absolute origin, without a trailing slash. */
  url: string;
  /**
   * Whether the WebView may load plaintext HTTP. Derived from the protocol so an HTTPS
   * target can never ship a cleartext allowance.
   */
  cleartext: boolean;
}

const SUPPORTED_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * Declared explicitly rather than as `keyof CapacitorServerEnv`: the index signature
 * required for `process.env` compatibility would widen that to `string | number`, which
 * would let a typo in the lookup order type-check.
 */
type EnvKey = 'CAP_SERVER_URL' | 'NEXT_PUBLIC_APP_URL';

/** Precedence order: an explicit dev override wins over the deployed origin. */
const LOOKUP_ORDER: readonly EnvKey[] = ['CAP_SERVER_URL', 'NEXT_PUBLIC_APP_URL'];

function readConfigured(
  env: CapacitorServerEnv
): { key: EnvKey; value: string } | null {
  for (const key of LOOKUP_ORDER) {
    const value = env[key]?.trim();
    if (value) {
      return { key, value };
    }
  }
  return null;
}

export function resolveCapacitorServerTarget(
  env: CapacitorServerEnv
): CapacitorServerTarget {
  const configured = readConfigured(env);

  if (!configured) {
    throw new Error(
      'Capacitor server target is not configured. Set CAP_SERVER_URL to a local ' +
        'development origin (for example http://10.0.2.2:3000 for the Android ' +
        'emulator), or NEXT_PUBLIC_APP_URL to the deployed origin.'
    );
  }

  const { key, value } = configured;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${key} is not a valid absolute URL: "${value}". Include the protocol, ` +
        'for example http://10.0.2.2:3000 or https://app.example.com.'
    );
  }

  if (!SUPPORTED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(
      `${key} must use http or https, received "${value}" ` +
        `(protocol "${parsed.protocol}").`
    );
  }

  return {
    url: parsed.toString().replace(/\/+$/, ''),
    cleartext: parsed.protocol === 'http:',
  };
}
