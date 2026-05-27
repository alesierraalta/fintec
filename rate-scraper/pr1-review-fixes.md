# PR1 Review Fixes

## Status

Applied two accepted test-only coverage fixes.

## Changed files

- `tests/node/rates/freshness-policy.test.ts`
- `tests/node/rates/rate-usability-policy.test.ts`
- `rate-scraper/pr1-review-fixes.md`

## Validation

- Worker-reported run: `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts` — exit 0; 3 suites passed, 8 tests passed.
- Parent verification found `tests/node/rates/rate-usability-policy.test.ts` empty after this handoff, restored the file, then reran focused tests: 3 suites, 9 tests passed.
- `npm run type-check` — parent rerun after repair; exit 0.

## Budget

Budget remains under 400 changed lines.
