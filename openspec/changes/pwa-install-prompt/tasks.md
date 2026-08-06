# Tasks: PWA Install Prompt

Strict TDD is enabled (`openspec/config.yaml: strict_tdd: true`). Every phase below is ordered RED -> GREEN -> REFACTOR: the failing test is written and observed failing BEFORE the implementation file exists. Do not reorder.

Test runner: `npm test` (Jest). All new tests live outside `tests/node/`, so they run in the `dom` project.

## Phase 0: Already Landed (verification only, no new work)

- [x] `scripts/generate-pwa-icons.mjs` generates `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`, `screenshot-mobile.png`, `screenshot-desktop.png` from `public/fintecminilogodark.png`.
- [x] Confirm every icon and screenshot referenced by `public/manifest.json` exists in `public/` before starting Phase 1.

## Phase 1: Platform Resolution (`lib/pwa/`)

- [x] RED: create `tests/lib/pwa/install-platform.test.ts` covering `resolveInstallPlatform`:
  - Capacitor native shell input returns `unsupported`, even when the user agent is Android and `isStandalone` is true (precedence assertion).
  - `isStandalone: true` returns `installed`.
  - iOS Safari user agent returns `ios`.
  - Android Chrome user agent returns `android`.
  - Desktop Chrome user agent returns `desktop`.
  - An unrecognised user agent with no install path returns `unsupported`.
- [x] RED: extend the same file with `isDismissalActive` boundary cases: `null` dismissal, just inside 30 days, exactly at the 30-day boundary, past 30 days.
- [x] Observe both suites failing (module does not exist).
- [x] GREEN: implement `lib/pwa/install-platform.ts` exporting `InstallPlatform`, `InstallEnvironment`, `resolveInstallPlatform`, `DISMISSAL_COOLDOWN_MS`, and `isDismissalActive`.
- [x] Verify the module is pure: no React import, no `window` / `navigator` / `document` access, no `@capacitor/core` import.
- [x] Run `npm test -- tests/lib/pwa` and confirm green.

## Phase 2: Install Hook (`hooks/use-pwa-install.ts`)

- [x] RED: create `tests/hooks/use-pwa-install.test.tsx` with `renderHook`, covering:
  - `beforeinstallprompt` is captured, `preventDefault()` is called, and `canInstall` becomes true.
  - `promptInstall` invokes the deferred event's `prompt()` and resolves with the user choice outcome.
  - `promptInstall` resolves `unavailable` when no deferred event was captured.
  - `appinstalled` sets `canInstall` to false permanently, independent of the cooldown.
  - `dismiss` persists the timestamp; a remount within 30 days keeps `isDismissed` true.
  - A corrupt or unparsable persisted value yields `isDismissed === false` and does not throw.
  - All listeners are removed on unmount.
  - `platform` reflects the value returned by the injected environment resolution.
- [x] Observe the suite failing.
- [x] GREEN: implement `hooks/use-pwa-install.ts` exposing `{ platform, canInstall, promptInstall, dismiss, isDismissed }`.
- [x] Read the environment ONCE (`navigator.userAgent`, display-mode / `navigator.standalone`, `Capacitor.isNativePlatform()`) and delegate every decision to `resolveInstallPlatform`. No platform branching may live in the hook.
- [x] Persist under the `fintec.pwa-install.dismissed-at` `localStorage` key, guarded against unavailable storage.
- [x] Re-export `usePwaInstall` and `UsePwaInstallReturn` from `hooks/index.ts` under the existing "UI & UX" grouping.
- [x] Run `npm test -- tests/hooks/use-pwa-install` and confirm green.

## Phase 3: Service Worker Registration

- [x] RED: create `tests/components/pwa/register-service-worker.test.tsx` covering:
  - Registers `/sw.js` exactly once when `NODE_ENV === 'production'`.
  - Does NOT register when `NODE_ENV !== 'production'`.
  - Does NOT throw and does NOT register when `navigator.serviceWorker` is unavailable.
  - A rejected `register()` promise is handled and does not throw into the React tree.
  - Renders nothing.
  - (Added) Does NOT register inside the Capacitor native shell.
- [x] Observe the suite failing.
- [x] GREEN: implement `components/pwa/register-service-worker.tsx` as a `"use client"` component returning `null`.
- [x] Run `npm test -- tests/components/pwa/register-service-worker` and confirm green.

## Phase 4: Presentation Components

- [x] RED: create `tests/components/pwa/ios-install-sheet.test.tsx` covering the Share -> Add to Home Screen instructions content, the `open: false` no-render case, and the `onDismiss` callback.
- [x] Observe failing; GREEN: implement `components/pwa/ios-install-sheet.tsx` as a purely presentational `"use client"` component.
- [x] RED: create `tests/components/pwa/install-prompt.test.tsx` with `usePwaInstall` mocked, covering:
  - `platform: 'android'` and `canInstall: true` renders the action prompt.
  - Accepting calls `promptInstall`.
  - Dismissing calls `dismiss`.
  - `platform: 'ios'` renders the iOS sheet and NOT the action prompt.
  - `platform: 'installed'` renders nothing.
  - `platform: 'unsupported'` (Capacitor native shell) renders nothing.
  - `isDismissed: true` renders nothing.
- [x] Observe failing; GREEN: implement `components/pwa/install-prompt.tsx`.
- [x] Verify neither component imports `beforeinstallprompt`, `navigator`, or anything from `lib/pwa/` directly — they consume the hook only.
- [x] Run `npm test -- tests/components/pwa` and confirm green.

## Phase 5: Manifest and Layout Wiring

- [x] Update `public/manifest.json`:
  - Split the two `"purpose": "maskable any"` entries into separate `any` (`icon-192.png`, `icon-512.png`) and `maskable` (`icon-maskable-192.png`, `icon-maskable-512.png`) entries.
  - Set `background_color` to `#010101`.
  - Set `theme_color` to `#000000` to reconcile the conflict with `app/layout.tsx`.
- [x] Update `app/layout.tsx`:
  - Add `metadata.manifest: '/manifest.json'`.
  - Add `metadata.icons` including the `apple-touch-icon` entry.
  - Confirm the `theme-color` value matches the manifest.
  - Mount `<RegisterServiceWorker />` and `<InstallPrompt />` inside the body.
- [x] Verify in a running build that the document head contains `<link rel="manifest" href="/manifest.json">` and the apple-touch-icon link. (`npm run build` now succeeds in this worktree; the previously-blocking Turbopack "Symlink node_modules is invalid" error no longer reproduces.)

## Phase 6: Verification and Polish

- [x] Run the full suite: `npm test`. (1 pre-existing, unrelated failure in `tests/node/api/binance-p2p-offers-route.test.ts`, untouched by this change.)
- [x] Run `npm run type-check`.
- [x] Run `npm run lint`.
- [x] Run `npm run build` and confirm no manifest or metadata warnings. (Succeeds; no manifest or metadata warnings.)
- [ ] Manual: Chrome DevTools -> Application -> Manifest reports no errors and shows both icon families.
- [ ] Manual: Lighthouse reports the application as installable.
- [ ] Manual: Android Chrome shows the custom prompt; accepting opens the native install dialog; `appinstalled` hides it.
- [ ] Manual: iOS Safari shows the instructions sheet, not the action prompt.
- [ ] Manual: the Capacitor Android build shows no install UI at any point.

## Phase 7: Review Defect Fixes

A review found 5 confirmed defects after Phase 6 landed. Fixed with strict TDD for the two behavior-changing defects (D1, D3).

- [x] D1 (HIGH): `beforeinstallprompt` fired before hydration was lost because the listener was only attached inside `useEffect`.
  - [x] RED: add a test to `tests/hooks/use-pwa-install.test.tsx` proving an event stashed on the window key BEFORE the hook mounts still yields `canInstall === true`; observed failing against the pre-fix implementation.
  - [x] GREEN: add `lib/pwa/install-event-store.ts` (pure, no React) owning the window-key stash, read/consume/subscribe helpers, and the inline capture script source.
  - [x] GREEN: emit the capture script in `app/layout.tsx` `<head>` via `next/script` `strategy="beforeInteractive"` so it runs before hydration.
  - [x] GREEN: `hooks/use-pwa-install.ts` reads any stashed event on mount (setting `canInstall` immediately) AND keeps subscribing to later `beforeinstallprompt` events.
  - [x] Run `npm test -- tests/hooks/use-pwa-install` and confirm green.
- [x] D2 (a11y): `InstallPrompt` and `IosInstallSheet` claimed `role="dialog"` + `aria-modal="true"` without trapping focus or inerting the page. Replaced with `role="region"` + `aria-label`, matching the existing non-modal labeling pattern in the repo (`components/ui/alert.tsx` uses `role="alert"`; no existing non-modal bottom-sheet pattern was found, so `role="region"` with an accessible name was chosen as the standard non-modal labeled-region role).
- [x] D3 (UX): `IosInstallSheet` rendered unconditionally on first paint for every iOS visitor with no engagement gate.
  - [x] RED: add a test to `tests/hooks/use-pwa-install.test.tsx` proving `isIosPromptEligible` is false on first mount and true on a second mount (visit-count engagement rule); observed failing against the pre-fix implementation.
  - [x] GREEN: `usePwaInstall` tracks a `localStorage` visit counter and exposes `isIosPromptEligible` (true starting on the visitor's second page load).
  - [x] GREEN: `InstallPrompt` (still presentational) passes `open={isIosPromptEligible}` to `IosInstallSheet` instead of always `open`.
  - [x] Update `tests/components/pwa/install-prompt.test.tsx` to cover both the pre-threshold (nothing renders) and post-threshold (sheet renders) iOS cases.
- [x] D4: translated the stray Spanish comment in `hooks/use-pwa-install.ts` (`// * Determina el "environment"...`) to English; swept `app/layout.tsx`, `hooks/use-pwa-install.ts`, `hooks/index.ts`, `lib/pwa/*.ts`, and `components/pwa/*.tsx` for the same issue — no other instances found in files touched by this change.
- [x] D5: removed the redundant `cn(...)` wrapper around a single static class string in `components/pwa/ios-install-sheet.tsx`, and dropped the now-unused `cn` import.
- [x] Additional: `IosInstallSheet` copy said "en Safari"; changed to browser-agnostic wording ("del navegador") since iOS Chrome/Firefox are WebKit-based and see the same Share sheet under a different app name.
- [x] Update `openspec/changes/pwa-install-prompt/specs/pwa-install/spec.md` with the early-capture requirement, the engagement gate, and the non-modal a11y semantics (Scenarios 9 and 10 added).
- [x] Run `npx jest tests/lib/pwa tests/hooks/use-pwa-install.test.tsx tests/components/pwa` — all green.
- [x] Run `npm run type-check` — clean.
- [x] Run `npx oxlint --quiet app components hooks lib tests scripts` — no new findings in PWA files.
- [x] Run `npm run build` — succeeds.

## Phase 8: Review Defect Fixes (four independent reviews)

A second, four-review pass found further defects in the service worker, module layering, and confirmed runtime/a11y bugs. Fixed with strict TDD for every item that changed observable behavior.

### Service worker (`public/sw.js`)

- [x] Replaced the pre-existing 381-line `public/sw.js` outright (never registered anywhere pre-branch, so no installed fleet to migrate) with a minimal, installability-only worker. `install` calls `self.skipWaiting()` as its unconditional first statement; `activate` calls `clients.claim()` and deletes every non-matching cache; `fetch` only ever cache-firsts same-origin GET requests under `/_next/static/`, and returns (no `respondWith`) for every non-GET, cross-origin, `/api/`, or `navigate`-mode request.
- [x] RED: `tests/lib/pwa/service-worker-policy.test.ts` — wrote the routing and install-ordering assertions against a `vm`-sandboxed load of `public/sw.js` before the file was rewritten; observed failing (`self.__pwaRoutingPolicy` did not exist, the old file's fetch handler intercepted everything).
- [x] GREEN: rewrote `public/sw.js`; the pure routing decision is exposed as `self.__pwaRoutingPolicy` purely so the sandboxed test can exercise the exact production source, never a duplicated copy.
- [x] Documented the offline-caching descope in design.md (section 8) and proposal.md ("Out of Scope" / "Follow-up Work").

### Layering (Part 2 of the review)

- [x] `lib/pwa/environment.ts` (new): `isNativeShell()`, `readInstallEnvironment()` — the single owner of `lib/pwa/` global reads.
- [x] `lib/pwa/service-worker.ts` (new): `registerServiceWorker()`, moved out of the component; `components/pwa/register-service-worker.tsx` is now a thin `useEffect` wrapper.
- [x] `lib/pwa/install-platform.ts`: added pure `resolvePromptKind(platform)`; `resolveInstallPlatform`'s signature and return type were left untouched so its existing tests kept passing unmodified.
- [x] `hooks/use-pwa-install.ts`: exposes `promptKind` (derived via `resolvePromptKind`); `components/pwa/install-prompt.tsx` now switches on `promptKind`, not the platform identity string.
- [x] `lib/pwa/install-dismissal.ts` (new): moved the storage key, `readDismissal`, `recordDismissal`, `isDismissalActive`, `DISMISSAL_COOLDOWN_MS` out of `install-platform.ts` and the hook into one module.
- [x] `components/pwa/install-surface.tsx` (new): shared chrome for `install-prompt.tsx` and `ios-install-sheet.tsx` — position, z-index, background, blur, shadow, `role="region"`, and the `Escape`-to-dismiss handler.
- [x] Dropped the dead `DISMISSAL_COOLDOWN_MS` import from `hooks/use-pwa-install.ts` (unused; `oxlint --quiet` had suppressed the warning).
- [x] `lib/pwa/install-event-store.ts#readStashedInstallEvent` made module-private (no external consumer).
- [x] Trimmed the triplicated "Chrome fires beforeinstallprompt before hydration" comment to one full copy in `install-event-store.ts`; `app/layout.tsx` keeps only the layout-local rationale (raw inline script vs. `next/script`) plus a pointer; the hook already carried only a one-line pointer.

### Confirmed bugs (Part 3 of the review)

- [x] D1 (bottom-nav / modal z-index overlap): `InstallSurface` moved from `z-[70]` to `z-[55]` (strictly below `modal.tsx`'s `z-[70]` and `header.tsx`'s sheet at `z-[60]`), and offset above the fixed mobile bottom nav (`z-[45]`, `lg:hidden`) with `bottom-[5.5rem]` on the same breakpoint range, switching to `lg:bottom-6` once the nav is hidden.
- [x] D2 (`promptInstall` dead button on rejection):
  - [x] RED: added a test to `tests/hooks/use-pwa-install.test.tsx` proving a rejecting `prompt()` resolves `'unavailable'` and clears `canInstall`; observed failing against the pre-fix implementation (the unhandled rejection propagated and `canInstall` stayed `true`).
  - [x] GREEN: wrapped both awaited calls in `try`/`catch`/`finally` in `hooks/use-pwa-install.ts`.
- [x] D3 (stash/ref two-owner handoff):
  - [x] RED: added a test proving `promptInstall` clears the early-capture `window` stash so a remount cannot resurrect an already-consumed event; observed failing against the pre-fix implementation.
  - [x] GREEN: `promptInstall`'s `finally` block now also calls `consumeStashedInstallEvent()`.
- [x] D4 (`recordVisit()` counts mounts, not visits, under StrictMode):
  - [x] RED: added a test mounting under `<StrictMode>` and asserting the persisted visit counter is `1`, not `2`; observed failing against the pre-fix implementation.
  - [x] GREEN: guarded `recordVisit()` with a per-mount `useRef` in `hooks/use-pwa-install.ts`.
  - [x] Rewrote the previous "mounts == visits" engagement-gate test (which stayed green even with the StrictMode bug) to set the persisted visit count directly and mount once.
- [x] D5 (iPadOS not detected): `InstallEnvironment` gained `maxTouchPoints`; `resolveInstallPlatform` resolves `ios` when the user agent matches `Macintosh` and `maxTouchPoints > 1`. Table-driven cases added to `tests/lib/pwa/install-platform.test.ts`.
- [x] D6 (accessibility): the action prompt's close `X` grew from a ~24x24px touch target to `h-11 w-11` (44x44px); `InstallSurface` adds an `Escape` handler wired to each surface's dismiss callback; the close icon's color token was raised from `text-muted-foreground/70` to `text-muted-foreground` for contrast.
- [x] D7 (`sharp` transitive-only dependency): added `sharp` to `devDependencies` at the currently-installed version (`^0.34.4`) via `npm install --save-dev --package-lock-only`, avoiding a `node_modules` rewrite (hardlinked worktree copy); added a `pwa:icons` npm script.
- [x] D8 (manifest favicon `sizes` lie): corrected `public/manifest.json`'s `favicon.ico` entry from `"16x16 32x32 48x48"` to `"32x32"`, matching what `scripts/generate-pwa-icons.mjs` actually packs.
- [x] D9 (stale "80% safe zone" comment): corrected to "70% safe zone" in `scripts/generate-pwa-icons.mjs`, matching `MASKABLE_SAFE_RATIO = 0.7`.
- [x] D10 (weak tests): removed the tautological `RegisterServiceWorker` "renders nothing" test (signature is already `(): null`); strengthened the hook's unmount test to compare full `addEventListener`/`removeEventListener` call args (type AND handler reference), not just event-type strings.

### Verification

- [x] Updated `openspec/changes/pwa-install-prompt/{proposal,design,specs/pwa-install/spec}.md` — offline-caching descope, new module interfaces, new scenarios (11-14).
- [x] Run `npx jest tests/lib/pwa tests/hooks/use-pwa-install.test.tsx tests/components/pwa` — 10 suites, 68 tests, all green.
- [x] Run `npm run type-check` — clean.
- [x] Run `npx oxlint app components hooks lib tests scripts` (WITHOUT `--quiet`) — zero findings in any PWA file (300 pre-existing warnings remain in unrelated files).
- [x] Run `npm run build` — succeeds.
- [x] Run `npx prettier --check` on every touched file — clean after `--write` on the newly-added test files.

## Phase 9: Follow-up — Persistent Settings Entry Point

- [x] RED: extend `tests/lib/pwa/install-platform.test.ts`'s `resolvePromptKind` table to expect `installed -> installed` (was `installed -> none`); observed failing against the pre-fix implementation.
- [x] GREEN: `lib/pwa/install-platform.ts` — added `'installed'` to the `PromptKind` union; `resolvePromptKind` now maps `platform === 'installed'` to `promptKind === 'installed'` (kept `unsupported -> none`). Updated the `PromptKind` docblock.
- [x] Verified `components/pwa/install-prompt.tsx` still renders `null` for `promptKind === 'installed'` (it only matches `'instructions'` and `'native'`) — confirmed via the existing/updated test suite, not assumed.
- [x] RED: create `tests/components/pwa/install-app-setting.test.tsx` covering: native+canInstall renders and calls `promptInstall`; still renders when `isDismissed` is true (the regression guard); still renders the iOS path when `isIosPromptEligible` is false and opens the instructions sheet on click; already-installed confirmation with no button; renders nothing for `'none'`; disabled explanatory state for native+`!canInstall`; success/error toast feedback on `promptInstall`'s resolved outcome. Observed failing (module does not exist).
- [x] GREEN: implement `components/pwa/install-app-setting.tsx` — presentational, consumes `usePwaInstall()` only, deliberately ignores `isDismissed` and does not gate on `isIosPromptEligible`.
- [x] Export `InstallAppSetting` from `components/pwa/index.ts`.
- [x] Wire `<InstallAppSetting />` into `app/settings/settings-page-client.tsx`'s existing "Aplicación" card, replacing the "Próximamente disponible" placeholder; kept an always-present description line so the card is never an empty shell when the component renders `null`.
- [x] Updated `openspec/changes/pwa-install-prompt/{proposal,design,specs/pwa-install/spec}.md`: marked the settings-entry follow-up as Done, documented the `PromptKind` extension (design.md section 10), and added the requirement + Scenarios 15-17 to spec.md.
- [x] Run `npx jest tests/lib/pwa tests/hooks/use-pwa-install.test.tsx tests/components/pwa` — 11 suites, 77 tests, all green.
- [x] Run `npm run type-check` — clean.
- [x] Run `npx oxlint app components hooks lib tests scripts` (WITHOUT `--quiet`) — zero new findings in any PWA file or in `app/settings/settings-page-client.tsx` (300 pre-existing warnings remain in unrelated files).
- [x] Run `npm run build` — succeeds.
- [x] Run `npx prettier --check` on every touched file — clean.

## Phase 10: Review Defect Fixes (strict 4R + real-browser harness: 1 blocker, 7 majors, 11 nits)

Strict TDD for C1, M2, M3, M4 (RED confirmed against the pre-fix code, then GREEN).

- [x] C1 (BLOQUEANTE): rewrote `lib/pwa/install-event-store.ts` into a single, module-level, shared store (adopt-once window stash, `subscribe`/`getSnapshot` for `useSyncExternalStore`, `clearDeferredInstallEvent`); `hooks/use-pwa-install.ts` now reads it via `useSyncExternalStore` with an SSR-safe server snapshot; removed the per-instance `deferredEventRef` and the read-and-clear `consumeStashedInstallEvent`.
  - [x] RED: `tests/lib/pwa/install-event-store.test.ts` (new store contract) and `tests/hooks/use-pwa-install.test.tsx` (two-consumer + hideForSession cases) — confirmed failing against the pre-fix code (module either didn't exist or didn't export the required API).
  - [x] GREEN: implemented the store, the hook migration, and moved visit counting to module scope (`lib/pwa/install-engagement.ts#recordVisitOncePerLoad`), fixing the "2 visits for 1 page load with 2 consumers" defect.
  - [x] Added `tests/components/pwa/install-shared-store-integration.test.tsx` — renders `<InstallPrompt/>` + `<InstallAppSetting/>` together with the REAL hook (no `jest.mock`), proving both see `canInstall` together and the visit counter increments once. RED-confirmed (module resolution failure) against the pre-fix code.
  - [x] Kept, did not delete, `install-app-setting.test.tsx`'s existing "disabled explanatory state when native and canInstall is false" mocked-hook unit test — it remains a genuinely reachable state (before any `beforeinstallprompt` has fired at all) and is no longer reachable via the specific two-consumer defect path the integration test now covers.
- [x] M1: bounded the service worker cache (`MAX_CACHE_ENTRIES = 200`, oldest-first eviction) and added `navigator.storage.persist()` to `lib/pwa/service-worker.ts#registerServiceWorker()`.
- [x] M2 + M3: `install-surface.tsx` z-index `z-[55]` → `z-[48]` (strictly below the mobile FAB/drawer's `z-50`); bottom offset `bottom-[5.5rem]` → `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`; corrected the docblock to name every layer actually reasoned about.
  - [x] RED: `tests/components/pwa/install-surface.test.tsx` z-index and safe-area tests, confirmed failing against the pre-fix `z-[55]` / fixed `bottom-[5.5rem]`.
- [x] M4: hook gained `hideForSession()` (transient) distinct from `dismiss()` (persisted); `install-surface.tsx`'s Escape prop renamed `onEscape`, wired only to the keydown handler; `install-prompt.tsx` and `ios-install-sheet.tsx` updated so Escape never calls the persisted `dismiss()`.
  - [x] RED: `tests/components/pwa/install-surface.test.tsx` (`onEscape` prop) and `tests/hooks/use-pwa-install.test.tsx` (Escape does not write `localStorage`) confirmed failing against the pre-fix `onDismiss`-only API.
- [x] M5: no separate test added — covered by the C1 integration test.
- [x] M6: extracted `lib/platform/native-shell.ts` as the single `isNativeShell()` implementation; migrated `lib/auth/capacitor-oauth.ts` off its direct `Capacitor.isNativePlatform()` call; `lib/pwa/environment.ts` re-exports it.
- [x] M7a: extracted `components/pwa/setting-row.tsx`; M7b: extracted `lib/pwa/install-engagement.ts` and the shared `lib/pwa/persisted-number.ts` numeric-read helper; M7c: extracted `components/pwa/copy.ts`.
- [x] N1–N11: see design.md section 11 for the exact fix applied per nit.
- [x] Updated `openspec/changes/pwa-install-prompt/{proposal,design,specs/pwa-install/spec}.md` — shared store, once-per-load visit counting, transient-vs-persisted dismissal, cache bound + `storage.persist()`, z-band + safe-area decisions, CSP/nonce follow-up obligation, unauthenticated-route decision, coherent settings row, Scenarios 14b and 18–22 added, Scenario 17 updated.
- [x] Run `npx jest tests/lib/pwa tests/lib/platform tests/hooks/use-pwa-install.test.tsx tests/components/pwa` — 15 suites, 107 tests, all green.
- [x] Run `npx jest` (full suite) — only the pre-existing `tests/node/api/binance-p2p-offers-route.test.ts` failure remains.
- [x] Run `npm run type-check` — clean.
- [x] Run `npx oxlint app components hooks lib tests scripts` (WITHOUT `--quiet`) — zero findings in any PWA file, `app/settings/`, or `lib/auth/`.
- [x] Run `npm run build` — succeeds.
- [x] Run `npx prettier --check` on every touched file — clean.

## Review Workload Forecast

Estimated authored change: roughly 350-400 lines of implementation plus roughly 400-450 lines of tests, across 5 new source files, 5 new test files, and 3 modified files.

- Decision needed before apply: Yes
- Chained PRs recommended: Yes
- 400-line budget risk: High

Recommended slices, each independently deliverable, verifiable, and revertable:

1. **PR #1 — Platform layer.** Phase 1 only: `lib/pwa/install-platform.ts` plus its tests. Pure, no UI, no runtime behaviour change. Rollback: delete the module.
2. **PR #2 — Hook and service worker registration.** Phases 2 and 3: `hooks/use-pwa-install.ts`, `hooks/index.ts`, `components/pwa/register-service-worker.tsx`, plus tests. Still not mounted, so no user-visible change. Rollback: delete the files and the barrel export.
3. **PR #3 — Presentation and wiring.** Phases 4, 5, and 6: prompt components, `public/manifest.json`, `app/layout.tsx`, plus tests and verification. This is the slice that turns the feature on. Rollback: unmount the two components from the layout.

In a Feature Branch Chain, PR #1 targets the feature branch and each later PR targets the immediately previous PR branch.
