# Proposal: Environment-Driven Android Server Target

## Intent

The Android shell is a Capacitor WebView that loads the FinTec web app from a remote
server (static export is impossible: 35 route handlers under `app/**/route.ts`,
`middleware.ts`, and `experimental.serverActions` in `next.config.js`).

Today `capacitor.config.ts` hardcodes `http://10.0.2.2:3000` — an emulator-only
development address — and `AndroidManifest.xml` enables `usesCleartextTraffic` for every
build variant. Consequences:

1. Any APK produced from the repository as-is points at a developer machine, so a
   release build is dead on arrival.
2. Switching between local development and the deployed app requires hand-editing a
   tracked source file, which is a recurring source of accidental commits.
3. Release builds ship a global plaintext-HTTP allowance.

This change makes the server target a resolved, validated, environment-driven value, so
the production APK automatically reflects every web deploy without a rebuild, and local
development gets a first-class live-reload path.

## Scope

### In Scope

- A pure, dependency-free resolver module that derives the Capacitor server target from
  environment variables, with explicit precedence, URL validation, and derived
  `cleartext` (never inferred by hand).
- `capacitor.config.ts` consuming that resolver instead of literal values.
- Restricting `usesCleartextTraffic` to the Android `debug` source set via manifest
  merging, so release builds carry no plaintext allowance.
- npm scripts for the two real workflows: sync against the deployed URL, and run with
  live reload against the local dev server.
- Unit tests covering the resolver contract (precedence, validation, cleartext
  derivation, failure modes) ahead of the implementation.
- Documenting the environment variables in `.env.example`.

### Out of Scope

- Bundling web assets for offline use or any OTA/live-update layer.
- CI APK build pipeline and release signing.
- iOS-specific behavior beyond what the shared resolver already provides.
- `versionCode` / `versionName` automation.
- Any change to application routes, data access, or UI.

## Approach

Introduce one seam — a single source of truth for "which origin does the native shell
load" — and let every consumer read through it.

- `lib/mobile/server-target.ts` exports `resolveCapacitorServerTarget(env)`: a pure
  function taking an environment record and returning a validated
  `{ url, cleartext }` descriptor, or throwing a typed error with an actionable message.
  It imports nothing from Capacitor, so it is unit-testable in the existing Jest `node`
  project and cannot drag native tooling into the test graph.
- Precedence, most specific first:
  1. `CAP_SERVER_URL` — explicit override for local device/emulator development.
  2. `NEXT_PUBLIC_APP_URL` — the deployed origin, already the established convention in
     `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, and `contexts/auth-context.tsx`.
  3. Fail with a typed error naming both variables.
- `cleartext` is derived from the resolved URL protocol (`http:` → `true`,
  `https:` → `false`). It is never an independent knob, which removes the class of bug
  where a production HTTPS target still ships a plaintext allowance.
- `capacitor.config.ts` becomes a thin composition root: it calls the resolver and
  spreads the result into `server`. All other plugin configuration is untouched.
- `usesCleartextTraffic` moves out of the main manifest into
  `android/app/src/debug/AndroidManifest.xml`. Gradle manifest merging applies it to
  debug builds only; release builds inherit the platform default (cleartext denied).

This keeps the blast radius to one module: changing how the target is resolved touches
one file with pinned tests, and a mistake there fails loudly at config load rather than
silently shipping the wrong origin.

## Affected Areas

- New: `lib/mobile/server-target.ts`
- New: `tests/node/mobile/server-target.test.ts`
- New: `android/app/src/debug/AndroidManifest.xml`
- Modified: `capacitor.config.ts`
- Modified: `android/app/src/main/AndroidManifest.xml`
- Modified: `package.json` (scripts)
- Modified: `.env.example`

## Risks

- **Misconfigured environment breaks `cap sync`.** Mitigated by failing fast with a
  message that names the missing variables and the expected format, instead of falling
  back to a silent default.
- **Manifest merging behavior.** Debug-only cleartext relies on Gradle merging the debug
  source set. Verified by reading the merged manifest for both variants rather than
  assuming.
- **Existing local workflows.** Anyone currently relying on the hardcoded
  `10.0.2.2:3000` must set `CAP_SERVER_URL`. Documented in `.env.example` and surfaced by
  the resolver's error message.

## Rollback Plan

Revert the change commit. `capacitor.config.ts` returns to literal values and the
manifest regains its global cleartext attribute; no data, schema, or runtime state is
involved.

## Dependencies

- `NEXT_PUBLIC_APP_URL` must be present in the environment used to run `cap sync` for a
  production-targeted build.
- Existing Jest `node` project for the resolver unit tests.

## Success Criteria

- `resolveCapacitorServerTarget` is covered by unit tests that pin precedence,
  validation, cleartext derivation, and error messaging, written before implementation.
- Running `cap sync` with only `NEXT_PUBLIC_APP_URL` set produces an
  `android/app/src/main/assets/capacitor.config.json` whose `server.url` is the deployed
  HTTPS origin and whose `server.cleartext` is `false`.
- Running with `CAP_SERVER_URL` set to a local `http://` origin produces that origin with
  `cleartext: true`.
- The merged release manifest contains no `usesCleartextTraffic="true"`; the merged debug
  manifest does.
- `npm run type-check`, `npm run lint`, and the Jest suite pass.
