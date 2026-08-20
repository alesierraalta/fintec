# Tasks: Feedback & In-App Notifications ("¿Esto te ha servido?")

Change: `feedback-notifications-inapp` · Worktree: `feat/feedback-notifications-inapp`
Mode: openspec+híbrido (engram + tasks.md) · TDD: strict_tdd · Delivery: auto-chain · Chain: pending

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (committed) | ~903 |
| Estimated changed lines (authored, excl. gitignored e2e) | ~1023 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 T1 → PR2 T2 → PR3 T3 → PR4 T4 → PR5 T5 → PR6 T6 |
| Delivery strategy | auto-chain |
| Decision needed before apply | No |
| Chain strategy | pending |
| Per-slice review budget | each slice <400 ln (see Suggested Work Units) |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

### Suggested Work Units (reviewable slices, <400 ln each)

| Unit | Goal | Likely PR | Focused test command | Runtime harness (real-run) | Rollback boundary |
|------|------|-----------|----------------------|----------------------------|-------------------|
| T1 | feedbacks schema + typed `Database` | PR1 | `npm run type-check` (0 err) | `supabase db push` dry-run + baseline diff | migration file + types.ts block (git revert) |
| T2 | FeedbacksRepository (RED→GREEN) | PR2 | `npx tsx tests/node/repositories/feedbacks-rls.test.ts` → pass | real Supabase: A inserts, B sees nothing, dup→23505 | contracts+2 impls+3 index files+types/feedback.ts |
| T3 | `POST /api/feedback` | PR3 | `npm run type-check` + curl 401/400/201 | `next dev` + curl: valid→201 receipt; spoof user_id→ignored; 23505→200 | app/api/feedback/route.ts + 1 schema block |
| T4 | Bell + polling + provider | PR4 | `npm run type-check`; manual bell mount | `next dev`: seed notif → badge + sonner toast on poll | route-aware-providers.tsx + notification-bell.tsx + layout mount |
| T5 | FeedbackPrompt | PR5 | `npm run type-check`; manual render | `next dev`: thumb→comment→POST→reload hides | components/feedback/feedback-prompt.tsx |
| T6 | Real-run e2e + gitignore | PR6 | `npx playwright test testLocales/feedback-notifications.e2e.ts` (local) | Playwright vs real dev Supabase | `.gitignore` line + testLocales/ (gitignored, no prod impact) |

## Implementation Order

T1 (schema+types) → T2 (domain+repo, RED before GREEN) → T3 (API) → T4 (bell wiring) → T5 (prompt) → T6 (real-run e2e + evidence).
Rationale: schema precedes repo; repo precedes API; `QueryClientProvider` (T4.1) precedes bell; API+bell precede prompt validation; e2e is the integration gate. Each slice is independently revertable.

## Strict TDD note

`strict_tdd` is honored by the RED anchor **T2.0** (behavioral RLS test written BEFORE the impl) and **T2.6** (GREEN verify). The committed behavioral test lives with the repo unit it proves (work-unit-commits: tests-with-code). T6 adds only the gitignored e2e bombardeo + real-run evidence — no second copy of the behavioral test.

---

## T1 — Database + Types (Foundation)  [slice 1 · PR1]

- [x] 1.1 Create `supabase/migrations/20260820143000_add_feedbacks.sql` (table + `idx_feedbacks_user_created` + 4 RLS policies) per design §Database Design. — est ~50 ln — deps: none — done: REQ-DB-01/02/03 (table, unique, RLS, index) — no-excess: schema-only.
- [x] 1.2 Mirror `feedbacks` DDL + RLS in `supabase/schemas/baseline.sql` after the `notifications` block (table ~L2633, policies near L3724–3932). — est ~40 ln — deps: 1.1 — done: REQ-DB-05 (baseline matches migration) — no-excess: mirror only.
- [x] 1.3 Add `SupabaseFeedback` + `SupabaseNotification` interfaces to `repositories/supabase/types.ts` and register both in `Database.public.Tables` (Row/Insert/Update). — est ~80 ln — deps: none — done: REQ-DB-04 (typed, enables dropping `as any`) — no-excess: type-only.
- [x] 1.4 Remove `(this.client.from('notifications') as any)` casts in `repositories/supabase/notifications-repository-impl.ts` (create/markAsRead/markAllAsRead) now that `notifications` is typed. — est ~-10 ln — deps: 1.3 — done: REQ-DB-04 zero `as any` on notifications — no-excess: cleanup enabled by 1.3.
- [x] 1.5 Regenerate/verify: `supabase gen types typescript` (or `npm run type-check`) confirms `feedbacks`/`notifications` compile. — est 0 ln — deps: 1.3,1.4 — done: type-check passes, no `as any` — no-excess: no code.

## T2 — Domain + Repository (+ RED test)  [slice 2 · PR2]

- [x] 2.0 RED: Create `tests/node/repositories/feedbacks-rls.test.ts` — real Supabase: insert as user A; assert user B's select returns nothing; duplicate `(user,target)` → 23505; create returns row. Expect FAIL (impl absent). — est ~80 ln — deps: T1 — done: proves REQ-DB-02 (scoping) + REQ-FB-02 (duplicate idempotent) — no-excess: single committed behavioral test of the real path.
- [x] 2.1 Create `types/feedback.ts` (`Sentiment`/`Feedback`/`CreateFeedbackDTO`). — est ~20 ln — deps: none — done: REQ-FB-03 types — no-excess: domain only.
- [x] 2.2 Create `repositories/contracts/feedback-repository.ts` (`FeedbacksRepository`: `findByUserAndTarget` + `create`). — est ~20 ln — deps: 2.1 — done: port for REQ-FB-04/REQ-FB-02 — no-excess: interface.
- [x] 2.3 Create `repositories/supabase/feedback-repository-impl.ts` mirroring notifications impl (`requireUserId`/`assertUserScope`/`PGRST116`), `.from('feedbacks')` typed (no `as any`), `create` + `findByUserAndTarget`. — est ~120 ln — deps: 2.2,1.3 — done: RED test goes GREEN (RLS scoping + 23505 + create) — no-excess: mirrors pattern, no extra.
- [x] 2.4 Create `repositories/local/feedback-repository-impl.ts` in-memory double (`create` + `findByUserAndTarget`). — est ~50 ln — deps: 2.2 — done: parity for local mode — no-excess: test double only.
- [x] 2.5 Register: `contracts/index.ts` (export + `AppRepository.feedbacks`); `supabase/index.ts` (export + `SupabaseAppRepository.feedbacks`); `local/index.ts` (export + `LocalAppRepository.feedbacks`); `factory.ts` `createServerFeedbacksRepository` (mirror waitlist). — est ~45 ln — deps: 2.3,2.4 — done: repo wired into `AppRepository` + factory — no-excess: registration.
- [x] 2.6 GREEN verify: run `tests/node/repositories/feedbacks-rls.test.ts` → pass. — est 0 ln — deps: 2.3,2.5 — done: behavioral test green — no-excess: n/a.

## T3 — API Route  [slice 3 · PR3]

- [x] 3.1 Add `FeedbackSchema` (Zod: `target_type.min(1)`, `target_id.min(1)`, `sentiment` enum, `comment` max2000 nullable optional — NO `user_id`) + `FeedbackFormType` to `lib/validations/schemas.ts`. — est ~15 ln — deps: none — done: REQ-FB-04 validation — no-excess: 1 schema.
- [x] 3.2 Create `app/api/feedback/route.ts` POST: `withErrorHandling`; `createClient`; `getUser` → `AuthError('Unauthorized')` (401) if none; `FeedbackSchema.safeParse` → `AppError('Validation failed','VALIDATION_ERROR',400,{issues})`; `repo.create(user.id, dto)` → 201 `{id,created_at}`; catch `23505` → `findByUserAndTarget` → 200; RDD receipt. — est ~55 ln — deps: 2.5,3.1 — done: REQ-FB-04 (auth receipt, spoofed user_id overwritten because schema omits it, 401, 400) — no-excess: single route, reuse envelope.

## T4 — Notifications Delivery Wiring  [slice 4 · PR4]

- [x] 4.1 Add `QueryClientProvider` + module `queryClient` (`staleTime:30s`, `refetchOnWindowFocus`) at top of `app/route-aware-providers.tsx`, wrapping both provider branches. — est ~20 ln — deps: none — done: D4 React Query present app-wide — no-excess: thin provider add.
- [x] 4.2 Create `hooks/use-unread-polling.ts` generic hook (`queryKey`/`queryFn`/`intervalMs` default 45s/`onNew`); track prev ids ref; fire `onNew` only when `prevIds.size>0 && fresh.length>0`. — est ~50 ln — deps: 4.1 — done: REQ-NT-04 (toast on new, none on first/nothing) — no-excess: single generic hook (D5).
- [x] 4.3 Create `components/notifications/notification-bell.tsx` (`'use client'`): fixed bell + badge via `useUnreadPolling(countUnreadByUserId,45s)`; panel via `findUnreadByUserId` newest-first; `markAsRead`/`markAllAsRead` → `invalidateQueries`; `onNew` → sonner toast; `getUser` for userId. — est ~180 ln — deps: 4.2 — done: REQ-NT-01/02/03/04 — no-excess: one consumer.
- [x] 4.4 Mount `<NotificationBell/>` inside `<RouteAwareProviders>` in `app/layout.tsx` (within providers, alongside `{children}`). — est ~5 ln — deps: 4.1,4.3 — done: bell renders app-wide — no-excess: mount only.

## T5 — Feedback UI  [slice 5 · PR5]

- [ ] 5.1 Create `components/feedback/feedback-prompt.tsx` (`'use client'`): props `target_type`/`target_id`; discriminated-union state `prompt|commenting|reacted`; thumbs → `commenting` (textarea) → `fetch('/api/feedback',{POST})`; on 2xx → `reacted` + `localStorage` key `fb:{userId}:{target_type}:{target_id}`; on mount read key → `reacted` (hides prompt, REQ-FB-02); userId via `supabase.auth.getUser()`; sonner toast on error. — est ~140 ln — deps: 3.2,4.1 — done: REQ-FB-01/02/03 all scenarios — no-excess: reusable single component.

## T6 — Testing & Real-Run  [slice 6 · PR6]

- [ ] 6.1 Add `testLocales/` to `.gitignore`. — est ~2 ln — deps: none — done: net on for local tests — no-excess: gate.
- [ ] 6.2 Create `testLocales/feedback-notifications.e2e.ts` (Playwright, gitignored): seed notification in background → bell badge + sonner toast on poll; submit feedback via `FeedbackPrompt` → 2xx receipt; reload → prompt hidden. Real dev Supabase. — est ~120 ln (gitignored, excluded from review budget) — deps: T4,T5 — done: REQ-NT-01/04 + REQ-FB-02 reload + REQ-FB-04 receipt real-run — no-excess: routed to testLocales (local-only bombardeo).
- [ ] 6.3 Real-run evidence: execute e2e + `tests/node/repositories/feedbacks-rls.test.ts` against real Supabase; capture receipt JSON, badge counts, pass output; store as artifacts. — est 0 ln — deps: 6.2,2.6 — done: Gentle AI + RDD real-run gate — no-excess: evidence only.

## No-Excess-Tests Strategy (global)

- Committed suite keeps exactly ONE behavioral test (`feedbacks-rls.test.ts`) — it earns its place by catching RLS scoping + 23505 idempotency (the real-path risks).
- Heavy "bombardeo" e2e → `testLocales/` (gitignored, local-only per `no-excess-tests`); never committed to the suite.
- No unit tests for bell/prompt UI: covered by the real-run e2e; no tautological/mock-echo tests.
- No duplicate cases across the same equivalence class.

## Rollback

Revert the change branch (git); `supabase migration repair`/down `20260820143000_add_feedbacks.sql`. `feedbacks` rows non-critical; UI mount removed with branch revert. Each PR slice is independently revertable per the Work Units table.
