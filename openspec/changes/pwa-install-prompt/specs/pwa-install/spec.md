# PWA Install Specification

## Overview

This specification defines the installability requirements for the FinTec web application: manifest and icon emission, service worker registration, install platform resolution, and the custom install prompt lifecycle across Android, iOS, desktop, already-installed, and Capacitor native contexts.

## ADDED Requirements

### Manifest and Icon Emission

- The root layout MUST declare `metadata.manifest` so the rendered document head contains `<link rel="manifest" href="/manifest.json">`.
- The root layout MUST declare `metadata.icons`, including an `apple-touch-icon` entry, so iOS uses a real home-screen icon instead of a page screenshot.
- `public/manifest.json` MUST declare `any` and `maskable` icons as SEPARATE entries. A single entry with `"purpose": "maskable any"` MUST NOT be used, because one asset cannot serve both roles well.
- `public/manifest.json` `background_color` MUST match the actual logo background (`#010101`).
- The manifest `theme_color` and the theme color declared in `app/layout.tsx` MUST be identical. The current conflict (`#0ea5e9` in the manifest, `#000000` in the layout) MUST be reconciled to a single value.
- Every icon and screenshot path referenced by the manifest MUST resolve to a file present in `public/`.

### Service Worker Registration

- The application MUST register `/sw.js` from a Client Component mounted in the root layout.
- Registration MUST occur ONLY when `process.env.NODE_ENV === 'production'`.
- Registration MUST occur ONLY when `navigator.serviceWorker` is available.
- Registration MUST NOT occur inside the Capacitor native shell (`lib/pwa/environment.ts#isNativeShell()`).
- A registration failure MUST NOT throw into the React tree and MUST NOT block rendering.
- The registration component MUST NOT render any visible UI.
- The registration policy MUST live in `lib/pwa/service-worker.ts` (`registerServiceWorker(): Promise<void>`), unit-testable without React; the component MUST be a thin mount point over it.

### Service Worker Scope (`public/sw.js`)

- `public/sw.js` MUST exist ONLY to satisfy the browser's installability precondition (an active service worker registration with a `fetch` handler). It MUST NOT implement an offline caching strategy, a precache manifest, an offline fallback route, or per-user cache partitioning — that is separate, not-yet-started follow-up work (see proposal.md, "Follow-up Work").
- `install` MUST call `self.skipWaiting()` as its first statement, unconditionally, before any async work. It MUST NOT be chained behind a `.then()` of an operation that can reject, because a rejected chain would prevent `skipWaiting()` from ever running and would permanently park a corrected worker in `waiting` behind a broken one for every already-open client.
- `activate` MUST call `self.clients.claim()` and MUST delete every cache whose name does not match the worker's current cache-name constant.
- `fetch` MUST NOT call `respondWith` (i.e. MUST let the request pass through untouched) for: any non-GET request, any cross-origin request, any request whose path starts with `/api/`, and any request whose `mode` is `'navigate'`.
- `fetch` MUST NOT cache or serve from cache any request matched by the guards above. Authenticated, per-user, or server-rendered responses MUST NEVER be written to Cache Storage by this worker.
- `fetch` MAY serve, cache-first, only same-origin GET requests whose path starts with `/_next/static/` (immutable, content-hashed build assets).
- When a cache-first network fetch resolves with a non-`ok` response, the worker MUST NOT cache it and MUST NOT return it as if it were a valid cached asset; it MUST fall through to the real network response.
- `event.respondWith` MUST NEVER be called with a value that can resolve to `undefined`.
- Every cache write (`cache.put()`) MUST be awaited and wrapped in error handling. `cache.put()` rejects when the response is the result of a redirect; an un-awaited, uncaught call surfaces as a benign-but-unhandled promise rejection inside the worker. A failed write MUST NOT be fatal — the asset is simply not cached this time and is fetched from the network again on the next request.

### Install Platform Resolution

- The platform resolver MUST live in `lib/pwa/install-platform.ts` and MUST be composed of pure functions: no React, no direct global reads, and no DOM side effects.
- The resolver MUST accept its inputs (user agent string, standalone display state, native-shell flag, `maxTouchPoints`) as explicit arguments so it is unit-testable without a browser.
- All global reads that feed the resolver (userAgent, display-mode, native-shell flag, `maxTouchPoints`) MUST be centralised in `lib/pwa/environment.ts` (`readInstallEnvironment()`, `isNativeShell()`) — no other `lib/pwa/` module MAY read these globals directly.
- The resolver MUST return exactly one of: `android`, `ios`, `desktop`, `installed`, `unsupported`.
- The resolver MUST return `installed` when the display mode is `standalone` OR `navigator.standalone` is true.
- The resolver MUST return `unsupported` when running inside the Capacitor native shell, and this check MUST take precedence over every other branch.
- The resolver MUST return `ios` for iPadOS 13+, which reports a desktop `Macintosh` user agent: when the user agent matches `Macintosh` AND `maxTouchPoints > 1`, the platform MUST resolve to `ios`, not `desktop` or `unsupported`.
- A pure `resolvePromptKind(platform): 'native' | 'instructions' | 'installed' | 'none'` function MUST derive the install-affordance kind from the resolved platform. Presentational components MUST switch on this derived kind, never on the platform identity string. `resolvePromptKind` MUST map `installed` to `'installed'` (not `'none'`), so a persistent entry point can distinguish "already installed" from "no install path here"; `unsupported` MUST map to `'none'`.
- Adding or changing a platform rule MUST require modifying only `lib/pwa/install-platform.ts` (and, if a new global input is needed, `lib/pwa/environment.ts`).

### Early `beforeinstallprompt` Capture and the Shared Install Event Store

- The root layout MUST emit an inline, dependency-free capture script in `<head>` using a raw `<script>` tag, so it runs and is parsed before React hydration.
- The capture script MUST call `preventDefault()` on the FIRST `beforeinstallprompt` event and stash it on a well-known `window` key, because the browser MAY fire this event before hydration completes, especially on repeat visits where the service worker is already active. A listener registered only inside a React effect MUST NOT be relied upon as the sole capture path.
- The capture script MUST also record `appinstalled` on a well-known `window` key.
- `lib/pwa/install-event-store.ts` MUST be the single, module-level owner of the deferred `beforeinstallprompt` event and the "app installed" flag for the ENTIRE page, not per component instance. `beforeinstallprompt` fires at most once per document load, and multiple `usePwaInstall()` consumers can be mounted simultaneously (the interruptive banner in the root layout and the persistent settings entry point on `/settings`); every consumer MUST observe the exact same event and the exact same derived `canInstall` state. A per-hook-instance ref or state variable MUST NOT be used to hold this event, because whichever instance's effect runs first would then permanently own it and every other instance would see `null` forever (this was a confirmed, reproduced defect).
- On first access from any consumer, the store MUST adopt whatever the inline capture script stashed on the `window` key, then clear that `window` key so the store becomes the event's sole remaining owner.
- The store MUST expose `subscribe(listener)` plus `getSnapshot`-shaped accessors (a `useSyncExternalStore`-compatible read function and a separate SSR-safe server-snapshot function), and MUST notify every subscriber together whenever the deferred event or the installed flag changes.
- The store's clear function MUST be called by the hook once `promptInstall()` reaches a terminal outcome (accepted, dismissed, or a rejected `prompt()` call), and MUST notify every subscriber so every consumer's `canInstall` flips to `false` together.
- The `appinstalled` path MUST also go through the store: it clears the deferred event, sets the installed flag, and notifies every subscriber.
- `lib/pwa/install-event-store.ts` MUST contain no React import and MUST be usable both as an ES module (imported by the hook) and as the source for the inline script (imported by the layout).
- `hooks/use-pwa-install.ts` MUST read the store via `useSyncExternalStore`, with an SSR-safe `getServerSnapshot` argument so no `window` access happens during server rendering.

### Install Hook

- The hook MUST live in `hooks/use-pwa-install.ts` and MUST be re-exported from `hooks/index.ts`, following the repository barrel convention.
- The hook MUST expose `{ platform, promptKind, canInstall, promptInstall, dismiss, isDismissed, hideForSession, isHiddenThisSession, isIosPromptEligible }`.
- The hook MUST derive `canInstall` from the shared store (see "Early `beforeinstallprompt` Capture and the Shared Install Event Store" above): `canInstall` is true exactly when the store holds a deferred event AND the app is not already installed.
- `promptInstall` MUST invoke the retained deferred event's `prompt()` method and MUST resolve with the user choice outcome.
- `promptInstall` MUST wrap both the `prompt()` call and the awaited `userChoice` in error handling: if either rejects (for example the browser's `InvalidStateError` when `prompt()` is called a second time on an already-consumed event), `promptInstall` MUST resolve `'unavailable'` rather than letting the rejection propagate, and MUST NOT leave a dead, still-clickable install button behind.
- `promptInstall` MUST, in all outcomes (success, rejection, or no deferred event), clear the shared store's deferred event so every mounted consumer's `canInstall` becomes `false` together.
- `dismiss` MUST persist the dismissal timestamp so the decision survives a page reload, and MUST start the 30-day cooldown (see "Dismissal Cooldown" below).
- `hideForSession` MUST set a transient, in-memory-only flag (`isHiddenThisSession`) and MUST NOT write to `localStorage` and MUST NOT start or affect the dismissal cooldown in any way. A remount (a real new page load) MUST always start `isHiddenThisSession` at `false` again. This is a DISTINCT action from `dismiss` — see "Transient Session Hide vs. Persisted Dismissal" below for why both must exist.
- The hook MUST remove its own registered listeners on unmount; module-level listeners owned by the shared store (see above) are NOT tied to any single hook instance's lifecycle and MUST NOT be removed when one consumer unmounts while the store may still be needed by others.
- The hook MUST gate iOS instructions eligibility behind a simple engagement threshold: `isIosPromptEligible` MUST be false on the visitor's first page load and MUST become true starting on the second page load, tracked via a `localStorage` visit counter (`lib/pwa/install-engagement.ts`). This prevents showing install instructions to a first-time visitor who has not yet decided the app is useful.
- The visit counter MUST increment AT MOST ONCE per real document load, regardless of how many `usePwaInstall()` instances are mounted on that load (the banner and the settings entry point can both be mounted at once). This MUST be enforced with a module-scope guard in `lib/pwa/install-engagement.ts`, not a per-instance `useRef`: a `useRef`-based guard only prevents React Strict Mode's double-invoked mount effect from double-counting within ONE component instance, but does nothing to prevent a SECOND, independently-mounted instance from recording its own separate visit for the same page load (a confirmed, reproduced defect: two consumers mounted on one page load produced a visit count of 2, opening the iOS engagement gate one visit early). The module-scope guard also continues to satisfy the Strict Mode double-invocation case, since it resets naturally on a real new document load (a fresh module evaluation).

### Transient Session Hide vs. Persisted Dismissal

- The hook MUST expose two DISTINCT dismissal-shaped actions with different persistence semantics: `dismiss()` (persisted, starts the 30-day cooldown) and `hideForSession()` (transient, session-only, never persisted).
- `Escape`, when pressed while an install surface is mounted, MUST call `hideForSession()`, NEVER `dismiss()`. `Escape` is a global `document`-level keyboard shortcut also used by unrelated, independently-mounted UI (e.g. `components/ui/modal.tsx`'s own `Escape` handler for closing an open modal); an install surface mounted in the background at the same time MUST NOT interpret an `Escape` meant for that other UI as a deliberate rejection of the install offer. Only an EXPLICIT close control (a visible, clicked "Ahora no" / "X" / "Entendido" button) MAY call `dismiss()` and start the cooldown.
- `components/pwa/install-surface.tsx`'s `onEscape` prop MUST be wired exclusively to the `Escape` keydown handler, and MUST NOT be invoked by any explicit button inside the surface's children — those buttons call their own persisted action directly.

### Install Prompt Presentation

- `components/pwa/install-prompt.tsx` MUST be purely presentational: it consumes the hook and MUST NOT register or read browser events directly, and MUST NOT compute the engagement gate itself — it only reads `isIosPromptEligible` from the hook.
- `components/pwa/install-prompt.tsx` MUST switch on the hook's `promptKind` (`'native' | 'instructions' | 'none'`), NEVER on the `platform` identity string, so that adding a new platform only requires editing `lib/pwa/install-platform.ts`.
- `components/pwa/install-prompt.tsx` MUST NOT render on an unauthenticated route (any path equal to `/auth` or starting with `/auth/`), because an install pitch is noise (at best) or a distraction from completing sign-in (at worst) on those routes. This check follows the same bypass idiom already used by `app/route-aware-providers.tsx#shouldBypassAppProviders`.
- `components/pwa/ios-install-sheet.tsx` MUST present the manual "Share -> Add to Home Screen" instructions, because iOS Safari never fires `beforeinstallprompt`. Copy MUST refer to the browser generically (not "Safari"), because iOS Chrome/Firefox are WebKit-based and present the same instructions. Every instruction label MUST match the real iOS UI label verbatim (e.g. "Añadir a pantalla de inicio", not an approximation), because these instructions exist to be followed step by step against the real OS.
- No install UI MAY be rendered by `install-prompt.tsx` when the resolved `promptKind` is `'none'` or `'installed'`; the interruptive banner MUST NOT render an "already installed" message, that is the settings entry's job (see "Persistent Settings Entry Point" below).
- On `promptKind === 'instructions'`, the sheet MUST NOT render until `isIosPromptEligible` is true.
- Both surfaces MUST share their chrome (position, z-index, background, blur, shadow, non-modal semantics, `Escape`-to-`hideForSession` handling) through one component, `components/pwa/install-surface.tsx`. Restyling the shared chrome (position strategy, z-index, background, blur, shadow) is a one-file change there; each surface's own layout deltas (corners, max width, internal content) live in that surface's own file (`install-prompt.tsx`, `ios-install-sheet.tsx`) and are NOT moved into `install-surface.tsx`.
- The prompt and the iOS sheet MUST use non-modal semantics (`role="region"` with an accessible name) rather than `role="dialog"` + `aria-modal="true"`, because neither traps focus nor inerts the page, and neither should misrepresent itself to assistive technology as a true modal dialog.
- The prompt MUST offer an explicit dismiss affordance that calls the persisted `dismiss()`.
- Every surface with a dismiss affordance MUST support a transient hide via the `Escape` key while mounted (see "Transient Session Hide vs. Persisted Dismissal" above).
- Any icon-only dismiss control (for example the action prompt's close `X`) MUST have a touch target of at least 44x44 CSS pixels, and its icon color token MUST meet at least 4.5:1 contrast against the surface background.
- Both install surfaces MUST use ONE consistent typographic scale (the repository's `text-ios-*` tokens defined in `tailwind.config.ts`, e.g. `text-ios-body`, `text-ios-caption`, `text-ios-footnote`), not a mix of those tokens in one surface and raw Tailwind sizes (`text-sm`, `text-xs`) in another.
- On small screens (the same breakpoint range where `components/layout/mobile-nav.tsx`'s fixed bottom navigation is visible, i.e. below the `lg` breakpoint), both install surfaces MUST render entirely above the bottom navigation bar, accounting for the device's safe-area inset the same way the bottom navigation itself does (`env(safe-area-inset-bottom)`), never overlapping it even on a notched device. Both surfaces MUST use a `z-index` strictly below EVERY navigation-chrome layer that can be visible at the same time — this includes not only the app's modal/sheet layer (`components/ui/modal.tsx`, `components/layout/header.tsx`) but also the mobile bottom-sheet FAB menu and its own open drawer (`components/layout/mobile-menu-fab.tsx`) — so any of those, when open, always paints above an install surface, never behind it.

### Dismissal Cooldown

- The dismissal policy (storage key, persistence, and the cooldown predicate) MUST live in a single module, `lib/pwa/install-dismissal.ts`. No other module MAY read or write the dismissal storage key directly.
- After a dismissal (`dismiss()`, never `hideForSession()` — see "Transient Session Hide vs. Persisted Dismissal" above), the prompt MUST NOT be shown again for a cooldown window of **30 days**.
- After the cooldown window elapses, the prompt MAY be offered again if the platform still supports installation.
- An `appinstalled` event MUST suppress the prompt permanently, independently of the cooldown.
- Corrupt or unparsable persisted dismissal state MUST be treated as "never dismissed" and MUST NOT throw.

### Persistent Settings Entry Point

- The settings page MUST offer a persistent "Instalar app" entry point (`components/pwa/install-app-setting.tsx`), reachable at any time regardless of the banner's dismissal cooldown, because the early-capture script's `preventDefault()` on `beforeinstallprompt` suppresses Chrome's own native install affordance — after a single banner dismissal, this settings entry is the ONLY way back to installing for the following 30 days.
- `components/pwa/install-app-setting.tsx` MUST IGNORE `isDismissed` entirely and MUST NOT gate rendering on `isIosPromptEligible`. Those two gates exist solely to stop the interruptive banner from nagging; a user who deliberately navigated to settings is not in that situation.
- `components/pwa/install-app-setting.tsx` MUST be presentational: it consumes `usePwaInstall()` only and MUST NOT read `window`, `navigator`, `beforeinstallprompt`, or import from `lib/pwa/` directly.
- When `promptKind === 'installed'`, the entry MUST render a non-interactive confirmation that the app is already installed, with no action button.
- When `promptKind === 'native'` and `canInstall` is true, the entry MUST render an enabled action that calls `promptInstall()` and MUST surface the resolved `PromptInstallOutcome` to the user (success feedback on `'accepted'`, an error surface on `'unavailable'`).
- When `promptKind === 'native'` and `canInstall` is false, the entry MUST render a disabled, explanatory state (the browser has not yet offered installation) and MUST NOT render a button that does nothing when clicked.
- When `promptKind === 'instructions'`, the entry MUST render an action that opens the existing `IosInstallSheet` on demand, managed with local component state, and MUST NOT wire that open/close state to `dismiss()` or the dismissal cooldown — closing an explicitly-opened instructions sheet is not a rejection of the banner.
- When `promptKind === 'none'`, the entry MUST render a non-empty, non-interactive explanatory row ("not supported in this browser/environment"), NOT `null`. The surrounding settings card (`app/settings/settings-page-client.tsx`) has no knowledge of `promptKind` and always renders a baseline description line above this component; rendering `null` here left that description as an orphan sentence with nothing under it on browsers with no install path (e.g. desktop Firefox/Safari) — worse than the placeholder this component replaced. Keeping the settings page unaware of `promptKind` is preserved by having THIS component render the fallback row itself, not by teaching the settings page about `promptKind`.
- The three rendered states that share the same row layout (installed, iOS instructions, native) MUST be built from one shared `components/pwa/setting-row.tsx` presentational component, not three copies of the same markup.
- User-facing strings duplicated between the interruptive banner and this settings entry (e.g. the "access faster from your home screen" tagline) MUST be defined once in `components/pwa/copy.ts` and imported by both, never hand-copied.

### Native-Shell Detection (Single Source of Truth)

- `isNativeShell()` MUST have exactly one implementation, in `lib/platform/native-shell.ts` (outside `lib/pwa/`, since native-shell detection is a platform concern, not a PWA-specific one). Every production call site that needs to know whether the app is running inside the Capacitor native shell — this explicitly includes `lib/pwa/environment.ts` and `lib/auth/capacitor-oauth.ts` — MUST import it from there, and MUST NOT probe `Capacitor.isNativePlatform()` directly. `lib/pwa/environment.ts` re-exports it so existing `lib/pwa/` import sites keep working unchanged.

### Bounded Service Worker Cache and Persistent Storage

- `public/sw.js` MUST enforce a hard cap on the number of entries it keeps in its cache (`MAX_CACHE_ENTRIES`), because Next.js emits a unique path per build and nothing else removes a previous build's entries from the cache — an uncapped cache grows by a full build's worth of assets on every deploy a visitor happens to load. A time-based TTL MUST NOT be used instead: every cached entry is a content-hashed, immutable `/_next/static/` asset, so a URL either still matches the current build (still useful, regardless of age) or it does not (dead weight, regardless of age) — a hard entry-count cap is the correct bound.
- When a write would push the cache over `MAX_CACHE_ENTRIES`, the worker MUST evict the oldest entries first, down to exactly the cap. `Cache#keys()` returns entries in insertion order, so eviction needs no separate last-accessed bookkeeping.
- `lib/pwa/service-worker.ts#registerServiceWorker()` MUST call `navigator.storage.persist()` (best-effort, guarded, never throwing) after attempting registration, because the browser MAY evict this origin's ENTIRE storage bucket as a unit under storage pressure — and `repositories/local/db.ts` keeps the Dexie `FinanceDB` (transactions, accounts, budgets, goals) in that same origin-scoped bucket as this worker's Cache Storage entries. An unbounded or unprotected cache risks the financial ledger's own database being evicted alongside it.
- The `navigator.storage.persist()` call MUST be a no-op (never throw, never block registration) when the API is unavailable (older browsers) or when the browser declines the request — it is a hint, not a guarantee.
- The settings page (`app/settings/settings-page-client.tsx`) MUST NOT know about `promptKind`, `usePwaInstall`, or any other PWA internal beyond importing `InstallAppSetting`; the surrounding settings section MUST always render non-empty baseline content, and `InstallAppSetting` itself MUST always render a non-empty row (see "Persistent Settings Entry Point" above for the `promptKind === 'none'` case) so the section is never an empty card.

## Scenarios

### Scenario 1: Android Chrome with install criteria met (Happy Path)

- **Given** the user browses on Android Chrome, the manifest link is present, and a service worker is active
- **When** the browser fires `beforeinstallprompt`
- **Then** the hook MUST call `preventDefault()` and retain the deferred event
- **And** `canInstall` MUST become true
- **And** the custom install prompt MUST be rendered
- **When** the user accepts the custom prompt
- **Then** `promptInstall` MUST invoke the deferred event's `prompt()`, opening the native install dialog
- **And** when the browser subsequently fires `appinstalled`, the prompt MUST be hidden permanently.

### Scenario 2: iOS Safari

- **Given** the user browses on iOS Safari outside standalone mode
- **When** the page loads
- **Then** no `beforeinstallprompt` event is fired by the platform
- **And** the resolved platform MUST be `ios`
- **And** the iOS instructions sheet MUST be offered, describing Share -> Add to Home Screen
- **And** the Android-style accept action MUST NOT be presented.

### Scenario 3: Application already installed

- **Given** the application is launched from the home screen
- **When** the display mode is `standalone` OR `navigator.standalone` is true
- **Then** the resolved platform MUST be `installed`
- **And** no install prompt and no iOS sheet MAY be rendered.

### Scenario 4: Inside the Capacitor native shell

- **Given** the web bundle runs inside the Capacitor Android or iOS native application
- **When** the platform resolver runs
- **Then** it MUST return `unsupported` before evaluating any user agent or display-mode rule
- **And** no install prompt, no iOS sheet, and no "install our app" messaging MAY EVER be shown.

### Scenario 5: User dismisses the prompt (Cooldown)

- **Given** the custom install prompt is visible on a supported platform
- **When** the user dismisses it
- **Then** `dismiss` MUST persist the dismissal timestamp
- **And** `isDismissed` MUST be true for the following 30 days across reloads
- **And** the prompt MUST NOT be rendered during that window
- **And** after 30 days have elapsed the prompt MAY be offered again.

### Scenario 6: Service worker registration guards

- **Given** the application runs in development (`NODE_ENV !== 'production'`)
- **When** the registration component mounts
- **Then** it MUST NOT call `navigator.serviceWorker.register`
- **And** **Given** a browser without `navigator.serviceWorker`, mounting MUST NOT throw and MUST NOT attempt registration.

### Scenario 7: Manifest and icons reach the document head

- **Given** a request for any application route
- **When** the root layout renders
- **Then** the head MUST contain `<link rel="manifest" href="/manifest.json">`
- **And** the head MUST contain an `apple-touch-icon` link
- **And** every icon URL referenced by the manifest MUST resolve to an existing file in `public/`.

### Scenario 8: Corrupt persisted dismissal state (Edge Case)

- **Given** the persisted dismissal value is missing, empty, or not a valid timestamp
- **When** the hook initialises
- **Then** it MUST NOT throw
- **And** `isDismissed` MUST be false, treating the state as "never dismissed".

### Scenario 9: `beforeinstallprompt` fires before hydration (Early Capture)

- **Given** the browser fires `beforeinstallprompt` before React has hydrated (for example on a repeat visit with an already-active service worker)
- **When** the inline `beforeInteractive` capture script runs
- **Then** it MUST call `preventDefault()` and stash the event on the well-known `window` key
- **When** `usePwaInstall` subsequently mounts
- **Then** it MUST read the stashed event and set `canInstall` to true immediately, without waiting for another `beforeinstallprompt` event that will never come.

### Scenario 10: iOS engagement gate

- **Given** a first-time iOS visitor whose resolved platform is `ios`
- **When** the page loads for the first time
- **Then** `isIosPromptEligible` MUST be false and the iOS instructions sheet MUST NOT render
- **When** the same visitor loads the page again (second visit)
- **Then** `isIosPromptEligible` MUST be true and the iOS instructions sheet MAY render.

### Scenario 11: iPadOS 13+ (disguised as desktop Safari)

- **Given** an iPad running iPadOS 13 or later, whose user agent reports `Macintosh` and whose `navigator.maxTouchPoints` is greater than 1
- **When** the platform resolver runs
- **Then** it MUST return `ios`, NOT `desktop` or `unsupported`
- **And** the iOS instructions sheet MUST be offered under the same engagement gate as any other iOS visitor
- **And** a real Mac (the same `Macintosh` user agent with `maxTouchPoints` of 0 or 1) MUST NOT be misclassified as `ios`.

### Scenario 12: `prompt()` rejects on an already-consumed deferred event

- **Given** the hook has already retained a deferred `beforeinstallprompt` event and the user triggers `promptInstall` a second time on the same event (for example after a remount)
- **When** the browser's `prompt()` call rejects (e.g. `InvalidStateError`)
- **Then** `promptInstall` MUST resolve `'unavailable'`, not reject or throw
- **And** `canInstall` MUST become false
- **And** the retained deferred event AND the early-capture `window` stash MUST both be cleared, so a later remount cannot resurrect the same already-consumed event.

### Scenario 13: Visit counter is StrictMode-safe

- **Given** the application runs in development with React Strict Mode, which double-invokes the mount effect once per real mount (mount -> cleanup -> mount, same component instance)
- **When** the hook mounts exactly once from the user's perspective (one real page load)
- **Then** the persisted visit counter MUST increment by exactly 1, not 2.

### Scenario 14: Install surfaces never cover the bottom navigation, the mobile FAB drawer, or a modal

- **Given** the viewport is narrow enough that `components/layout/mobile-nav.tsx`'s fixed bottom navigation AND `components/layout/mobile-menu-fab.tsx`'s FAB are visible
- **When** an install surface (`InstallSurface`) is rendered
- **Then** it MUST be positioned above the bottom navigation bar, not overlapping it
- **And** its `z-index` MUST be strictly below the mobile FAB's `z-index` (measured: the FAB and its drawer sit at `z-50`; the install surface previously shipped at `z-[55]`, ABOVE both, so the surface visually covered the FAB and painted OVER an already-open FAB drawer)
- **And Given** a modal or sheet (`components/ui/modal.tsx`, `components/layout/header.tsx`) is open at the same time
- **Then** the modal or sheet MUST render above the install surface (the install surface's `z-index` MUST be strictly lower).

### Scenario 14b: Install surface clears the bottom navigation on a notched device

- **Given** an iPhone with a safe-area bottom inset (e.g. `env(safe-area-inset-bottom)` resolves to 34px), where `components/layout/mobile-nav.tsx` grows to accommodate that inset via `max(0.75rem, env(safe-area-inset-bottom))`
- **When** an install surface is rendered on that device
- **Then** its bottom offset MUST also account for `env(safe-area-inset-bottom)` (not a device-independent fixed value alone), so it clears the taller bottom navigation bar exactly as reliably as it does at zero inset.

### Scenario 15: Settings entry stays reachable through a banner dismissal

- **Given** the user dismissed the interruptive install banner (`isDismissed` is true, within the 30-day cooldown) on a platform where `promptKind` is `'native'` and `canInstall` is true
- **When** the user navigates to the settings page
- **Then** `components/pwa/install-app-setting.tsx` MUST still render the enabled "Instalar app" action
- **And** clicking it MUST call `promptInstall()`, independent of `isDismissed`.

### Scenario 16: Settings entry stays reachable before the iOS engagement threshold

- **Given** the resolved platform is `ios` and `isIosPromptEligible` is false (first-time visitor)
- **When** the user navigates to the settings page
- **Then** `components/pwa/install-app-setting.tsx` MUST still render an action that opens `IosInstallSheet`
- **And** clicking it MUST open the instructions sheet, independent of `isIosPromptEligible`.

### Scenario 17: Settings entry reflects already-installed and unsupported states

- **Given** the resolved `promptKind` is `'installed'`
- **When** the settings page renders `InstallAppSetting`
- **Then** it MUST show a non-interactive "already installed" confirmation with no button
- **Given** the resolved `promptKind` is `'none'` (Capacitor native shell, or a browser with no install path)
- **When** the settings page renders `InstallAppSetting`
- **Then** it MUST render a non-empty, non-interactive "not supported" row — NOT `null` — so the settings card is never left with an orphan description line and nothing under it.

### Scenario 18: Two consumers mounted at once share one `beforeinstallprompt` event (C1)

- **Given** BOTH `<InstallPrompt />` (mounted in the root layout, on every route) AND `<InstallAppSetting />` (mounted on `/settings`) are mounted at the same time
- **When** the browser fires `beforeinstallprompt`
- **Then** BOTH consumers' `canInstall` MUST become `true` together
- **And** clicking either consumer's "Instalar" action MUST call the SAME retained deferred event's `prompt()`
- **And** after that prompt resolves, BOTH consumers' `canInstall` MUST become `false` together — the settings entry MUST NOT be stuck showing "the browser has not yet offered installation" while the banner already received and consumed the event (a confirmed, reproduced defect, proven four times independently including in a real Chromium production build).

### Scenario 19: Visit counter is single-per-load safe across multiple consumers (C1)

- **Given** BOTH `<InstallPrompt />` and `<InstallAppSetting />` mount on the same real page load
- **When** that page load completes
- **Then** the persisted visit counter MUST have incremented by exactly 1, not 2 — the iOS engagement gate MUST NOT open one visit early for a visitor who lands on a route where both consumers happen to be mounted.

### Scenario 20: `Escape` never persists a dismissal it did not cause (M4)

- **Given** the install banner is visible and the user opens an unrelated modal (`components/ui/modal.tsx`), which also listens for `Escape` on `document`
- **When** the user presses `Escape` to close that unrelated modal
- **Then** the install banner MUST hide for the current session only (`hideForSession()`)
- **And** `localStorage` MUST NOT be written (the persisted dismissal key MUST remain unset, or unchanged if already set)
- **And** a page reload MUST show the banner again (assuming installability criteria still hold), because nothing was persisted.

### Scenario 21: Install banner never interrupts an unauthenticated route (N6)

- **Given** the current route is `/auth/login` (or any route under `/auth/`)
- **When** `usePwaInstall()` reports a platform and prompt kind that would otherwise render the banner
- **Then** `components/pwa/install-prompt.tsx` MUST render nothing on that route.

### Scenario 22: Service worker cache never grows without bound (M1)

- **Given** the service worker has already cached `MAX_CACHE_ENTRIES` `/_next/static/` assets from a previous build
- **When** a NEW build's assets are requested and cached after a fresh deploy
- **Then** the oldest cached entries MUST be evicted, keeping the total at or below `MAX_CACHE_ENTRIES`
- **And** `navigator.storage.persist()` MUST have been requested during registration, so the origin's storage bucket (shared with the Dexie financial ledger) is less likely to be evicted under pressure.
