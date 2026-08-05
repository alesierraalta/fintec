# Design: Environment-Driven Android Server Target

## Context

The native shell owns no UI. `capacitor.config.ts` sets `webDir: 'public'` purely as a
placeholder; the WebView loads everything from `server.url`. That single string therefore
decides whether an installed APK shows the production app, a teammate's laptop, or
nothing at all. It currently lives as a literal in tracked source.

Static export is not an available escape hatch: the app ships 35 route handlers under
`app/**/route.ts`, a root `middleware.ts`, and `experimental.serverActions`. Remote-origin
loading is the only viable model, which makes "resolve the origin correctly" the core
concern rather than an incidental build detail.

## Decision 1 — A pure resolver module, not inline config logic

Put the resolution in `lib/mobile/server-target.ts` as a pure function over an injected
environment record, and let `capacitor.config.ts` be a thin composition root.

**Why not inline `process.env` reads in `capacitor.config.ts`:** that file is loaded by the
Capacitor CLI through its own TypeScript pipeline. Logic living there is effectively
untestable — exercising it would mean shelling out to `cap`, which is slow, and which
couples a unit-level contract to native tooling. Extracting the decision into a pure
function makes precedence, validation, and cleartext derivation assertable in the existing
Jest `node` project in milliseconds.

**Why dependency injection of `env` rather than reading `process.env` inside:** tests that
mutate `process.env` leak state across cases and force `beforeEach`/`afterEach` bookkeeping.
A parameter makes each case a single expression with no shared mutable state.

This is the layering the request asked for: the policy (which origin, is it plaintext)
sits in a testable module with no framework dependency; the adapter (`capacitor.config.ts`)
only wires it. A change to the policy touches one file whose behavior is pinned by tests.

## Decision 2 — Derive `cleartext`, never configure it

`cleartext` is a function of the URL protocol, so it is computed, not declared.

The alternative — a separate `CAP_CLEARTEXT` variable — reintroduces exactly the bug this
change exists to remove: two knobs that can disagree, where the disagreement (HTTPS origin
plus cleartext allowance) is silent and only harmful in production. Making it derived
deletes the invalid state rather than documenting it.

## Decision 3 — `CAP_SERVER_URL` overrides, `NEXT_PUBLIC_APP_URL` is the base

`NEXT_PUBLIC_APP_URL` is already the project's name for "where this app is deployed"
(`app/layout.tsx:14`, `app/robots.ts:4`, `app/sitemap.ts:4`, `app/page.tsx:24`,
`contexts/auth-context.tsx:547`). Introducing a parallel `CAP_PROD_URL` would create a
second source of truth for the same fact and guarantee eventual drift.

`CAP_SERVER_URL` exists only because the native shell has a need the web app does not: on a
device or emulator, "the app" is a machine on the LAN, not the deployed origin. It is an
override for that case, which is why it takes precedence when present.

**Why fail instead of defaulting** when neither is set: a default would let a
misconfigured environment produce a working `cap sync` that silently ships the wrong
origin. That failure surfaces on a user's phone. A throw surfaces it at the developer's
terminal, with the variable names in the message.

## Decision 4 — Debug-only cleartext via manifest merging

`android:usesCleartextTraffic="true"` moves from `android/app/src/main/AndroidManifest.xml`
to a new `android/app/src/debug/AndroidManifest.xml`. Gradle's manifest merger applies
source-set manifests per variant, so debug builds keep plaintext reachability for
`http://10.0.2.2:3000` while release builds inherit the platform default of denying it.

**Why not a network security config XML:** it is the more expressive tool (per-domain
rules), but it is also more surface area for a requirement that is exactly "plaintext in
debug, never in release". The source-set manifest expresses that in one attribute in one
file, and it is the mechanism Gradle already applies. If per-domain rules are ever needed,
the network security config can be added later without undoing this.

**Why not leave it as-is:** the attribute currently applies to release builds too, meaning
a shipped APK permits plaintext HTTP to any host. That is a real weakening of transport
security in production, unrelated to the dev convenience that motivated it.

## Decision 5 — Two scripts, matching the two real workflows

- `mobile:sync` — build the web app and `cap sync`, resolving the origin from the
  environment. This is the production path; the resulting APK then tracks every subsequent
  web deploy with no rebuild, which is the "updates constantly" requirement.
- `android:dev` — `cap run android --live-reload` against `CAP_SERVER_URL`. This is the
  inner development loop.

The existing `build:mobile` script already does build-then-sync; it is kept and the new
scripts are layered next to it rather than replacing it, so no current invocation breaks.

## Testing Strategy

Strict TDD. The resolver's tests are written first and must fail before implementation.

- Unit (`tests/node/mobile/server-target.test.ts`): precedence with both/either/neither
  variable set, whitespace-only treated as absent, trailing-slash normalization,
  rejection of non-URLs and of non-`http(s)` protocols, error messages naming the
  offending variable and value, and cleartext derivation for both protocols.
- Real-run verification (not asserts alone): execute `cap sync` under both environment
  shapes and read the generated
  `android/app/src/main/assets/capacitor.config.json` to confirm the values the native
  layer actually receives.
- Manifest verification: inspect the merged debug and release manifests produced by
  Gradle rather than assuming merge semantics.

## Alternatives Considered

- **Bundled assets plus an OTA/live-update channel (Capgo or equivalent).** Rejected:
  requires a static bundle, which the SSR/route-handler surface forbids. It would mean
  maintaining a second, divergent rendering path.
- **Hybrid offline shell.** Rejected for now: better cold start and network tolerance, but
  it creates two sources of truth for the UI and a synchronization problem with SSR. High
  cost for the current stage; nothing here blocks adopting it later.
- **Committing separate config files per environment** (`capacitor.config.dev.ts` etc.).
  Rejected: duplicates the entire plugin block across files, so every plugin change must be
  applied N times — exactly the redundancy this change is meant to avoid.
