# Technical Design: PWA Install Prompt

## 1. Architecture Decisions

- **Own layer, zero new dependencies.** No PWA build plugin is adopted. Adopting `@serwist/next` or `next-pwa` would add a dependency plus build configuration for no behavioural gain here.
- **`public/sw.js` was replaced, not migrated, after a four-review pass found it unsafe to ship.** The original 381-line file predates this change and was **never registered anywhere in the repository** before this branch (verified: zero `serviceWorker` references pre-branch), so there was no installed fleet to migrate and no compatibility obligation. It wrote every `/api/*` response and every server-rendered navigation response into a shared, origin-scoped cache that nothing clears on logout — a same-device cross-user data leak on a financial app. Its precache list (`/offline`, plus three directory prefixes) 404s unconditionally, so `cache.addAll()` always rejected, which meant `self.skipWaiting()` — chained in the rejected promise's `.then()` — never ran, permanently parking any future fix in `waiting`. It is now a minimal worker whose only job is satisfying Chrome's installability requirement (an active worker with a `fetch` handler). See "Descoped: Offline Caching Strategy" below for what was intentionally left out and why.
- **Strict one-way layering: `components -> hooks -> lib`.** A layer never imports from a layer above it. The point of the split is that a single concern lives in a single file, so a change (for example a new platform rule) touches exactly one module.
  - `lib/pwa/install-platform.ts` — pure decision logic (`resolveInstallPlatform`, `resolvePromptKind`). No React, no DOM, no globals read directly.
  - `lib/pwa/environment.ts` — the ONLY module in `lib/pwa/` that reads browser/native-shell globals (`isNativeShell`, `readInstallEnvironment`). Both the hook and `lib/pwa/service-worker.ts` call `isNativeShell()` here instead of each probing `Capacitor.isNativePlatform()` independently.
  - `lib/pwa/install-dismissal.ts` — the dismissal policy's single owner: storage key, `readDismissal`, `recordDismissal`, `isDismissalActive`.
  - `lib/pwa/service-worker.ts` — `registerServiceWorker()`, unit-testable without React; `components/pwa/register-service-worker.tsx` is a thin `useEffect` wrapper around it.
  - `hooks/use-pwa-install.ts` — owns browser event subscriptions and derives `promptKind` from `platform`; no platform or dismissal logic lives here directly, it composes the `lib/pwa/` modules above.
  - `components/pwa/*` — rendering only. Presentational components know nothing about `beforeinstallprompt`, `navigator`, or `@capacitor/core`, and switch on `promptKind` (`'native' | 'instructions' | 'none'`), never on the platform identity string — adding a platform only ever requires touching `lib/pwa/install-platform.ts`.
  - `components/pwa/install-surface.tsx` — the shared bottom-sheet/floating-card chrome for the action prompt and the iOS instructions sheet (position, z-index, background, blur, shadow, padding, `role="region"`, and the `Escape`-to-dismiss handler). Each surface only supplies its own delta classes. Restyling either surface is now a one-file change.
- **Dependency injection over global reads.** The resolver receives `{ userAgent, isStandalone, isNativeShell, maxTouchPoints }` instead of reaching for `navigator` / `window` itself — `lib/pwa/environment.ts` owns that read. This makes every platform branch a plain table-driven unit test with no jsdom gymnastics.
- **Native shell suppression is a precedence rule, not a filter.** The Capacitor check runs FIRST and short-circuits. The native Android/iOS application must never advertise "install our app" — that is a product invariant, not a cosmetic guard.
- **iOS is a separate presentation, not a degraded Android path.** iOS Safari never fires `beforeinstallprompt`, so there is nothing to defer and nothing to trigger. It gets an instructions sheet instead of an action button.
- **Registration is production-only.** A service worker in development caches assets and produces confusing stale-bundle behaviour during local work.

## 2. Data Flow

1.  **Layout render.** `app/layout.tsx` emits `<link rel="manifest">` and the icon links via `metadata`, and mounts `<RegisterServiceWorker />` and `<InstallPrompt />`.
2.  **Registration.** `RegisterServiceWorker` mounts, checks `NODE_ENV === 'production'` and `'serviceWorker' in navigator`, then calls `navigator.serviceWorker.register('/sw.js')`. Failures are swallowed and logged, never thrown.
3.  **Platform resolution.** `usePwaInstall` collects `{ userAgent, isStandalone, isNativeShell }` from the environment once, passes them to `resolveInstallPlatform`, and stores the result.
4.  **Event capture.** The hook subscribes to `beforeinstallprompt` (calls `preventDefault()`, retains the deferred event) and `appinstalled`.
5.  **Dismissal read.** The hook reads the persisted dismissal timestamp and derives `isDismissed` from the 30-day cooldown.
6.  **Derivation.** `canInstall = platform is android|desktop AND a deferred event exists AND NOT isDismissed AND NOT installed`.
7.  **Presentation.**
    - _`platform === 'android' | 'desktop'` and `canInstall`:_ `InstallPrompt` renders the action prompt.
    - _`platform === 'ios'` and NOT `isDismissed`:_ `IosInstallSheet` renders the Share -> Add to Home Screen instructions.
    - _`platform === 'installed' | 'unsupported'`:_ nothing renders.
8.  **User action.** Accept calls `promptInstall()` -> deferred `prompt()` -> native dialog. Dismiss calls `dismiss()` -> timestamp persisted. `appinstalled` clears the deferred event permanently.

## 3. File Changes

### New Files

- `lib/pwa/install-platform.ts`: pure platform resolution (`resolveInstallPlatform`) and prompt-kind derivation (`resolvePromptKind`).
- `lib/pwa/environment.ts`: the single owner of `lib/pwa/` global reads — `isNativeShell()` and `readInstallEnvironment()`.
- `lib/pwa/install-dismissal.ts`: the dismissal policy's single owner — storage key, `readDismissal`, `recordDismissal`, `isDismissalActive`, `DISMISSAL_COOLDOWN_MS`.
- `lib/pwa/install-event-store.ts`: pure, React-free window-key stash for the `beforeinstallprompt` event captured by an inline `beforeInteractive` script.
- `lib/pwa/service-worker.ts`: `registerServiceWorker()`, the unit-testable registration policy.
- `hooks/use-pwa-install.ts`: install lifecycle hook; composes the `lib/pwa/` modules above.
- `components/pwa/register-service-worker.tsx`: `"use client"`, thin `useEffect` wrapper over `registerServiceWorker()`, renders `null`.
- `components/pwa/install-surface.tsx`: `"use client"`, shared bottom-sheet/floating-card chrome for the two surfaces below.
- `components/pwa/install-prompt.tsx`: `"use client"`, presentational action prompt.
- `components/pwa/ios-install-sheet.tsx`: `"use client"`, presentational iOS instructions.

### Modified Files

- `public/sw.js`: replaced with a minimal installability-only worker (see sections 1, 8, 9).
- `app/layout.tsx`: add `metadata.manifest`, `metadata.icons`; reconcile `theme-color`; mount the two client components.
- `public/manifest.json`: split `any` / `maskable` icon entries, set `background_color` to `#010101`, reconcile `theme_color`, correct the `favicon.ico` `sizes` declaration.
- `hooks/index.ts`: re-export `usePwaInstall` and its types.
- `scripts/generate-pwa-icons.mjs`: corrected a stale "80% safe zone" comment (the code always used `MASKABLE_SAFE_RATIO = 0.7`).
- `package.json`: added `sharp` as an explicit `devDependency` (it previously only resolved as a transitive Next.js dependency) and a `pwa:icons` script.

### New Test Files

- `tests/lib/pwa/install-platform.test.ts`
- `tests/lib/pwa/environment.test.ts`
- `tests/lib/pwa/install-dismissal.test.ts`
- `tests/lib/pwa/service-worker.test.ts`
- `tests/lib/pwa/service-worker-policy.test.ts`
- `tests/hooks/use-pwa-install.test.tsx`
- `tests/components/pwa/register-service-worker.test.tsx`
- `tests/components/pwa/install-prompt.test.tsx`
- `tests/components/pwa/ios-install-sheet.test.tsx`
- `tests/components/pwa/install-surface.test.tsx`

## 4. Interfaces

### `lib/pwa/install-platform.ts`

```typescript
export type InstallPlatform =
  | 'android' // beforeinstallprompt-capable
  | 'ios' // manual Add to Home Screen
  | 'desktop' // beforeinstallprompt-capable desktop browser
  | 'installed' // already running standalone
  | 'unsupported'; // Capacitor native shell, or no install path

export type PromptKind = 'native' | 'instructions' | 'installed' | 'none';

export interface InstallEnvironment {
  /** navigator.userAgent, injected so the module never reads globals. */
  userAgent: string;
  /** display-mode: standalone OR navigator.standalone. */
  isStandalone: boolean;
  /** True when running inside the Capacitor native shell. */
  isNativeShell: boolean;
  /** navigator.maxTouchPoints — needed to distinguish iPadOS from a real Mac. */
  maxTouchPoints: number;
}

/** Pure. Precedence: native shell -> installed -> ios -> android -> desktop -> unsupported. */
export function resolveInstallPlatform(
  env: InstallEnvironment
): InstallPlatform;

/** Pure. Maps a resolved platform to the kind of install affordance to render. */
export function resolvePromptKind(platform: InstallPlatform): PromptKind;
```

### `lib/pwa/environment.ts`

```typescript
/** True when running inside the Capacitor native shell. Single source of truth. */
export function isNativeShell(): boolean;

/** Reads the platform-resolution inputs once from the browser globals. */
export function readInstallEnvironment(): InstallEnvironment;
```

### `lib/pwa/install-dismissal.ts`

```typescript
/** Cooldown window applied after a user dismissal. */
export const DISMISSAL_COOLDOWN_MS: number; // 30 days

/** Pure. Returns true while the dismissal is still within the cooldown window. */
export function isDismissalActive(
  dismissedAt: number | null,
  now: number
): boolean;

/** Reads the persisted dismissal timestamp. Corrupt/missing values yield `null`. */
export function readDismissal(): number | null;

/** Persists the dismissal timestamp. Silently no-ops when storage is unavailable. */
export function recordDismissal(now: number): void;
```

Persistence key: `fintec.pwa-install.dismissed-at` in `localStorage`, storing an epoch-millisecond number. Unparsable values are treated as `null`.

### `lib/pwa/service-worker.ts`

```typescript
/** Registers /sw.js. Production-only; no-ops inside the Capacitor native shell. */
export async function registerServiceWorker(): Promise<void>;
```

### `hooks/use-pwa-install.ts`

```typescript
export interface UsePwaInstallReturn {
  platform: InstallPlatform;
  /** Derived from `platform` via `resolvePromptKind` — components switch on this, not `platform`. */
  promptKind: PromptKind;
  canInstall: boolean;
  /** Triggers the native prompt. No-op when no deferred event is retained. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismiss: () => void;
  isDismissed: boolean;
  isIosPromptEligible: boolean;
}

export function usePwaInstall(): UsePwaInstallReturn;
```

### Component contracts

```typescript
// components/pwa/register-service-worker.tsx — renders null.
export function RegisterServiceWorker(): null;

// components/pwa/install-surface.tsx — shared chrome for both surfaces below.
export interface InstallSurfaceProps {
  children: ReactNode;
  label: string;
  className?: string;
  onDismiss?: () => void; // wired to an Escape-key handler
}
export function InstallSurface(props: InstallSurfaceProps): JSX.Element;

// components/pwa/install-prompt.tsx — consumes usePwaInstall(), no event access.
export function InstallPrompt(): JSX.Element | null;

// components/pwa/ios-install-sheet.tsx — presentational only.
export interface IosInstallSheetProps {
  open: boolean;
  onDismiss: () => void;
}
export function IosInstallSheet(
  props: IosInstallSheetProps
): JSX.Element | null;
```

### `public/manifest.json` icon shape (target)

```json
{
  "background_color": "#010101",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

`theme_color` is reconciled to `#000000` to match the existing dark application chrome declared in `app/layout.tsx`; the stale `#0ea5e9` is dropped.

## 5. Testing Strategy

Strict TDD is enabled (`openspec/config.yaml: strict_tdd: true`). Every unit below is written RED first. Runner is Jest (`npm test`); DOM tests land in the `dom` project, so all files sit outside `tests/node/`.

- **Unit — `tests/lib/pwa/install-platform.test.ts` (pure, no jsdom needed):**
  - Native shell input returns `unsupported` even when the user agent says Android and standalone is true (precedence).
  - Standalone input returns `installed`.
  - iOS Safari user agent returns `ios`.
  - Android Chrome user agent returns `android`.
  - Desktop Chrome user agent returns `desktop`.
  - `isDismissalActive` boundaries: `null`, just inside 30 days, exactly at 30 days, past 30 days.
- **Unit — `tests/hooks/use-pwa-install.test.ts` (`renderHook`):**
  - `beforeinstallprompt` is captured, `preventDefault` is called, `canInstall` becomes true.
  - `promptInstall` calls the deferred event's `prompt()` and returns the outcome.
  - `promptInstall` returns `unavailable` when no event was captured.
  - `appinstalled` sets `canInstall` false permanently, ignoring the cooldown.
  - `dismiss` writes the timestamp; a remount within 30 days keeps `isDismissed` true.
  - Corrupt `localStorage` value yields `isDismissed === false` and does not throw.
  - Listeners are removed on unmount.
- **Component — `tests/components/pwa/register-service-worker.test.tsx`:**
  - Registers exactly once in production.
  - Does not register in development.
  - Does not throw when `navigator.serviceWorker` is absent.
  - Renders nothing.
- **Component — `tests/components/pwa/install-prompt.test.tsx`:** mock `usePwaInstall` and assert render/no-render across `android`, `ios`, `installed`, `unsupported`, and dismissed states; assert the accept action calls `promptInstall` and the dismiss action calls `dismiss`.
- **Component — `tests/components/pwa/ios-install-sheet.test.tsx`:** instructions content and dismiss callback.
- **Manual verification:** Chrome DevTools -> Application -> Manifest reports no errors; Lighthouse reports the application as installable; the Capacitor Android build shows no prompt.

## 6. Review Remediation

A post-implementation review found 5 defects; all were fixed against the shipped design with two behavior changes:

1.  **Early capture (D1).** The original design attached `beforeinstallprompt` only inside a `useEffect`. The browser can fire that event before hydration completes, especially on repeat visits with an active service worker, permanently losing it. Fixed with the standard pattern: an inline, dependency-free `beforeInteractive` script in `app/layout.tsx` `<head>` stashes the event on a well-known `window` key (`lib/pwa/install-event-store.ts`, no React), and `usePwaInstall` reads that stash on mount in addition to subscribing live. Layering stays one-way: `install-event-store.ts` sits in `lib/pwa/` and is imported by both the layout and the hook, never by a component.
2.  **Non-modal a11y (D2).** `role="dialog"` + `aria-modal="true"` was removed from both the action prompt and the iOS sheet because neither traps focus nor inerts the page. Replaced with `role="region"` + `aria-label`, consistent with how the rest of the repo labels non-modal surfaces (there is no existing non-modal bottom-sheet role in the codebase; `region` is the standard ARIA role for a labeled non-modal landmark).
3.  **iOS engagement gate (D3).** The iOS sheet rendered unconditionally on first paint. `usePwaInstall` now tracks a `localStorage` visit counter and exposes `isIosPromptEligible` (true starting on the visitor's second page load); `InstallPrompt` reads that flag and stays presentational — the gate logic lives entirely in the hook.
4.  **Language (D4).** A stray Spanish code comment in `hooks/use-pwa-install.ts` was translated to English (project rule: code/comments in English, UI copy in Spanish).
5.  **Redundant abstraction (D5).** A single static class string wrapped in `cn(...)` in `ios-install-sheet.tsx` was simplified to a plain string literal; the now-unused `cn` import was removed.

The iOS sheet copy was also corrected from "en Safari" to browser-agnostic wording, since every iOS browser is WebKit-based and presents the same Share sheet.

## 7. Migration

- No database migration. No schema change. No API change.
- **Service worker activation is the only one-way step.** Once `/sw.js` is registered in production, returning visitors keep an active service worker even after a rollback of the registration component. If the service worker must be retired, ship a `sw.js` that calls `self.registration.unregister()` and clears its caches; simply removing the registration is not sufficient for existing clients.
- Deployment is frontend-only. Icons and screenshots are already committed, so no asset pipeline step is required at deploy time.

## 8. Descoped: Offline Caching Strategy

**Deliberately out of scope for this change.** `public/sw.js` now does exactly one thing: it satisfies Chrome's installability precondition (an active service worker with a `fetch` handler). It does NOT implement:

- An offline fallback route or page (`/offline` does not exist in the app router; the previous file referenced it and `cache.addAll()` failed unconditionally as a result).
- A precache manifest for the app shell.
- Any caching of `/api/*` responses or navigation (page) responses.
- Per-user cache partitioning or any cache invalidation on logout.
- Background sync, push notifications, or the `message`/`CACHE_URLS` control-plane the previous file exposed.

**Why this was cut, not fixed-in-place:** a four-review pass on the original 381-line file found that shipping ANY caching of authenticated responses without per-user partitioning and a logout-time purge is a same-device, cross-user data leak on a personal-finance app — the previous file wrote every `/api/*` and every server-rendered navigation response into a single shared, origin-scoped `DYNAMIC_CACHE` keyed only by URL, with nothing in the codebase (`app/`, `components/`, `lib/`, `hooks/`, `contexts/`, `providers/`) ever clearing it. Designing that safely — per-user cache namespacing keyed off the authenticated session, an explicit purge on logout, an offline route that actually exists, a real precache manifest, and a cache-versioning story that does not silently accumulate old bundle caches forever — is a distinct, non-trivial change with its own risk surface. Bundling it into an "add install prompt" change would have hidden that risk behind an unrelated PR title.

**Follow-up work needed (tracked, not started):**

1.  Design a per-user (or per-session) cache namespace for any future API/data caching, keyed so that logging out one user cannot serve cached data to the next user of the same device.
2.  Add a logout hook that purges every PWA-owned Cache Storage bucket.
3.  Build an actual `/offline` route before referencing it from a service worker precache list or fallback handler.
4.  Decide a real cache-versioning scheme (the current `CACHE_NAME` constant is a single string that must be bumped by hand; a build-time content hash would remove that manual step).
5.  Only after 1–4 are designed: extend `public/sw.js`'s `fetch` handler to add a genuine offline strategy for the app shell, evaluated against the same security bar (never cache authenticated responses without the above).

## 9. Review Remediation 2 (four independent reviews, post-Phase-6)

A second review pass (four independent reviewers) found additional defects across the service worker, the module layering, and confirmed runtime bugs. All were fixed; the ones that changed observable behavior were fixed test-first.

**Service worker:** replaced outright (see section 1 above and section 8). New file also exposes its pure fetch-routing decision (`isCacheableStaticAssetRequest`) so it can be exercised by `tests/lib/pwa/service-worker-policy.test.ts` via a sandboxed `vm` context loading the exact production file — no bundler, no duplicated policy copy that could drift from what actually ships.

**Layering:**

- `components/pwa/register-service-worker.tsx` no longer imports `@capacitor/core` or touches `navigator` directly; the policy moved to `lib/pwa/service-worker.ts` (`registerServiceWorker()`), and the native-shell check now goes through the single `lib/pwa/environment.ts#isNativeShell()` also used by the hook.
- `lib/pwa/environment.ts` is the new single owner of global reads for `lib/pwa/` (`readInstallEnvironment()`), so `install-platform.ts` stays pure and testable with no globals.
- `resolveInstallPlatform` keeps its exact original signature and return type (existing tests were not touched); a new pure `resolvePromptKind(platform)` maps a resolved platform to `'native' | 'instructions' | 'none'`, and `usePwaInstall` exposes `promptKind` derived from it. `install-prompt.tsx` now switches on `promptKind`, not on the platform identity string.
- `lib/pwa/install-dismissal.ts` is the new single owner of the dismissal policy (storage key, `readDismissal`, `recordDismissal`, `isDismissalActive`) — previously split between the hook and `install-platform.ts`.
- `components/pwa/install-surface.tsx` is the new shared chrome wrapper for the action prompt and the iOS sheet (see section 1 above).
- `lib/pwa/install-event-store.ts`'s `readStashedInstallEvent` is now module-private; it had no external consumer beyond `consumeStashedInstallEvent`.

**Confirmed bugs fixed:**

- **Bottom-nav overlap.** `InstallSurface` moved off `z-[70]` (which sat above `components/ui/modal.tsx`'s `z-[70]` and `components/layout/header.tsx`'s sheet at `z-[60]`) down to `z-[55]`, strictly below both, and offset above the fixed mobile bottom nav (`components/layout/mobile-nav.tsx`, `z-[45]`, `lg:hidden`) with `bottom-[5.5rem]` on the same breakpoint range where the nav is visible, switching to `lg:bottom-6` where the nav is hidden.
- **Dead button on `prompt()` rejection.** `promptInstall` now wraps both awaited calls in `try`/`catch`/`finally`; any rejection (for example the browser's real `InvalidStateError` on a second `prompt()` call) resolves `'unavailable'`, and the deferred event, the early-capture stash, and `canInstall` are always cleared in `finally`.
- **Stale stash resurrection.** `promptInstall`'s `finally` block now also clears the early-capture window stash (`consumeStashedInstallEvent()`), so a remount can no longer resurrect an already-consumed event — this was the actual trigger for the `prompt()`-rejection bug above.
- **Visit counter over-counting under StrictMode.** `recordVisit()` is now guarded by a per-mount `useRef`, so React StrictMode's dev-only double effect invocation (mount → cleanup → mount, same component instance) increments the counter once, not twice. A genuinely new mount (a real page load) still gets its own ref and increments normally.
- **iPadOS 13+ detection.** iPadOS reports a desktop `Macintosh` user agent since iPadOS 13. `InstallEnvironment` gained `maxTouchPoints`; `resolveInstallPlatform` now also resolves `ios` when `maxTouchPoints > 1` and the user agent matches `Macintosh` (a real Mac reports 0 or 1 touch points).
- **Accessibility.** The dismiss `X` button's touch target grew from ~24×24px (`p-1` around an `h-4 w-4` icon) to 44×44px (`h-11 w-11`); `InstallSurface` adds an `Escape` handler that calls the surface's `onDismiss`; the close icon's color token was raised from `text-muted-foreground/70` to the full-opacity `text-muted-foreground` token to clear the 4.5:1 contrast bar against `bg-card/95`.

**Test hygiene:** removed the tautological "renders nothing" assertion on `RegisterServiceWorker` (its signature is already `(): null`) and strengthened the hook's unmount test to compare full `addEventListener`/`removeEventListener` call args (type AND handler reference), not just event type strings, so a wrong-handler unsubscribe bug would actually be caught. The iOS engagement-gate test no longer relies on "two mounts equals two visits" (which the StrictMode bug above would have kept green); it now sets the persisted visit count directly and mounts once.

## 10. Follow-up: Persistent Settings Entry Point

Implemented as a small, separable follow-up (see proposal.md "Follow-up Work" item 2).

- **`PromptKind` gained a fourth member, `'installed'`.** Previously `resolvePromptKind` collapsed both `installed` and `unsupported` platforms onto `'none'`, which was correct for the interruptive banner (neither case should ever show a banner) but wrong for a persistent settings entry: "la app ya está instalada" and "no disponible en este navegador" are different messages, and inside the Capacitor native shell the entry must not appear at all. `resolvePromptKind` now maps `platform === 'installed'` to `promptKind === 'installed'`; `unsupported` still maps to `'none'`. `install-prompt.tsx` (the interruptive banner) was verified, not assumed, to still render `null` for `'installed'` — it only matches `'instructions'` and `'native'`, so the new kind simply falls through to its existing `return null`.
- **New component `components/pwa/install-app-setting.tsx`.** Presentational; consumes `usePwaInstall()` only, same layering rule as every other `components/pwa/*` file. It deliberately IGNORES `isDismissed` and does NOT gate on `isIosPromptEligible` — those two flags exist to stop the interruptive banner from nagging, and this is a manually-navigated-to settings entry, the opposite situation. This is the entire point of the follow-up: the early-capture script's `preventDefault()` on `beforeinstallprompt` suppresses Chrome's own native install affordance, so once a user dismisses the banner once, this settings entry is the ONLY way back in for the following 30 days.
- Reuses `IosInstallSheet` rather than duplicating its instructions; the open/closed state is local `useState`, not wired to `dismiss()`.
- Reuses the existing `sonner` `toast` (already used elsewhere in `app/settings/settings-page-client.tsx`) to surface the `PromptInstallOutcome` from `promptInstall()`.
- Wired into `app/settings/settings-page-client.tsx`'s existing "Aplicación" card, replacing its "Próximamente disponible" placeholder body. The card keeps a small always-present description line above `<InstallAppSetting />` so the card is never an empty shell when the component renders `null` (Capacitor native shell, or an unsupported browser) — the settings page still knows nothing about `promptKind` or any other PWA internal beyond importing the one component.

  > **Superseded by section 11 (N3).** "Renders `null`" above was itself found to leave the card's always-present description line as an orphan sentence with nothing under it. Section 11 replaces the `promptKind === 'none'` branch with a non-empty explanatory row instead of `null`, without changing the "settings page knows nothing about `promptKind`" invariant.

## 11. Review Remediation 3 (strict 4R review + real-browser harness: 1 blocker, 7 majors, 11 nits)

A third review pass — 4R (Requirements/Runtime/Regression/Risk) plus a real-browser (Chromium) harness against the compiled production build — found one blocker (C1), seven majors (M1–M7), and eleven nits (N1–N11). All are fixed here; C1, M2, M3, and M4 changed observable behavior and were fixed test-first (RED confirmed against the pre-fix code, then GREEN).

### C1 (blocker): one shared store for the deferred install event

`consumeStashedInstallEvent()` read-and-cleared a single `window` key, but every `usePwaInstall()` instance kept its OWN private `deferredEventRef`. `<InstallPrompt/>` mounts on every route (root layout); `<InstallAppSetting/>` mounts on `/settings`. `beforeinstallprompt` fires at most once per document load; whichever hook instance's effect ran first "won" the event, and the other consumer saw `null` forever — proven four times independently, including against the compiled production build in real Chromium. Worst case: after dismissing the banner, there was NO working install affordance anywhere for 30 days, even though the deferred event was still alive (just trapped inside the wrong consumer's ref) and Chrome's own native mini-infobar had already been suppressed by the capture script's `preventDefault()`.

**Fix:** `lib/pwa/install-event-store.ts` was rewritten from a read-and-clear window stash into a real module-level store with subscribers — see the spec's "Early `beforeinstallprompt` Capture and the Shared Install Event Store" section for the exact contract. `hooks/use-pwa-install.ts` now reads it via `useSyncExternalStore` (matching the existing idiom in `hooks/use-media-query.ts`), with an SSR-safe `getServerSnapshot`. `consumeStashedInstallEvent` (the read-and-clear function) no longer exists; every caller and test was updated to the new `getDeferredInstallEvent` / `subscribe` / `clearDeferredInstallEvent` API. The `deferredEventRef` per-hook-instance ref was removed entirely. Proven with `tests/lib/pwa/install-event-store.test.ts` (the store's own contract) and `tests/components/pwa/install-shared-store-integration.test.tsx` (a NEW integration test that renders `<InstallPrompt/>` and `<InstallAppSetting/>` together with the REAL hook — no `jest.mock` of the hook — and asserts both see `canInstall` become `true` together, and that the visit counter increments exactly once with two consumers mounted; this is exactly the test that was missing before, which is how C1 shipped green).

Visit counting (previously a per-instance `useRef` guard) was ALSO moved to module scope (`lib/pwa/install-engagement.ts`'s `recordVisitOncePerLoad()`), because the same two-consumer shape double-counted a visit (measured: 2 for one page load with two consumers), opening the iOS engagement gate one visit early for anyone landing on `/settings`.

### M1: unbounded service worker cache in the same storage bucket as the financial ledger

`public/sw.js`'s `CACHE_NAME` was a fixed literal, so `activate`'s "delete non-matching caches" step never deleted anything after the first deploy; the `fetch` handler cache-first'd every `/_next/static/` URL with no cap. Next emits unique paths per build (112 files / ~4.5MB measured for one build), so every visited deploy only ever ADDED entries. `navigator.storage.persist()` was called nowhere in the repo, so the origin bucket was best-effort and evictable AS A UNIT by the browser — and `repositories/local/db.ts` keeps the Dexie `FinanceDB` (transactions, accounts, budgets, goals) in that same bucket.

**Fix, both parts:** `MAX_CACHE_ENTRIES = 200` (see the inline comment in `public/sw.js` for the sizing rationale) with oldest-first eviction on write (`evictOldestEntriesOverCap`, exercised via the same sandboxed-`vm` approach as the existing routing-policy test). `lib/pwa/service-worker.ts#registerServiceWorker()` now calls `navigator.storage.persist()` after registration, guarded for absence and never throwing.

### M2 + M3: z-index and safe-area bugs, both confirmed in real Chromium against compiled CSS

`install-surface.tsx` shipped at `z-[55]` with a fixed `bottom-[5.5rem]` offset. Measured against the compiled production CSS at 390px: the banner overlapped `mobile-menu-fab.tsx`'s FAB (`z-50`) AND its open drawer (`z-50`); between `sm` and `lg` the FAB was avoided but the drawer was still covered. The justifying comment reasoned about `mobile-nav` (`z-[45]`) and the modal layer (`z-[59]`–`z-[70]`) and never looked at the FAB's `z-50` stratum at all. Separately, `mobile-nav.tsx` sizes itself with `max(0.75rem, env(safe-area-inset-bottom))`; the surface's fixed 88px offset only clears a zero-inset device, not a notched iPhone (~95px bar height), and `resolveInstallPlatform` routes every iPhone to the instructions sheet — exactly the affected devices.

**Fix:** `z-[55]` → `z-[48]`, strictly below the FAB/drawer's `z-50` and still above `mobile-nav`'s `z-[45]`. `bottom-[5.5rem]` → `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`, consistent with how `mobile-nav.tsx` computes its own height. Both confirmed to compile correctly in this Tailwind setup (arbitrary-value `calc()` with a CSS env() function is passed through verbatim). `install-surface.tsx`'s docblock was corrected to name every layer actually reasoned about (mobile-nav, the FAB, the FAB's drawer, and the modal/header sheet layer) — see N1.

### M4: `Escape` on a non-modal surface silently burned the 30-day cooldown

`install-surface.tsx` registered a `keydown`/`Escape` listener on `document`; `components/ui/modal.tsx` registers another, independently. Both are global. In the banner, `Escape` mapped straight to `dismiss()` → `recordDismissal()`. Closing ANY modal in the app with the keyboard silently burned the install banner's 30-day cooldown — the direct amplifier of C1: an accidental keypress produced a dead end with no other install path.

**Fix:** the hook's API gained a genuinely separate action, `hideForSession()` (transient, in-memory `isHiddenThisSession`, never persisted) alongside the existing `dismiss()` (persisted). `install-surface.tsx`'s dismiss prop was renamed `onEscape` and is wired ONLY to the `Escape` keydown handler; it is never called by any explicit button inside a surface's children. `install-prompt.tsx` now passes `hideForSession` as `onEscape` and keeps `dismiss` only on its explicit "Ahora no" / close-`X` buttons. `ios-install-sheet.tsx` gained an optional `onEscape` prop (defaulting to `onDismiss` for callers whose `onDismiss` is already a non-persisted local toggle, e.g. `install-app-setting.tsx`'s locally-managed sheet). Proven with a test asserting `Escape` does not write to `localStorage`.

### M5: covered by the C1 integration test, not duplicated

Both component suites previously `jest.mock('@/hooks/use-pwa-install')`, so all 16 of those tests would stay green with the feature completely broken in the browser. `tests/components/pwa/install-shared-store-integration.test.tsx` (added for C1 point 5) is the fix; no separate M5 test was added on top of it.

### M6: `isNativeShell()` had two implementations, not one

`lib/pwa/environment.ts` claimed to be the single source of truth for Capacitor native-shell detection, but `lib/auth/capacitor-oauth.ts` imported `@capacitor/core` directly and called `Capacitor.isNativePlatform()` itself. **Decision:** lifted `isNativeShell()` into a new, neutral module, `lib/platform/native-shell.ts` — outside `lib/pwa/` (so `lib/auth` does not have to depend on a PWA-specific module for a platform concern) and outside `lib/auth` (so `lib/pwa` does not depend on auth internals either). `lib/pwa/environment.ts` re-exports it so every existing `lib/pwa/` import site is unchanged; `lib/auth/capacitor-oauth.ts` now imports it directly. The claim in `environment.ts`'s docblock is now true and says so.

### M7: three sites where the layered architecture was left half-finished

- **7a.** `install-app-setting.tsx` wrote the same `className="flex items-center justify-between rounded-2xl bg-muted/20 p-4"` row markup, icon wrapper, and title/description structure three times. Extracted `components/pwa/setting-row.tsx` (`SettingRow({ icon, title, description, action })`); all three branches (installed, iOS instructions, native, and the new N3 "not supported" branch) now build from it.
- **7b.** The iOS engagement policy (storage key, threshold, `readVisitCount`, `recordVisit`, the eligibility predicate) lived inside the hook, next to `install-dismissal.ts`'s near-identical policy, whose own header already argued policy needs "a single owner." Extracted `lib/pwa/install-engagement.ts` (storage key, `IOS_ENGAGEMENT_VISIT_THRESHOLD`, `readVisitCount`, `recordVisitOncePerLoad`, `isIosPromptEligible`) mirroring `install-dismissal.ts`'s shape. Both modules' near-identical `try/catch` + `Number.isFinite` numeric-read helper was factored out into `lib/pwa/persisted-number.ts` (`readPersistedNumber` / `writePersistedNumber`), used by both.
- **7c.** "Accede más rápido desde tu pantalla de inicio" was duplicated literally between `install-prompt.tsx` and `install-app-setting.tsx`. Extracted `components/pwa/copy.ts`; both files now import the shared constant. Distinct strings that only LOOKED similar (the banner's "Instala FinTec" title vs. the settings entry's "Instalar app" title) were deliberately kept separate, not force-merged.

### Nits (N1–N11)

- **N1.** `install-surface.tsx`'s docblock claimed "restyling either surface only requires touching this file," which the design always contradicted (per-surface deltas live in `install-prompt.tsx` and `ios-install-sheet.tsx`). Corrected to say restyling the SHARED chrome is a one-file change here; each surface's own layout stays in its own file.
- **N2.** Comment duplication consolidated: the platform-rationale comment that used to be repeated a third time in `install-prompt.tsx` was removed outright when that file was rewritten for M4/N6 (the two remaining copies in `install-platform.ts` cover genuinely different content — a module header vs. a specific type's docblock — and were left as-is). The service-worker registration swallow-rationale, previously stated once in the function docblock and once in the `catch` block, now lives only in the `catch` block. The hook's old duplicated remount-rationale comment was removed along with the `useRef`-based visit-count guard it was attached to (superseded by the module-scope guard in `install-engagement.ts`, which carries its own single rationale comment).
- **N3.** `InstallAppSetting` rendering `null` for `promptKind === 'none'` left the settings card's always-present description line as an orphan sentence on browsers with no install path (e.g. desktop Firefox/Safari) — worse than the "Próximamente disponible" placeholder it replaced. Fixed by having `InstallAppSetting` render a non-empty, non-interactive "not supported" `SettingRow` for that case instead of `null`; the settings page's "don't know about `promptKind`" invariant is preserved because the fallback lives inside the component, not the page. See spec.md's "Persistent Settings Entry Point" section (updated) and Scenario 17 (updated).
- **N4.** `ios-install-sheet.tsx` said "Agregar a Inicio"; the real iOS Spanish label is "Añadir a pantalla de inicio". Corrected, and the Share label ("Compartir") was checked against the real OS label and found already correct.
- **N5.** The inline capture `<script>` has no `nonce`, which will matter the day a Content-Security-Policy is added (there is none today — verified, repo-wide grep for `Content-Security-Policy` and `script-src` found no CSP configuration anywhere). Per instruction, NO CSP is added in this change. This is recorded here as an explicit, known follow-up obligation: **whoever adds a CSP to this application MUST either add a `nonce` to `app/layout.tsx`'s inline capture script (threaded through from a per-request nonce, e.g. via middleware) and reference it in `script-src`, OR migrate the capture script's logic to an external, hashed, or otherwise CSP-compliant delivery mechanism.** Shipping a CSP without handling this inline script will silently break early `beforeinstallprompt` capture (see C1 above for why that path exists at all) the moment `'unsafe-inline'` is removed from `script-src`.
- **N6.** The install banner rendered on unauthenticated routes (verified: `/auth/login` showed it under the login form). Decision: an install pitch must not interrupt the auth flow. Implemented by mirroring the existing bypass idiom in `app/route-aware-providers.tsx#shouldBypassAppProviders` (a `pathname === X || pathname.startsWith(X + '/')` check) directly inside `install-prompt.tsx`, rather than routing the banner's visibility through the providers tree (the banner is mounted as a sibling of `RouteAwareProviders` in `app/layout.tsx`, not inside it).
- **N7.** `sw.js`'s `cache.put()` call was neither awaited nor wrapped in error handling; `put()` rejects on a redirected response, producing a benign unhandled rejection inside the worker. Now awaited inside the same `try`/`catch` that also runs the M1 eviction step.
- **N8.** The banner used raw Tailwind sizes (`text-sm`/`text-xs`); the settings entry used the repo's `text-ios-*` scale. Unified on the `text-ios-*` scale everywhere in `components/pwa/*`: the banner now uses `text-ios-caption`/`text-ios-footnote` (matching its previous 14px/12px sizing almost exactly), and `ios-install-sheet.tsx` was moved from `text-base`/`text-sm` to `text-ios-body`/`text-ios-caption`.
- **N9.** `lib/pwa/environment.ts#readInstallEnvironment()` touched `window`/`navigator` with no `typeof window === 'undefined'` guard, unlike the rest of `lib/pwa/`. Added, returning a safe all-`false`/empty `InstallEnvironment` during SSR.
- **N10.** Low-value tests cut or reshaped: `service-worker-policy.test.ts`'s tautological "is exposed as a pure function" test removed (6 of 7 routing tests remain, plus 3 new M1 cache-eviction tests). `register-service-worker.test.tsx` deleted outright (it asserted a mock through a three-line wrapper). `install-surface.test.tsx`'s "does not throw when Escape is pressed and no onDismiss was provided" test removed (the effect early-returns before registering a listener, so it could never fail); two new tests (z-index bound, safe-area offset) added in its place. `install-prompt.test.tsx`'s four near-identical "renders nothing when X" cases collapsed into one `it.each`.
- **N11.** `use-pwa-install.test.tsx`'s `'does not render the iOS sheet…'` test (a hook test that renders no sheet) renamed to `'does not render the iOS sheet before the engagement threshold (isIosPromptEligible gate)'`, describing what it actually protects.

### Verification (Review Remediation 3)

- `npx jest tests/lib/pwa tests/lib/platform tests/hooks/use-pwa-install.test.tsx tests/components/pwa` — 15 suites, 107 tests, all green.
- `npx jest` (full suite) — only the pre-existing, unrelated `tests/node/api/binance-p2p-offers-route.test.ts` failure remains (documented since Phase 6, untouched by this change).
- `npm run type-check` — clean.
- `npx oxlint app components hooks lib tests scripts` (without `--quiet`) — zero findings in any PWA file, `app/settings/`, or `lib/auth/` (300 pre-existing warnings remain elsewhere, unrelated).
- `npm run build` — succeeds.
- `npx prettier --check` — clean on every touched file (after one `--write` pass to normalize newly-added test/source files).
