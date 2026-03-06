# Verification Notes: fix-transactions-query-400

## Automated Checks Run

| Command                                                                                                                                                                                                                                                            | Result               | Notes                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- tests/node/repositories/transactions-ownership-scope.test.ts tests/node/repositories/transfers-ownership-scope.test.ts tests/node/lib/subscriptions-usage.test.ts tests/app/route-aware-providers.test.tsx tests/components/fintec-logo.test.tsx` | PASS                 | 5 suites / 12 tests passed; expected fallback error log from `getUserUsage` failure-path test observed.                       |
| `npm run type-check`                                                                                                                                                                                                                                               | PASS                 | No TypeScript type errors.                                                                                                    |
| `npm run lint`                                                                                                                                                                                                                                                     | PASS (warnings only) | `oxlint` reported warnings but no blocking errors.                                                                            |
| `npm run build`                                                                                                                                                                                                                                                    | PASS                 | Next.js production build completed successfully.                                                                              |
| `npx cross-env PLAYWRIGHT_LANE=no-auth PLAYWRIGHT_NO_AUTH_SETUP=1 FRONTEND_AUTH_BYPASS=1 playwright test tests/e2e/logo-motion-console-verification.spec.ts --project=chromium --reporter=line`                                                                    | PASS                 | Landing + waitlist console capture showed no relevant `/finteclogodark.jpg` width-height mismatch or reduced-motion warnings. |

## Authenticated Runtime Verification Attempts

| Command                                                                                     | Result         | Notes                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run e2e:auth-required -- tests/26-recent-transactions-display.spec.ts --reporter=line` | BLOCKED        | Tests stayed on `/auth/login`; authenticated storage state was not established in this run, so `/rest/v1/transactions` 400 regression could not be conclusively verified. |
| `npm run e2e:no-auth -- tests/e2e/auth-bypass-protected-routes.spec.ts --project=chromium`  | FAIL (context) | `/transactions` navigation returned `net::ERR_ABORTED` in no-auth bypass lane; does not satisfy authenticated flow verification and needs separate follow-up.             |

## Deferred Manual Checks

- Authenticated staging/browser run validating that the primary `useOptimizedData` transactions path no longer triggers `/rest/v1/transactions` 400 responses.
- Console capture for authenticated app-shell surfaces (`sidebar` and `header`) to confirm no `/finteclogodark.jpg` dimension warnings and no reduced-motion noise regressions.
