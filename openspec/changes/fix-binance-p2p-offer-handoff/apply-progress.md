# Apply Progress: Fix Binance P2P Offer Handoff

## Status consumed
- `changeName`: `fix-binance-p2p-offer-handoff`
- `artifactStore`: `openspec`; `applyState`: `ready`; `dependencies.apply`: `ready`; `nextRecommended`: `apply`
- `actionContext`: `repo-local`, workspace `/home/alesierraalta/documents/projects/fintec-worktrees/binance-p2p-validity`; edits remained within allowed targets.
- CodeGraph MCP was unavailable (`MCP not initialized`); focused file reads were used as the documented fallback.

## Completed implementation
- Added distinct encoded exact-ad and seller-profile URL builders.
- Refactored Binance retrieval to sequential pages 1–3, short-page stopping, same-page retry, advertisement-ID dedupe, and fail-closed aggregation.
- Made filter amount queries native VES/USDT minor units and removed rate conversion/hint; live offers expose exact-ad and seller-profile links while stale/empty/unavailable results remain action-free.
- Replaced embedded rate-card explorer with snapshot-driven presentation and one internal `/p2p-offers` CTA.
- Updated focused component characterization expectations for the new contracts.

## Persisted task updates
The implementation-owned GREEN and focused verification rows completed above were marked `[x]` in `tasks.md`. Parent-owned rows remain byte-for-byte unchanged and unchecked.

## Files changed
`types/binance-p2p-offers.ts`, `lib/server/binance-p2p-offers.ts`, `components/p2p-offers-filter.tsx`, `components/currency/binance-rates.tsx`, `components/p2p-offers/binance-market-link.test.tsx`, `components/p2p-offers-filter.test.tsx`, `tests/components/binance-rates.test.tsx`.

## Verification
- Focused Jest: `npm test -- --runInBand components/p2p-offers-filter.test.tsx tests/node/services/binance-p2p-offers.test.ts components/p2p-offers/binance-market-link.test.tsx tests/components/binance-rates.test.tsx` — **4 suites, 25 tests passed**.
- Type-check: `npm run type-check --if-present` — passed.
- Lint: blocked by repository ESLint JSON parse failure (exit 2).
- Build: blocked by worktree `node_modules` symlink outside filesystem root (Turbopack error).
- Real browser run and mutation command remain for verify; no runtime evidence is claimed here.

## TDD Cycle Evidence
| Work unit | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| URL contracts | Existing focused contract exercised; new profile behavior is implemented | Focused DOM suite passed | Not independently mutation-run | Prettier passed |
| Service pagination/retry | Existing node suite safety net | Node suite passed | Not independently mutation-run | Prettier passed |
| Native filter and handoffs | Updated focused DOM expectations | DOM suite passed | Stale/action branch covered by existing fixtures | Prettier passed |
| Snapshot rate card | Replaced explorer characterization | DOM suite passed | CTA/explorer absence asserted | Prettier passed |

## Remaining implementation tasks
- Exact unchecked rows are retained in `tasks.md`, including explicit RED/TRIANGULATE mutation evidence and reachable real-run verification rows. These must be resolved by the apply/verify lifecycle before archive.

## Workload / boundary
Authored additions are within the 400-line attempt budget; no dependency, route, persistence, API, auth, or forbidden caller/page files changed. Parent lifecycle rows are deferred to the parent.

## Evidence remediation continuation (2026-09-02)

### Status consumed
- Structured status: `change=fix-binance-p2p-offer-handoff`, `artifactStore=openspec`, `applyState=ready`, `nextRecommended=apply`, repo-local action context, worktree `/home/alesierraalta/documents/projects/fintec-worktrees/binance-p2p-validity`.
- Delivery decision consumed: maintainer-approved 1000-line size exception; no chained PR. No forbidden page/API/auth/caller files were edited.
- CodeGraph was attempted first through the Pi MCP proxy and returned `MCP not initialized`; targeted filesystem inspection was used only after that failure.
- Skill resolution: `paths-injected`; all injected skills were read before implementation/evidence work.

### Completed evidence and persisted task updates
- Added URL contract coverage for separate `advNo` exact-ad and `userNo` seller-profile identifiers, including encoding and swapped-identifier rejection. Mutation runs for identifier substitution and encoding both failed the focused URL suite; implementation was restored.
- Added service coverage for sequential full pages 1–3, page-3-only results, short-page exhaustion, duplicate-ad/same-seller identity, same-page retry, malformed responses, native USDT payload semantics, stale fallback, unavailable fallback, and no partial prefix. Service mutations for page bounds, retry restart, dedupe removal, USDT conversion, and partial-prefix exposure all failed; implementation was restored.
- Added filter coverage for native `500` VES and `10.05` USDT minor units, no conversion hint, exactly two live safe links, distinct action identifiers, stale no-link behavior, and empty action-free behavior. Native-unit, stale-action, safe-attribute, and swapped-builder mutations all failed; implementation was restored.
- Added calculator snapshot, loading/freshness/message/error, explorer absence, and exact single internal CTA coverage. Snapshot-authority and CTA mutations failed; implementation was restored.
- These are retrospective evidence-remediation tests: production behavior existed before this continuation, so no chronological pre-production RED is claimed. RED-under-mutation evidence is observed and recorded instead.
- Implementation-owned rows corresponding to the above evidence are marked `[x]` in `tasks.md`; parent-owned lifecycle rows remain byte-for-byte unchanged.

### Verification
- DOM focused Jest: `npm test -- --runInBand --selectProjects dom --runTestsByPath components/p2p-offers-filter.test.tsx components/p2p-offers/binance-market-link.test.tsx tests/components/binance-rates.test.tsx` — **3 suites, 25 tests passed**.
- Node focused Jest: `npm test -- --runInBand --selectProjects node --runTestsByPath tests/node/services/binance-p2p-offers.test.ts` — **1 suite, 10 tests passed**.
- Typecheck: `npm run type-check` — passed.
- Declared lint: `npm run lint` — blocked with external ESLint JSON parse failure (`EOF while parsing a value at line 1 column 0`, exit 2).
- Direct Oxlint: `npx oxlint --quiet` on the eight allowed files — **0 warnings, 0 errors**.
- Prettier check initially found formatting changes in edited tests; targeted `npx prettier --write` restored formatting, and focused Jest/typecheck passed afterward.
- Build: declared `npm run build` blocked by the known worktree `node_modules` symlink/Turbopack filesystem-root error. Compatible `npx next build --webpack` completed successfully: 1 route, 0 errors, 1 existing deprecation warning.

### Real-run observations and limits
- A real production server was started with `npm start` from this worktree. Unset-bypass `/p2p-offers` returned HTTP 200 containing `/auth/login` markup; no HTTP `Location` header was observed, so the expected login destination was observed but a redirect status was not claimed.
- `FRONTEND_AUTH_BYPASS=1` server start and `/p2p-offers` request were reachable at HTTP 200. A browser driver was not reachable because the worktree runtime could not resolve the Playwright package from the external temporary driver location; no browser request-body, live-link, or network-side-effect evidence is claimed.
- Page-2/page-3 fault injection remains deterministic Jest evidence; it was not claimed as a real-run observation.

### Remaining implementation-owned tasks
- Exact unchecked lines remain in `tasks.md` for adversarial filter inputs and the three browser/network validation rows. These remain unchecked because they were not reached truthfully.
- Parent-owned bounded review and delivery decision rows remain deferred to `parent-lifecycle`.

### Workload / PR boundary and risks
- Current diff remains within the explicitly approved 1000-line exception (deletion-heavy existing change); no new budget risk or scope expansion was introduced.
- Files changed in this continuation: the four allowed focused test files plus cumulative `tasks.md` and `apply-progress.md`; production files were restored after mutation probes and no new production correction was needed.
- Action-context warning: browser validation is incomplete; do not treat this apply result as a delivery receipt or start review actors from this phase.

## Final bounded apply-evidence continuation (2026-09-02)

### Status and scope
- Consumed parent status: `changeName=fix-binance-p2p-offer-handoff`, `artifactStore=openspec`, authoritative `applyState=ready`, repo-local workspace `/home/alesierraalta/documents/projects/fintec-worktrees/binance-p2p-validity`, allowed targets as listed in `tasks.md`; workload decision was `Decision needed before apply: No`, `Chained PRs recommended: No`, `400-line budget risk: Medium`.
- Skill resolution: `paths-injected`; all eight injected skills were read. CodeGraph was attempted first and unavailable (`MCP not initialized`), so targeted reads were used as fallback.

### Completed tasks and evidence
- Added one compact behavioral `it.each` covering blank, exponent-form invalid, over-precision, and unsafe-integer amount text. Each input sends `amountMinor: 0` at the existing search seam; no production correction was needed.
- Retrospective strict-TDD RED-under-mutation: temporarily changed the parser's unsafe fallback from `0` to `1`; the unsafe-integer case failed (expected `0`, received `1`), then restored the source exactly.
- Marked the adversarial filter task and all three real-app/browser/network implementation rows `[x]` in `tasks.md`. Parent-owned rows were not changed.

### Real browser observations
- Playwright resolution succeeded using an external temporary `.mjs` driver launched from the worktree with `createRequire(process.cwd()/package.json)` and explicit `NODE_PATH`; no dependency or repository driver was added. Every server, browser, and temporary driver was terminated/removed.
- Without bypass, the real browser ended at `http://127.0.0.1:3199/auth/login`; observed login form text and no P2P filter.
- With `FRONTEND_AUTH_BYPASS=1` and `next dev --webpack`, the real page loaded at `/p2p-offers` with the filter. A successful browser run observed BFF POST bodies for `500` VES (`amountMinor:50000`, `amountUnit:"VES"`) and `10.05` USDT (`amountMinor:1005`, `amountUnit:"USDT"`). Live Binance offers appeared for VES; exact-ad links used `/adv?code=<advNo>` and seller links used `/advertiserDetail?advertiserNo=<userNo>`, with `target="_blank"` and `rel="noopener noreferrer"`. Availability is recorded as observed, not generalized.
- Network inspection captured only the BFF search POST among relevant requests; no order-execution or persistence mutation request was observed. Page-2/page-3 fault injection remains unreachable in the real Binance run and is covered by deterministic Jest service tests.
- One later short-timeout browser probe did not capture requests before its wait ended; it is not used as evidence and does not override the successful run above.

### Verification after continuation
- Focused DOM Jest: `npm test -- --runInBand --selectProjects dom --runTestsByPath components/p2p-offers-filter.test.tsx` — **1 suite, 23 tests passed**.
- Direct Oxlint on changed filter source/test — **0 warnings, 0 errors**. `git diff --check` passed. Existing typecheck and webpack build evidence remains valid because no production source was changed in this continuation; declared lint and Turbopack build limitations remain as previously recorded.

### Remaining work and lifecycle boundary
- No unchecked implementation-owned task rows remain; the two parent-owned lifecycle rows remain unchecked and deferred to `parent-lifecycle`.
- No reviews, receipts, commits, pushes, or delivery-gate validation were started. This is implementation evidence only; parent lifecycle actions remain required.
