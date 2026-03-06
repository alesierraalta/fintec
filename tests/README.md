# Tests README

## Scope

This document defines how Playwright tests are classified and executed after the lane split:

- Default lane: `no-auth`
- Explicit lane: `auth-required`

Use this as the source of truth for lane ownership, tagging, and troubleshooting.

## Lane Contract

### no-auth (default)

- Command: `npm run e2e` (or explicit `npm run e2e:no-auth`)
- Goal: broad UI/regression coverage without login bootstrap
- Setup behavior: no `tests/auth.setup.ts` dependency
- Tag behavior: excludes `@auth-required` tests by default
- Env guardrails: runs with `PLAYWRIGHT_NO_AUTH_SETUP=1` and `FRONTEND_AUTH_BYPASS=1`

### auth-required (explicit)

- Command: `npm run e2e:auth-required`
- Goal: real auth/session smoke validation
- Setup behavior: includes auth setup and storage state
- Tag behavior: includes only `@auth-required` tests
- Env guardrails: bypass must remain disabled

## Tagging and Classification Rules

Use `@auth-required` for any spec that validates one or more of the following:

- Login flow behavior
- Session persistence or renewal
- Authenticated identity assertions
- Features that require real authenticated user context

Keep tests in default `no-auth` lane when they validate:

- General UI flows and navigation
- Frontend protected routes under explicit bypass test context
- API unauthenticated/unauthorized safeguards

If unsure, classify by behavior under test, not by file location.

## Canonical Commands

- Default local lane: `npm run e2e`
- Explicit no-auth lane: `npm run e2e:no-auth`
- Explicit auth lane: `npm run e2e:auth-required`
- CI no-auth lane: `npm run e2e:ci:no-auth`
- CI auth lane: `npm run e2e:ci:auth-required`

Execution guardrails:

- All lane commands run through `scripts/testing/run-playwright-with-guard.mjs` to enforce hard command timeouts and process-tree shutdown.
- Override command timeout with `PLAYWRIGHT_COMMAND_TIMEOUT_MS` when needed.
- Override suite timeout with `PLAYWRIGHT_GLOBAL_TIMEOUT_MS` and server boot timeout with `PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS`.

Selection guard checks:

- No-auth must not select auth tests: `npm run e2e -- --grep "@auth-required"`
- Auth lane must not select non-auth tests: `npm run e2e:auth-required -- --grep-invert "@auth-required"`

Important: use `--grep-invert` (kebab-case), not `--grepInvert`.

## Migration Checklist (move a spec between lanes)

1. Update selector/tag

- Add or remove `@auth-required` in `test.describe`/test titles according to lane intent.

2. Validate command/lane pairing

- For no-auth target: run `npm run e2e -- --project=chromium <spec-path>`.
- For auth-required target: run `npm run e2e:auth-required -- --project=chromium <spec-path>`.

3. Confirm expected auth behavior

- no-auth: no login bootstrap dependency; frontend bypass only where explicitly intended.
- auth-required: real login/session checks execute with auth setup enabled.

4. Map to CI lane

- no-auth specs are covered by `e2e-no-auth` job.
- auth-required specs are covered by `e2e-auth-required` job.

5. Run leakage checks

- `npm run e2e -- --grep "@auth-required"`
- `npm run e2e:auth-required -- --grep-invert "@auth-required"`

## Troubleshooting by Lane

### no-auth lane issues

- Symptom: auth/login bootstrap unexpectedly required.
- Check: ensure spec is not tagged `@auth-required`.
- Check: command path is `npm run e2e` or `npm run e2e:no-auth`.
- Check: lane validator output shows `lane=no-auth bypass=on skipSetup=on`.

### auth-required lane issues

- Symptom: auth setup not running or session assertions invalid.
- Check: spec is tagged `@auth-required`.
- Check: command path is `npm run e2e:auth-required`.
- Check: lane validator output shows `lane=auth-required bypass=off skipSetup=off`.

### grep/selection checks failing noisily

- Symptom: command ends with `No tests found` plus import/env errors from non-Playwright tests.
- Cause: Playwright discovery may still evaluate files under `tests/` that are owned by other runners.
- Action: record the result in change notes and treat as known environment/discovery limitation until test discovery boundaries are tightened.

## Notes

- Keep lane split stable: no-auth is default, auth-required is explicit.
- Do not widen frontend bypass scope beyond non-production testing.
- API authorization checks must remain enforced in all lanes.
