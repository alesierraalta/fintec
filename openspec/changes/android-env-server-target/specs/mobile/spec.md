# Android Server Target Specification

## Overview

Defines how the Capacitor native shell determines which remote origin it loads, and how
plaintext HTTP is permitted per build variant. The shell has no bundled web assets; the
resolved origin is the entire application surface, so this contract is load-bearing.

## Requirements

### REQ-1 — Resolver contract

- The system SHALL expose a pure function `resolveCapacitorServerTarget(env)` that accepts
  an environment record and returns `{ url: string; cleartext: boolean }`.
- The function MUST NOT read `process.env` directly, MUST NOT perform I/O, and MUST NOT
  import Capacitor packages, so it remains unit-testable in a Node environment.
- The returned `url` MUST be the resolved origin with any trailing slash removed.

### REQ-2 — Precedence

- When `CAP_SERVER_URL` is present and non-empty, the resolver SHALL use it.
- Otherwise, when `NEXT_PUBLIC_APP_URL` is present and non-empty, the resolver SHALL use it.
- When neither is present or both are empty/whitespace-only, the resolver SHALL throw an
  error whose message names both `CAP_SERVER_URL` and `NEXT_PUBLIC_APP_URL`.

### REQ-3 — Validation

- The resolver SHALL reject a value that is not a parseable absolute URL.
- The resolver SHALL reject any protocol other than `http:` or `https:`.
- Rejection MUST throw an error whose message includes the offending variable name and the
  offending value, so a misconfiguration is diagnosable from the failure alone.

### REQ-4 — Cleartext derivation

- `cleartext` SHALL be derived solely from the resolved URL protocol: `true` for `http:`,
  `false` for `https:`.
- `cleartext` MUST NOT be independently configurable, so an HTTPS production target can
  never ship a plaintext allowance.

### REQ-5 — Capacitor configuration composition

- `capacitor.config.ts` SHALL obtain `server.url` and `server.cleartext` exclusively from
  `resolveCapacitorServerTarget`.
- `capacitor.config.ts` MUST NOT contain a hardcoded origin literal.
- All other Capacitor configuration (appId, appName, webDir, plugins, ios, android) MUST
  remain behaviorally unchanged.

### REQ-6 — Per-variant cleartext permission

- The main Android manifest SHALL declare `android:usesCleartextTraffic="false"` with
  `tools:replace="android:usesCleartextTraffic"`. An explicit override is required because
  the generated `:capacitor-cordova-android-plugins` library manifest declares the
  attribute as `true`; omitting it lets the library value win the merge.
- A debug-variant manifest SHALL override `android:usesCleartextTraffic` to `true` so
  local HTTP development targets remain reachable.
- The merged release manifest MUST resolve `android:usesCleartextTraffic` to `false`.
- This MUST be verified by running the Gradle manifest merger for both variants and
  reading the merged output, not by reasoning about merge precedence.

### REQ-7 — Developer workflows

- The project SHALL provide an npm script that builds the web app and syncs the native
  projects against the resolved production origin. The existing `build:mobile` satisfies
  this; no duplicate script SHALL be introduced.
- The project SHALL provide an npm script that runs the Android app with live reload
  against a locally resolved `CAP_SERVER_URL`.
- Project documentation SHALL describe both `CAP_SERVER_URL` and `NEXT_PUBLIC_APP_URL`,
  including the emulator loopback address `http://10.0.2.2:3000`, their precedence, and
  the fail-loud behavior when neither is set.

## Scenarios

### Scenario 1: Production sync with only the deployed origin configured

* **Given** `NEXT_PUBLIC_APP_URL` is `https://fintec.vercel.app` and `CAP_SERVER_URL` is unset
* **When** the Capacitor configuration is loaded
* **Then** `server.url` MUST be `https://fintec.vercel.app`
* **And** `server.cleartext` MUST be `false`

### Scenario 2: Local development override

* **Given** `CAP_SERVER_URL` is `http://10.0.2.2:3000` and `NEXT_PUBLIC_APP_URL` is `https://fintec.vercel.app`
* **When** the Capacitor configuration is loaded
* **Then** `server.url` MUST be `http://10.0.2.2:3000`
* **And** `server.cleartext` MUST be `true`

### Scenario 3: Trailing slash normalization

* **Given** the resolved value is `https://fintec.vercel.app/`
* **When** the resolver runs
* **Then** `server.url` MUST be `https://fintec.vercel.app`

### Scenario 4: Missing configuration fails loudly

* **Given** neither `CAP_SERVER_URL` nor `NEXT_PUBLIC_APP_URL` is set
* **When** the resolver runs
* **Then** it MUST throw
* **And** the error message MUST name both variables

### Scenario 5: Invalid or unsupported value is rejected

* **Given** `CAP_SERVER_URL` is `not-a-url`, or `ftp://example.com`, or `10.0.2.2:3000`
* **When** the resolver runs
* **Then** it MUST throw
* **And** the error message MUST include `CAP_SERVER_URL` and the offending value

### Scenario 6: Release build denies cleartext

* **Given** the Android release variant is assembled
* **When** its merged manifest is inspected
* **Then** it MUST NOT contain `android:usesCleartextTraffic="true"`
* **And** the merged debug manifest MUST contain it
