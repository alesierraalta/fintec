# Proposal: PWA Install Prompt

## Intent

FinTec ships a PWA manifest and a 381-line service worker, but the application is **not installable** on any platform. Two hard blockers were verified:

1. `app/layout.tsx` never declares `metadata.manifest`, so no `<link rel="manifest">` is emitted.
2. Nothing registers `public/sw.js`. Chrome requires an active service worker with a `fetch` handler before it fires `beforeinstallprompt`.

There are zero `beforeinstallprompt` listeners in the repository, so even once the blockers are removed the browser install affordance stays buried in a browser menu, and iOS Safari never offers one at all. The goal is a controlled, first-party install experience that respects the user and never appears inside the Capacitor native shell.

## Scope

### In Scope

- Emit `metadata.manifest` and `metadata.icons` from `app/layout.tsx`.
- Register `/sw.js` from a client component, production-only.
- Pure platform-resolution layer under `lib/pwa/`.
- `usePwaInstall` hook capturing `beforeinstallprompt` / `appinstalled`, with persisted dismissal.
- Presentational install prompt plus a dedicated iOS "Add to Home Screen" instructions sheet.
- `public/manifest.json` corrections: split `any` / `maskable` icon entries, real `background_color`, reconciled `theme_color`.
- Suppression inside the Capacitor native app.

### Out of Scope

- **Offline caching strategy.** `public/sw.js` was replaced with a minimal, installability-only worker (see design.md, sections 1, 8, 9) after a review pass found the pre-existing 381-line file unsafe to ship: it cached authenticated `/api/*` and navigation responses in a shared cache with no per-user partitioning and no logout purge, and its precache setup always failed, which permanently blocked `skipWaiting()` for any future fix. It predated this change and was never registered anywhere in the repo, so there was no installed fleet to migrate. Designing a real offline strategy — per-user cache namespacing, a logout purge, an actual `/offline` route, and a real cache-versioning scheme — is tracked as separate follow-up work, not done here.
- Background sync, push notifications.
- Adopting a PWA build plugin (`@serwist/next`, `next-pwa`).
- App store / TWA distribution.

## Capabilities

### New Capabilities

- `pwa-install`: installability of the web application, platform resolution, install prompt lifecycle, and service worker registration.

### Modified Capabilities

- None.

## Approach

An own layer with **zero new dependencies**, using strict one-way dependencies: `components -> hooks -> lib`.

- `lib/pwa/install-platform.ts` — pure, React-free, DOM-free. Resolves `android | ios | desktop | installed | unsupported` from injected inputs (userAgent, display-mode, native-shell flag) so it is fully unit-testable.
- `hooks/use-pwa-install.ts` — owns browser events and dismissal persistence; exposes `{ platform, promptKind, canInstall, promptInstall, dismiss, isDismissed, isIosPromptEligible }`; re-exported from `hooks/index.ts`.
- `components/pwa/*` — registration and presentation only; the prompt components know nothing about browser events.

Rejected alternatives:

| Alternative                                                                        | Why rejected                                                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Adopt `@serwist/next` / `next-pwa`                                                 | New dependency plus build configuration, and forces migrating away from the existing 381-line `sw.js`. |
| Minimum-viable: fix manifest + register SW only, rely on the browser's native menu | No control over timing or messaging, and leaves iOS users with no guidance at all.                     |

## Affected Areas

| Area                                         | Impact   | Description                                                                          |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `lib/pwa/install-platform.ts`                | New      | Pure platform resolution.                                                            |
| `hooks/use-pwa-install.ts`                   | New      | Install lifecycle and dismissal state.                                               |
| `hooks/index.ts`                             | Modified | Barrel re-export.                                                                    |
| `lib/pwa/environment.ts`                     | New      | Single owner of `lib/pwa/` global reads (`isNativeShell`, `readInstallEnvironment`). |
| `lib/pwa/install-dismissal.ts`               | New      | Single owner of the dismissal policy.                                                |
| `lib/pwa/service-worker.ts`                  | New      | Unit-testable `registerServiceWorker()` policy.                                      |
| `components/pwa/register-service-worker.tsx` | New      | Thin wrapper mounting `registerServiceWorker()`.                                     |
| `components/pwa/install-surface.tsx`         | New      | Shared chrome for both install surfaces.                                             |
| `components/pwa/install-prompt.tsx`          | New      | Presentational prompt.                                                               |
| `components/pwa/ios-install-sheet.tsx`       | New      | iOS instructions sheet.                                                              |
| `components/pwa/install-app-setting.tsx`     | New      | Persistent "Instalar app" settings entry point (follow-up).                          |
| `app/settings/settings-page-client.tsx`      | Modified | Mounts `InstallAppSetting` in the "Aplicación" card.                                 |
| `app/layout.tsx`                             | Modified | `metadata.manifest`, `metadata.icons`, mount points.                                 |
| `public/manifest.json`                       | Modified | Icon purposes, colors, truthful `favicon.ico` `sizes`.                               |
| `public/sw.js`                               | Replaced | Minimal installability-only worker; offline caching descoped (see Out of Scope).     |
| `package.json`                               | Modified | `sharp` moved from transitive to explicit `devDependency`; added `pwa:icons` script. |
| `scripts/generate-pwa-icons.mjs`             | Done     | Icon and screenshot generation (already landed); fixed a stale comment.              |

## Risks

| Risk                                             | Likelihood | Mitigation                                                                                                                                                           |
| ------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt appears inside the Capacitor native app   | Med        | Native-shell detection is a first-class branch in `install-platform.ts`, covered by tests.                                                                           |
| Service worker caches stale assets in production | Low        | `sw.js` was rewritten to only cache-first immutable, content-hashed `/_next/static/` assets, never `/api/*` or navigation responses; see design.md sections 1, 8, 9. |
| Prompt perceived as nagging                      | Med        | Persisted dismissal with a 30-day cooldown; `appinstalled` hides it permanently.                                                                                     |
| Platform detection drifts as browsers change     | Low        | Detection is isolated in one pure module; a new rule touches exactly one file.                                                                                       |

## Rollback Plan

1. Remove the `RegisterServiceWorker` and `InstallPrompt` mounts from `app/layout.tsx` — the prompt and registration disappear immediately.
2. Revert `metadata.manifest` if manifest emission itself is implicated.
3. Revert the whole change: `lib/pwa/`, `hooks/use-pwa-install.ts`, `components/pwa/`, and the `hooks/index.ts` export are additive and delete cleanly.
4. Already-registered service workers self-remove only via an unregister path; if needed, ship a no-op `sw.js` that calls `self.registration.unregister()`.

## Dependencies

- `sharp` (devDependency, `^0.34.4`) — was already installed transitively via Next.js; now declared explicitly so `scripts/generate-pwa-icons.mjs` is reproducible without relying on an incidental transitive resolution.
- `public/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`, `screenshot-mobile.png`, `screenshot-desktop.png` — already generated by `scripts/generate-pwa-icons.mjs` (run via `npm run pwa:icons`).

## Follow-up Work

1. **Offline caching strategy (Not Started).** See "Out of Scope" above and design.md section 8 for the full breakdown: per-user cache namespacing, a logout-time cache purge, a real `/offline` route, and a real cache-versioning scheme, all evaluated against the same "never cache authenticated responses without partitioning" bar before any caching is added back.
2. **Settings-menu "Install app" entry point (Done).** `components/pwa/install-app-setting.tsx`, wired into `app/settings/settings-page-client.tsx`'s "Aplicación" card. See design.md section 10. It deliberately ignores the banner's dismissal cooldown and the iOS engagement gate, since it is the only way back to installing the app once the interruptive banner has been dismissed (the early-capture script's `preventDefault()` suppresses Chrome's own native install affordance).
3. **Analytics/telemetry for prompt acceptance/dismissal (Not Started).** No error or event sink was identified in the codebase to wire this into; deferred until one exists.
4. **CSP nonce for the inline capture script (Not Started).** No Content-Security-Policy exists anywhere in this repo today (verified). The root layout's inline `beforeinstallprompt` capture script (see design.md, "Early `beforeinstallprompt` Capture") has no `nonce` and will silently stop running the day a CSP with `script-src` (and no `'unsafe-inline'`) is added, silently breaking early-capture install detection. See design.md section 11, N5, for the exact obligation whoever adds a CSP must satisfy.

## Success Criteria

- [ ] The rendered document head contains `<link rel="manifest" href="/manifest.json">`.
- [ ] A service worker is active in production and Chrome fires `beforeinstallprompt`.
- [ ] Android/Chrome users see the custom prompt; accepting it opens the native install dialog.
- [ ] iOS Safari users see the "Add to Home Screen" instructions sheet.
- [ ] Nothing is shown when already installed or inside the Capacitor native shell.
- [ ] A dismissal suppresses the prompt for 30 days; `appinstalled` suppresses it permanently.
- [ ] Lighthouse reports the application as installable.
