# Tasks: Environment-Driven Android Server Target

## 1. Tests first (RED)

- [x] 1.1 Write `tests/node/mobile/server-target.test.ts` covering REQ-1 through REQ-4:
      precedence (both set / only `CAP_SERVER_URL` / only `NEXT_PUBLIC_APP_URL` / neither),
      whitespace-only treated as absent, trailing-slash normalization, rejection of
      non-URLs and non-`http(s)` protocols, error messages naming the offending variable
      and value, cleartext derivation for `http:` and `https:`. 14 cases.
- [x] 1.2 Run the node Jest project and confirm the suite fails for the right reason
      (module not found), not a harness error. Confirmed: `createNoMappedModuleFoundError`
      on `@/lib/mobile/server-target`.

## 2. Resolver implementation (GREEN)

- [x] 2.1 Create `lib/mobile/server-target.ts` exporting `resolveCapacitorServerTarget`
      and its result type. Pure, no `process.env` access, no Capacitor imports.
- [x] 2.2 Run the node Jest project until green. 14/14 passing.

## 3. Capacitor composition root

- [x] 3.1 Rewrite `capacitor.config.ts` to spread the resolver result into `server`,
      removing the hardcoded origin and the standalone `cleartext` literal. Leave appId,
      appName, webDir, plugins, ios, and android untouched.
- [x] 3.2 Confirm `npm run type-check` passes. Required adding an index signature to
      `CapacitorServerEnv`: without it TS2559 fires, because an all-optional interface is
      a weak type and `ProcessEnv` shares no declared property with it.

## 4. Per-variant cleartext permission

- [x] 4.1 Remove `android:usesCleartextTraffic="true"` from
      `android/app/src/main/AndroidManifest.xml`.
- [x] 4.2 Create `android/app/src/debug/AndroidManifest.xml` declaring the attribute for
      the debug variant only, with `tools:replace` so a library manifest declaring the
      opposite value cannot fail the merge.

## 5. Developer workflows and documentation

- [x] 5.1 Add the `android:dev` live-reload script to `package.json`. **Deviation from the
      proposal:** no `mobile:sync` script was added — it would have been byte-identical to
      the existing `build:mobile`, which is exactly the redundancy this change is meant to
      avoid. `build:mobile` is the production sync path.
- [x] 5.2 Document `CAP_SERVER_URL` and `NEXT_PUBLIC_APP_URL`. **Deviation:** `.env.example`
      could not be edited — the environment denies read and write access to `.env*` files.
      Documented in `docs/mobile/android-server-target.md` instead, with a copy-paste block
      for `.env.local`. Adding the two lines to `.env.example` remains an open manual step.

## 6. Real-run verification (reproduce the environment)

- [x] 6.1 `NEXT_PUBLIC_APP_URL=https://fintec.vercel.app npx cap copy android` →
      generated `capacitor.config.json` contains
      `"server": {"url": "https://fintec.vercel.app", "cleartext": false}`.
- [x] 6.2 `CAP_SERVER_URL=http://10.0.2.2:3000` (with `NEXT_PUBLIC_APP_URL` also set) →
      `"server": {"url": "http://10.0.2.2:3000", "cleartext": true}`. Override precedence
      confirmed against the real CLI, not just the unit test.
- [x] 6.3 Neither variable set → `cap copy` aborts with
      `[error] Parsing capacitor.config.ts failed.` followed by the resolver's message
      naming both variables. Fail-loud behavior confirmed end to end.
- [ ] 6.4 **NOT VERIFIED.** Merged-manifest inspection requires Gradle, which requires a
      JDK and the Android SDK; neither is present in this environment (`java: command not
      found`, no `android/local.properties`). The debug/release split is therefore
      unverified by execution and rests on documented Gradle manifest-merger semantics.
      Must be checked on a machine with the Android toolchain before a release build.

## 7. Gates

- [x] 7.1 `npm run type-check` — clean.
- [x] 7.2 `npm run lint` — 0 errors (354 pre-existing warnings, unchanged).
- [x] 7.3 `npm test` — 1483 passed, 1 failed. The failure is
      `tests/node/api/binance-p2p-offers-route.test.ts`, proven pre-existing by stashing
      this change and re-running it at the base commit, where it fails identically. Its
      expectation was not updated when `amountUnit`, `minCompletionRateBps`, and
      `minOrderCount` were added in `9c94ef4`. Untouched by this change.
- [x] 7.4 Self PR review of the full diff before hand-off.
