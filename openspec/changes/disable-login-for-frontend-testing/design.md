# Design: Disable Login for Frontend Testing

## Technical Approach

Implement a narrowly scoped frontend auth-bypass decision used only by server-rendered protected pages that call `requireAuthenticatedUser()`.

The bypass decision is centralized in a small helper that evaluates both runtime and explicit flag state. `requireAuthenticatedUser()` continues to validate Supabase user state, but skips redirect only when bypass is allowed. API auth codepaths are not modified.

This design implements the UI delta requirements for: explicit non-production opt-in, production fail-closed behavior, and backend auth integrity.

## Architecture Decisions

### Decision: Keep Bypass Decision In A Dedicated Helper

**Choice**: Create `lib/auth/is-frontend-auth-bypass-enabled.ts` that returns a boolean based on strict environment checks.
**Alternatives considered**: Inline env checks directly inside `app/_lib/require-authenticated-user.ts`.
**Rationale**: A dedicated helper prevents duplicated checks and reduces risk of inconsistent logic across guards.

### Decision: Apply Bypass Only In Server Page Guard

**Choice**: Modify `app/_lib/require-authenticated-user.ts` as the sole bypass integration point for protected page redirects.
**Alternatives considered**: Add bypass logic to `contexts/auth-context.tsx` and `components/auth/auth-guard.tsx`.
**Rationale**: Existing protected pages already depend on `requireAuthenticatedUser()`. Keeping the bypass server-side avoids changing client auth state semantics.

### Decision: Couple Playwright No-Auth Flow To Explicit Frontend Bypass Flag

**Choice**: Keep `PLAYWRIGHT_NO_AUTH_SETUP` and add the frontend bypass flag in the no-auth E2E command/config path.
**Alternatives considered**: Keep Playwright setup skip only (no app bypass), or bypass via test-only route rewrites.
**Rationale**: Setup skip alone does not unblock protected pages. Route rewrites add complexity and divergence from real navigation.

## Data Flow

Unauthenticated request to protected page:

    Request -> Server page (app/*/page.tsx)
           -> requireAuthenticatedUser()
           -> createClient().auth.getUser()
                  |
                  +-- user present ----> return user -> page renders
                  |
                  +-- no user/error -> isFrontendAuthBypassEnabled()
                                      |
                                      +-- true  -> return null-ish bypass token path -> page renders
                                      +-- false -> redirect('/auth/login')

No API flow changes:

    Request -> app/api/* -> existing auth checks -> unauthorized as before

## File Changes

| File                                                     | Action | Description                                                                             |
| -------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `lib/auth/is-frontend-auth-bypass-enabled.ts`            | Create | Central helper for strict non-production + explicit flag bypass decision.               |
| `app/_lib/require-authenticated-user.ts`                 | Modify | Add bypass branch after unauthenticated check; preserve redirect default.               |
| `playwright.config.ts`                                   | Modify | Keep setup toggle and align no-auth runs with frontend bypass env flag expectations.    |
| `package.json`                                           | Modify | Update `e2e:no-auth` script to include frontend bypass env flag.                        |
| `tests/node/app/_lib/require-authenticated-user.test.ts` | Create | Unit tests for default, bypass-enabled, and production fail-closed behavior.            |
| `tests/e2e/auth-bypass-protected-routes.spec.ts`         | Create | E2E validation that protected pages open in no-auth mode but API auth remains enforced. |

## Interfaces / Contracts

```ts
// lib/auth/is-frontend-auth-bypass-enabled.ts
export function isFrontendAuthBypassEnabled(options?: {
  nodeEnv?: string;
  bypassFlag?: string;
}): boolean;
```

Behavioral contract:

- Returns `true` only when `nodeEnv` is not `production` and bypass flag is truthy (`1`, `true`, `yes`).
- Returns `false` for all other cases, including malformed/empty values.

Optional environment contract:

- `FRONTEND_AUTH_BYPASS` (string, optional): explicit opt-in for local/test frontend route bypass.

## Testing Strategy

| Layer       | What to Test                                             | Approach                                                                                                                       |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | Bypass decision helper truth table                       | Jest node tests for env combinations (dev/test/prod x truthy/falsy values).                                                    |
| Unit        | `requireAuthenticatedUser()` redirect vs bypass behavior | Mock `createClient()` and `redirect()` to assert branch behavior and call expectations.                                        |
| Integration | No-auth Playwright command wiring                        | Verify no-auth script runs with both setup skip and frontend bypass flag.                                                      |
| E2E         | Protected route access and API auth integrity            | Playwright: unauthenticated no-auth run can load `/` and `/transactions`, while auth-protected API still returns unauthorized. |

## Migration / Rollout

No migration required.

Rollout:

1. Land helper + guarded server page bypass.
2. Update E2E no-auth command/config wiring.
3. Add unit/E2E assertions before using bypass in daily testing workflows.

## Open Questions

- [ ] None.
