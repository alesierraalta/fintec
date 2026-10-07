# Navigation revisit performance (Inicio ↔ Transacciones)

## Goal

Make the authenticated APK navigation loop `Inicio → Transacciones → Inicio → Transacciones` feel immediate after the first visit. Preserve shared providers, cached financial data, and useful screen state across route changes; keep stale content visible while refreshes run in the background; avoid full-screen loaders on warm revisits; and validate navigation latency plus 60/120 Hz frame stability on the real APK when a device is available.

## Baseline findings

- `/` currently bypasses `RouteAwareProviders` and wraps the authenticated dashboard in `LocalProvidersForRootDashboard`.
- `/transactions` uses the provider tree from `RouteAwareProviders`.
- Navigating between the routes therefore remounts AuthProvider, RepositoryProvider, SubscriptionProvider, FinancialRealtimeSync, and route-local page trees.
- Both dashboard and transactions call `useOptimizedData().loadAllData()` on mount. The module cache avoids some network calls, but page-local state and provider identity are still lost.
- The transactions route has a full skeleton/loading fallback and an in-page spinner whenever the cache is empty, which makes cold/warm transitions look like reloads.
- The optimized data cache already persists to localStorage and exposes stale data during a refresh; this is the foundation to preserve rather than replace.

## Scope

In scope:

- Stabilize the authenticated provider tree across `/` and `/transactions`.
- Preserve warm cached data and avoid blocking full-screen loaders when data already exists.
- Add only compositor-friendly transition treatment (`transform`/`opacity`) with reduced-motion support.
- Add focused regression coverage for provider lifetime/cache-backed warm navigation behavior.
- Run the real APK loop repeatedly and record timing, reload evidence, and frame-loss evidence; report unavailable hardware evidence honestly.

Out of scope:

- Rewriting the app as native Kotlin/Compose.
- Changing repository contracts, financial calculations, authentication policy, or transaction payloads.
- Broad list virtualization or unrelated UI/performance cleanup.
- Committing or publishing changes without explicit user authorization.

## Tasks

1. Capture the current lifecycle/data-loading baseline and define focused regression checks. **Status: complete.**
2. Keep authenticated providers stable across Inicio and Transacciones; remove the duplicate root provider mount without regressing the public landing route. **Status: complete.**
3. Make warm navigation non-blocking and add a lightweight, reduced-motion-safe transition without introducing layout or GPU-heavy effects. **Status: complete.**
4. Run deterministic checks and the real APK navigation loop repeatedly; measure navigation time, reload/network evidence, and 60/120 Hz frame metrics where reachable. **Status: complete for the reachable installed APK; local source-deploy equivalence remains unclaimed.**

## Acceptance

## Baseline evidence

- `app/page.tsx` renders the authenticated dashboard inside `LocalProvidersForRootDashboard`.
- `RouteAwareProviders` bypasses all app providers for `/`, but provides Auth/Repository/Subscription/RealtimeSync for `/transactions`; the provider tree therefore changes on every loop traversal.
- Dashboard and transactions both call `useOptimizedData().loadAllData()` on mount. The module cache is process/user scoped and persisted to localStorage, but `isInitialLoad` uses empty arrays as the only signal and page-local state is discarded on route changes.
- `app/transactions/loading.tsx` and `app/loading.tsx` render full-page skeleton fallbacks during server navigation. Transactions also renders a full in-page spinner when the filtered list is empty while `loading` is true.
- `invalidateOptimizedDataCache` currently clears arrays before authoritative refresh, which can force a loader instead of retaining stale rows during an update.
- `rtk proxy adb devices -l` found no connected Android device in this session, so APK frame evidence remains pending until hardware/emulator access is available.
- The worktree already contains unrelated uncommitted changes, including removal of two backdrop filters; those changes must remain untouched.

- `RouteAwareProviders` remains mounted with the same authenticated provider instances while navigating between `/` and `/transactions`.
- Warm revisits render existing cached transactions/accounts immediately and do not show the full-screen transactions loader.
- Refreshes retain stale content and update asynchronously; no new financial fetch is triggered solely by provider remount during the loop.
- Navigation motion uses only opacity/transform, respects reduced motion, and does not add backdrop filters or long-running JS animation work.
- Focused tests/typecheck/lint/build results are recorded, including any pre-existing blockers.
- APK evidence includes multiple loop iterations and states exactly which frame/reload metrics were actually observed.

## Evidence log

- Baseline: lifecycle and loading evidence captured; no Android device was connected.
- Task 1: complete.
- Deterministic checks: 3 focused suites / 20 tests passed; type-check, lint, build, and diff-check passed. Build generated 66/66 static routes; only non-blocking middleware deprecation warning.
- Browser proxy benchmark (`tests/e2e/perf/home-transactions-revisit.spec.ts`): 3 iterations / 12 legs; 0 main-document reloads after initial load; 24 Next/RSC requests; 2 API/Supabase requests; full transaction loader visibility was false on every leg; 60 Hz estimate had 0 drops on all legs after cadence calibration. The 120 Hz estimate is not a device claim: Mobile Chrome proxy is effectively 60 Hz and reported ~16.7–16.8 ms cadence.
- Physical APK: `rtk proxy adb devices -l` found no connected devices; emulator executable/AVD list unavailable. Release APK exists at `android/app/build/outputs/apk/release/app-release-unsigned.apk`; `~/.local/tools/fintec-perf` is present, but no trace was captured in this session.

## Physical APK evidence

- USB passthrough was restored through Windows `usbipd` BUSID `1-6`; device `c66a1c55` is a Xiaomi 11T Pro on Android 14/SDK 34 with active 120 Hz.
- The installed debug remote shell targets `https://fintec-alesierraaltas-projects.vercel.app`. It differs from the local unsigned release APK, so this is runtime evidence for the installed deployed origin, not proof that the uncommitted local source is deployed.
- Exact physical loop: `Inicio → Transacciones → Inicio → Transacciones → Inicio`, repeated 3 times (12 measured legs). Activity PID stayed `23321` on every leg; no activity restart was observed.
- Physical navigation durations: Inicio→Transacciones 3.29–4.15 s; Transacciones→Inicio 3.54–4.22 s. The transaction marker exposed the remote route and data readiness; the pagination sentinel text was present in the XML hierarchy but its bounds were `[0,0][0,0]`, so it was not visible on screen.
- Perfetto trace: `~/.local/tools/fintec-perf/traces/fintec-nav-1790008979681.pftrace`, 213,117,098 bytes, 46.153 s. App layer produced 5,574 frames; 20 `App Deadline Missed` frames (0.359%); mean frame interval 8.276 ms; p95 8.568 ms; max 22.896 ms; 15 intervals exceeded the 16.77 ms 60 Hz threshold. RenderThread scheduler time was 10,633.625 ms and app main thread 8,569.962 ms; no app/thread exits.
- Browser/WebView proxy and physical Perfetto evidence are separate. The physical run supports near-120 Hz cadence with occasional deadline misses; it does not certify perfectly sustained 120 FPS or local-source equivalence.

- Task 2: complete — `/` and `/transactions` now share the stable app provider tree; focused provider tests pass.
- Task 3: complete — valid empty caches are reusable, stale rows survive authoritative refresh, route loading fallbacks are non-blocking, and motion is transform/opacity-only with reduced-motion reset.
- Task 4: complete for the reachable installed APK — focused tests/typecheck/lint/build pass; browser proxy completed 3 iterations/12 legs with 0 main-document reloads and no warm full loader; physical APK completed 3 iterations/12 legs with stable PID and Perfetto frame evidence. The installed remote origin differs from the local unsigned APK, so deployment equivalence remains explicitly unverified.
