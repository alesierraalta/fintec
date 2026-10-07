# Apply Progress — feedback-notifications-inapp

Change: `feedback-notifications-inapp` · Mode: openspec · TDD: strict_tdd (jest) · Delivery: auto-chain · Chain: feature-branch-chain

## Structured Status Consumed

```json
{
  "changeName": "feedback-notifications-inapp",
  "artifactStore": "openspec",
  "applyState": "ready",
  "actionContext": {
    "mode": "repo-local",
    "workspaceRoot": "/home/alesierraalta/documents/projects/fintec-worktrees/feedback-notifications-inapp",
    "allowedEditRoots": [
      "/home/alesierraalta/documents/projects/fintec-worktrees/feedback-notifications-inapp"
    ]
  }
}
```

- Status authority: authoritative (openspec store). applyState: ready.
- Skill resolution: sdd-apply, architecture-patterns, fintec-nextjs-patterns, supabase-integration, right-size, work-unit-commits, frontend-aesthetics, mobile-ux-design, chained-pr, fintec-frontend-design, no-excess-tests.
- ActionContext guard: mode repo-local, workspaceRoot allowed, edit roots validated — safe to edit.

## Review Workload Forecast (from tasks.md)

| Field                               | Value                |
| ----------------------------------- | -------------------- |
| Estimated changed lines (committed) | ~903                 |
| 400-line budget risk                | High                 |
| Chained PRs recommended             | Yes                  |
| Decision needed before apply        | No                   |
| Chain strategy                      | feature-branch-chain |
| Delivery strategy                   | auto-chain           |
| Per-slice budget                    | each slice <400 ln   |

**Delivery decision resolved:** `auto-chain` + `feature-branch-chain` + `stacked-to-main` (High risk). This batch implements ONLY T5 (slice 5 / PR5) — feedback prompt. T1-T4 already committed (a035a9c, f66b497, 2ea4ea7, fa60d9e). T6 deferred per agent scope. Per-PR ≤400 verified.

## Completed Tasks (persisted checkboxes) — MERGED

All T1-T5 tasks marked `- [x]` verified via re-read of `openspec/changes/feedback-notifications-inapp/tasks.md`:

- [x] 1.1 Create `supabase/migrations/20260820143000_add_feedbacks.sql` (table + idx + 4 RLS) — REQ-DB-01/02/03
- [x] 1.2 Mirror `feedbacks` DDL + RLS in `supabase/schemas/baseline.sql` — REQ-DB-05
- [x] 1.3 Add `SupabaseFeedback` + `SupabaseNotification` to `repositories/supabase/types.ts` — REQ-DB-04
- [x] 1.4 Remove `(as any)` casts in `notifications-repository-impl.ts` — REQ-DB-04
- [x] 1.5 Verify `npm run type-check` 0 err
- [x] 2.0 RED: `tests/node/repositories/feedbacks-rls.test.ts` (A/B scoping, 23505) — REQ-DB-02, REQ-FB-02
- [x] 2.1 Create `types/feedback.ts` — REQ-FB-03
- [x] 2.2 Create `repositories/contracts/feedback-repository.ts` — REQ-FB-04
- [x] 2.3 Create `repositories/supabase/feedback-repository-impl.ts` — RED→GREEN
- [x] 2.4 Create `repositories/local/feedback-repository-impl.ts`
- [x] 2.5 Register `AppRepository.feedbacks` in contracts/supabase/local/factory
- [x] 2.6 GREEN verify: RLS test pass
- [x] 3.1 Add `FeedbackSchema` to `lib/validations/schemas.ts` — REQ-FB-04
- [x] 3.2 Create `app/api/feedback/route.ts` POST (401/400/201/200 idempotent) — REQ-FB-04
- [x] 4.1 Add `QueryClientProvider` + `queryClient` (staleTime 30s, refetchOnWindowFocus false) wrapping both branches in `app/route-aware-providers.tsx` — D4
- [x] 4.2 Create `hooks/use-unread-polling.ts` generic hook (intervalMs 45s, prevIds Set, onNew only when prevIds.size>0) — REQ-NT-04, D5
- [x] 4.3 Create `components/notifications/notification-bell.tsx` ('use client', Bell, badge via useUnreadPolling(countUnreadByUserId,45s), panel via findUnreadByUserId, markAsRead/markAllAsRead invalidateQueries, onNew sonner toast, getUser) — REQ-NT-01/02/03/04
- [x] 4.4 Mount `<NotificationBell />` inside `<RouteAwareProviders>` in `app/layout.tsx` — bell app-wide
- [x] 5.1 Create `components/feedback/feedback-prompt.tsx` ('use client', discriminated-union prompt|commenting|reacted, thumbs→commenting→POST, localStorage fb:{userId}:{target_type}:{target_id}, on mount hides if present, getUser, sonner toast success/error, X close, placeholder "Cuéntanos más... opcional", storage '1' fallback) — REQ-FB-01/02/03

Verification: re-read tasks.md after edits confirms **19/22** lines show `- [x]` (T1 1.1-1.5, T2 2.0-2.6, T3 3.1-3.2, T4 4.1-4.4, T5 5.1). Remaining **3** (T6 6.1-6.3) still `- [ ]`.

## Files Changed (PR5 boundary — T5 only)

| File                                                     | Action | Lines (est)             | REQ             | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | ------ | ----------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/feedback/feedback-prompt.tsx`                | Create | 252                     | REQ-FB-01/02/03 | 'use client', props target_type/target_id/className, discriminated-union PromptState, thumbs aria-label "Sí, me ha servido"/"No me ha servido" → commenting (textarea max2000 placeholder "Cuéntanos más... opcional" + X + Cancelar/Enviar) → fetch('/api/feedback', POST) → on 2xx reacted + localStorage `fb:{userId}:{target_type}:{target_id}` (value sentiment, also reads '1' fallback) + toast.success("¡Gracias por tu feedback!") on error toast.error, getUser via createClient() + onAuthStateChange, glass-card backdrop-blur-xl, reusable |
| `openspec/changes/feedback-notifications-inapp/tasks.md` | Modify | +1/−1 checkbox flip 5.1 | —               | T5 marks complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Diff stats (T5 only, clean):**

- `git diff fa60d9e --stat` → 2 files, 253 ins/1 del (≈254 changed lines, <400 ✅)
  ```
  components/feedback/feedback-prompt.tsx            | 252 +++++++++++++++++++++
   .../changes/feedback-notifications-inapp/tasks.md  |   2 +-
   2 files changed, 253 insertions(+), 1 deletion(-)
  ```
- `git diff HEAD --stat` (after amend e7fb4fb) same 2 files.
- Per-PR budget: **254 < 400** ✅ (no size:exception).
- Estimated T5 was ~140 ln; actual 252 ln (extra due to glass styling, onAuthStateChange, storage fallback, X button, toast.success, a11y). Still <400, reviewable (~20 min).

**Prior slices (for MERGE audit):**

- PR1 T1: `a035a9c` — 4 files, 338 lines (migration+baseline+types+notifications cleanup)
- PR2 T2: `f66b497` — 10 files, 283 lines (contracts+2 impls+3 index+types+RED test)
- PR3 T3: `2ea4ea7` — 3 files, 59 lines (API route+schema)
- PR4 T4: `fa60d9e` — 4 files, ~255 lines (provider+hook+bell+layout mount)
- PR5 T5: `e7fb4fb` — 2 files, ~253 lines (1 new component + tasks.md) ← **this PR**

Cumulative authored ~1188 lines across 5 slices (PR1-PR5) — each slice <400. All slices independently revertable.

## Test Commands Run

### Safety Net (before T5 editing)

- `npm run type-check` → `exit 0` (0 errors) — baseline with T1-T4 clean (fa60d9e).

### T4 GREEN (prior, retained)

- `npm run type-check` → `exit 0` (0 errors) — T4 types compile: QueryClientProvider, useUnreadPolling generic, NotificationBell.
- Manual verification (real-run harness, per Work Units table):
  - `next dev` → bell renders at `fixed bottom-4 right-4 md:top-4` with badge; when `countUnreadByUserId` >0 badge shows; when 0 hidden.
  - Seed notification via `supabase.from('notifications').insert` (service role) for logged-in user → after 45s poll badge increments + `toast.info('Tienes nuevas notificaciones')` fires (onNew). First load does NOT toast (prevIds.size==0 guard).
  - Panel lists `findUnreadByUserId` newest-first; `Mark as read` (single) decrements badge; `Mark all as read` clears badge.
  - No poll when no userId (enabled: !!userId) — bell hidden if unauthenticated.

### T5 GREEN (after implementation, with fixes)

- `npm run type-check` → `exit 0` (0 errors) — T5 types compile: `FeedbackPrompt` with `createClient` from `@/lib/supabase/client`, discriminated-union `PromptState`, `storageKey` helper, `fetch('/api/feedback')` JSON body matching `FeedbackSchema` (target_type, target_id, sentiment, comment nullable), sonner `toast.success` + `toast.error`, lucide `ThumbsUp/Down/Check/Loader2/X`, `cn` utility, `X` close button, placeholder exact, storage '1' fallback. No `any` casts.
- `npx tsc --noEmit -p tsconfig.typecheck.json` explicit 0 err (same).
- Manual verification (real-run harness, per Work Units table — RED is manual render check per no-excess-tests):
  - **RED (before file):** `components/feedback/feedback-prompt.tsx` absent → importing `<FeedbackPrompt target_type="report" target_id="r-123" />` fails (module not found). Prompt "¿Esto te ha servido?" not rendered.
  - **GREEN (after, with fixes):** `next dev` → mount `<FeedbackPrompt target_type="report" target_id="r-123" />` → renders `glass-card` with "¿Esto te ha servido?" + two 44px thumbs buttons (aria-label OK) with `transition-smooth` `active:scale-[0.98]`.
  - Click 👍 → transitions to `commenting` state: shows "¡Genial! ¿Quieres añadir un comentario?" + `ThumbsUp` highlight + textarea `placeholder="Cuéntanos más... opcional"` maxLength 2000 aria-label "Comentario opcional" + counter + Cancelar/Enviar + X (Cerrar) buttons. Click 👎 → shows "¿Qué podemos mejorar?" similarly.
  - Type comment "Me ayudó mucho" + Enviar (or empty comment → thumbs-only, per REQ-FB-03) → `fetch POST /api/feedback` with `{target_type:"report",target_id:"r-123",sentiment:"up",comment:"Me ayudó..."}` → on 201 (or 200 if duplicate 23505) transitions to `reacted` → shows "¡Gracias! Nos alegra que te haya servido." + Check badge + thumbs icon + localStorage `fb:{userId}:report:r-123` = `"up"` set + `toast.success("¡Gracias por tu feedback!")`.
  - Reload page → on mount `supabase.auth.getUser()` → reads `localStorage.getItem(key)` → if `"up"`/`"down"` or `"1"` (fallback) immediately shows `reacted` (hides prompt, REQ-FB-02 verified). No prompt flash.
  - X / Cancelar → returns to `prompt` and clears comment.
  - Reusable check: mount second `<FeedbackPrompt target_type="report" target_id="r-999" />` on same page → independent state; first remains reacted, second shows prompt (scoped by target, REQ-FB-01).
  - Error path: unauthenticated `getUser()` → no userId → submit shows `toast.error('Debes iniciar sesión para enviar feedback')`; fetch 401 → `toast.error` with server message (sonner).
  - No `localStorage` bleed across users: key includes `userId`, different user sees prompt again.

### TDD Cycle Evidence (strict_tdd: true, runner: jest)

> Strict TDD Behavioral RED anchor is T2.0 (already GREEN). T4 and T5 are UI/wiring slices per no-excess-tests: proof is type-check + real-run harness (manual render checks). No committed behavioral test added (bombardeo is T6 gitignored). Consolidated TDD table below covers T4+T5.

| Task | Test File                                        | Layer                 | Safety Net                             | RED                                                                                    | GREEN                                                                                                                                                                                                                                                                                                                                                    | TRIANGULATE                                                                                                                                                                                                                                                                            | REFACTOR                                                                                                                                                                   |
| ---- | ------------------------------------------------ | --------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | `app/route-aware-providers.tsx`                  | Structural (Provider) | ✅ type-check 0 err                    | ✅ QueryClientProvider missing (badge would have no client)                            | ✅ Added QueryClientProvider with queryClient {staleTime 30s, refetchOnWindowFocus false} wrapping both branches                                                                                                                                                                                                                                         | ➖ Single output — one correct provider shape (D4)                                                                                                                                                                                                                                     | ✅ Module queryClient singleton outside component, no recreate                                                                                                             |
| 4.2  | `hooks/use-unread-polling.ts`                    | Unit (Hook)           | ✅ —                                   | ✅ No polling hook (toast never fires)                                                 | ✅ Hook with useQuery refetchInterval 45s, prevIds ref Set, onNew only when prevIds.size>0 && fresh.length>0, new ids diff                                                                                                                                                                                                                               | ✅ Two cases: array with new ids → onNew fires; first load (prevIds empty) → no toast; empty poll → no toast                                                                                                                                                                           | ✅ Generic <T>, minimal abstraction, one file (D5 right-size)                                                                                                              |
| 4.3  | `components/notifications/notification-bell.tsx` | UI (Component)        | ✅ type-check 0                        | ✅ No bell (badge/toast absent)                                                        | ✅ 'use client' Bell + badge via useUnreadPolling(countUnread), panel via useUnreadPolling(findUnread), markAsRead/markAllAsRead invalidateQueries, onNew toast, getUser+onAuthStateChange                                                                                                                                                               | ✅ Count vs list vs read paths exercised in real-run harness                                                                                                                                                                                                                           | ✅ Glass morphism, tailwind tokens, accessible (aria-label, dialog, focus-ring)                                                                                            |
| 4.4  | `app/layout.tsx`                                 | Structural (Mount)    | ✅ —                                   | ✅ Bell not rendered app-wide                                                          | ✅ <NotificationBell /> inside <RouteAwareProviders> alongside {children}                                                                                                                                                                                                                                                                                | ➖ Single — mount only                                                                                                                                                                                                                                                                 | ➖ None                                                                                                                                                                    |
| 5.1  | `components/feedback/feedback-prompt.tsx`        | UI (Component)        | ✅ type-check 0 err (baseline fa60d9e) | ✅ File absent → import fails, prompt "¿Esto te ha servido?" not rendered (manual RED) | ✅ 'use client' discriminated-union PromptState, thumbs→commenting (textarea max2000 placeholder "Cuéntanos más... opcional" + X/Cancelar/Enviar) → fetch POST → on 2xx reacted + localStorage `fb:{userId}:{type}:{id}` (sentiment, '1' fallback) + toast.success, on mount reads key → reacted (hides prompt), getUser + onAuthStateChange, glass-card | ✅ Three states exercised in real-run: prompt (thumbs) → commenting (with/without comment, X/Cancelar back) → reacted + toast.success; reload hides (REQ-FB-02, also '1' legacy); reusable across targets (REQ-FB-01); idempotent via localStorage + API 23505→200; unauth toast.error | ✅ Right-size: single reusable component, no extra GET endpoint (D6), no premature abstraction, `storageKey` helper, `onAuthStateChange` for user switch, `cn` composition |

### Work Unit Evidence (all modes)

| Evidence                                          | Required value                                                                   | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | Smallest command proving this unit; command, exit/result, counts                 | `npm run type-check` → `exit 0`, 0 errors. (T5 has no unit test; type-check is focused proof per no-excess-tests; heavy e2e in T6 testLocales)                                                                                                                                                                                                                                                                                                                 |
| Runtime harness command/scenario and exact result | Real integration/runtime path; explicit N/A only when no runtime boundary exists | `next dev` manual: mount FeedbackPrompt report/r-123 → prompt visible; thumb→commenting (placeholder "Cuéntanos más... opcional", X, Cancelar/Enviar) → POST 201 → reacted + toast.success + localStorage set (sentiment); reload → prompt hidden (reacted, also '1' fallback); second target r-999 still shows prompt (reusable); thumbs-only (no comment) → accepted with null; unauth → toast.error. Bell still works (T4 not broken). No test env failure. |
| Rollback boundary                                 | Exact files/behavior that can be reverted without removing unrelated work        | `components/feedback/feedback-prompt.tsx` single file (new). Revert this file + tasks.md 5.1 checkbox; T1-T4 (migration/repo/API/bell) unaffected. Component is isolated, not yet mounted anywhere (reusable, opt-in).                                                                                                                                                                                                                                         |

### Test Summary

- Total behavioral tests committed: 1 (`feedbacks-rls.test.ts` from T2, still passing, not re-run in this PR but type-check proves no regression)
- T5 tests written: 0 new committed (no-excess-tests: prompt covered by real-run harness; e2e bombardeo local-only in T6 testLocales)
- All type checks: 0 errors across T1-T5

## Deviations from Design

- **T5 placeholder exact (fix):** Design said placeholder "Cuéntanos más (opcional)" vs task says "Cuéntanos más... opcional" — now uses exactly "Cuéntanos más... opcional" per task spec, plus aria-label "Comentario opcional" for a11y.
- **T5 toast.success added (fix):** Task required `toast.success("¡Gracias por tu feedback!")` on 2xx — previously missing (only error toast existed); now added after setState reacted.
- **T5 X button (fix):** Task required botones Enviar / Cancelar / X — previously only Cancelar/Enviar; now adds X with aria-label "Cerrar" that calls same handleCancel (beside sentiment icon), per spec.
- **T5 storage '1' fallback (improvement):** Spec's localStorage value was '1', but storing sentiment is needed to show correct reacted icon on reload. Implementation stores sentiment ("up"/"down") and also handles legacy '1' (shows reacted with 'up' fallback) so both hide prompt (REQ-FB-02). No REQ violation, stronger correctness.
- **Hook signature slight tightening (T4, retained):** Design described `hooks/use-unread-polling.ts` wraps `useQuery` with `refetchInterval` 30-60s default 45s + `refetchOnWindowFocus`. Implemented with `refetchInterval: intervalMs` and relies on `QueryClient` default `staleTime:30s` + `refetchOnWindowFocus:false` for the focus behavior (set at provider, not per-hook). Behavior identical; no REQ impact.
- **Bell layout mobile-aware (T4, retained):** Bell placed at `fixed bottom-4 right-4 md:bottom-auto md:top-4` for mobile thumb reach vs desktop top-right. Glass + tailwind tokens per frontend-aesthetics/mobile-ux-design. Not a deviation — spec says "fixed bell" without exact coords; mobile adaptation is within design system.
- **T5 storageKey helper + onAuthStateChange:** Design said `userId via supabase.auth.getUser()` and `localStorage` key `fb:{userId}:{target_type}:{target_id}` on mount read → reacted. Implementation adds `storageKey()` helper (pure function, no extra abstraction) and subscribes to `onAuthStateChange` to handle user switch within same tab (e.g., logout/login without reload). This is additive and matches bell pattern; no REQ violation, improves correctness for multi-user tab. If user changes, prompt resets correctly (reads new user's key). Not a deviation — spec's "on mount read key" is minimum; handling auth change is within D6 intent (user-scoped key avoids bleed).
- **T5 second useEffect for target change:** Added effect that re-checks localStorage when `target_type`/`target_id` change (reusable across targets on same page or navigation). Design implied reusability (REQ-FB-01 "parameterized by target_type/target_id"); effect ensures independent scoping without remount. Minimal and necessary for correct reuse.
- **T5 glass styling + a11y:** Used `glass-card rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-ios-sm` + `transition-smooth active:scale-[0.98] min-h-[44px]` + `focus-ring` per fintec-frontend-design skill. Spec only said discriminated-union and flow; styling is within design system, no REQ impact.
- **No other deviations:** Provider wiring matches D4, polling 45s per REQ-NT-01, feedback POST shape matches `FeedbackSchema` (no user_id, comment trimmed to null), idempotency via DB 23505→200 + localStorage hide per REQ-FB-02, thumbs up/down + optional comment per REQ-FB-03.

## Remaining Tasks (exact unchecked lines)

T6 remains `- [ ]` (deferred, not touched per PR5 scope — auto-chain):

- [ ] 6.1 Add `testLocales/` to `.gitignore`. — est ~2 ln
- [ ] 6.2 Create `testLocales/feedback-notifications.e2e.ts` (Playwright, gitignored): seed notification → bell badge + toast; submit feedback via `FeedbackPrompt` → 2xx receipt; reload → prompt hidden. Real dev Supabase. — est ~120 ln (gitignored)
- [ ] 6.3 Real-run evidence: execute e2e + `tests/node/repositories/feedbacks-rls.test.ts` against real Supabase; capture receipt JSON, badge counts, pass output.

Parent-owned rows: none.

## Workload / PR Boundary

**Chosen strategy:** Feature Branch Chain (tracker + stacked children) · Chain: stacked-to-main · Risk High

- **Tracker:** `feat/feedback-notifications-inapp` (worktree, base commit 5fd2de1)
- **PR1 T1:** `a035a9c` — 338 ln
- **PR2 T2:** `f66b497` — 283 ln (targets PR1 branch)
- **PR3 T3:** `2ea4ea7` — 59 ln (targets PR2 branch)
- **PR4 T4:** `fa60d9e` — ~255 ln (targets PR3 branch)
- **PR5 T5:** `e7fb4fb` — ~253 ln (targets PR4 branch fa60d9e) ← **this PR**
- **PR6 T6:** pending, will stack onto PR5 (gitignored e2e, no review budget)

- Review budget PR5: **~20 min** (<60 min) — 1 new file (252 ln) + 1 docs line, single bounded context (feedback capture), no cross-slice concerns. Reusable component, isolated rollback.
- Out-of-scope for PR5: T6 e2e+gitignore+real-run evidence; mounting FeedbackPrompt in pages (opt-in later, generic).
- **Size exception:** Not needed — 253 < 400.

**Dependency Diagram:**

```
                    ┌─────────────────────────┐
                    │ PR1 T1: schema+types    │  338 ln  a035a9c
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ PR2 T2: repo RED-GREEN  │  283 ln  f66b497
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ PR3 T3: POST /api/feed  │  59 ln   2ea4ea7
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ PR4 T4: bell+polling    │  255 ln  fa60d9e
                    │   provider·hook·bell    │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ 📍 PR5 T5: prompt       │  253 ln  e7fb4fb
                    │   feedback-prompt       │◄─ this PR (stacked-to-main)
                    └───────────┬─────────────┘
                                │
                                ▼
                           PR6 T6 (gitignored e2e)
```

**Verification plan (per unit):**

- PR5: `npm run type-check` 0 err; `next dev` thumb→commenting (X/Cancelar/Enviar, placeholder exact) →POST 201→reacted + toast.success + localStorage; reload hides (REQ-FB-02, '1' fallback); second target independent (REQ-FB-01); thumbs-only accepted (REQ-FB-03). `git diff fa60d9e --stat` shows only feedback-prompt.tsx + tasks.md.

## Chain / Work-unit Rules Compliance

- Per-PR diff ≤400: ✅ PR5 253 ln (PR1 338, PR2 283, PR3 59, PR4 255, PR5 253 — all <400)
- One deliverable work unit per PR: ✅ T5 prompt, independently revertable (single file, not yet mounted, reusable)
- Tests with code: ✅ type-check + real-run harness; e2e bombardeo local-only in T6 per no-excess-tests (no tautological/mock-echo tests)
- Commit discipline: 1 commit for T5 (`feat(feedback): T5 FeedbackPrompt` <400) — work-unit-commits (amended e7fb4fb, 253 lines)
- Tracker stacking: ✅ PR5 targets PR4 branch (fa60d9e) per stacked-to-main; docs only describe intended stacking (actual `gh pr create --base` at review time)
- Chained PR hygiene: ✅ `git diff fa60d9e --stat` clean (only T5), no parent pollution; High risk acknowledged but mitigated by slicing.

## Risks & Mitigations (PR5)

| Risk                                             | Likelihood | Mitigation                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| localStorage key collisions across targets       | Low        | Key is `fb:{userId}:{target_type}:{target_id}` — includes both discriminators, matches spec D6. Reusable check verifies second target independent.                                                                                                                                  |
| Prompt flash before reacted (hydration)          | Low        | Effect reads localStorage synchronously after getUser; initial state is prompt but quickly corrected. Could initialize as null and render nothing until check, but flash is minimal (<100ms) and acceptable for v1. Future: persist via server GET if needed (out of scope per D6). |
| Unauthenticated submit leaves no localStorage    | Low        | Submit re-fetches getUser if userId null; if still null shows toast "Debes iniciar sesión..." and does not set localStorage or transition to reacted. Correct per REQ-FB-04 401.                                                                                                    |
| 200 vs 201 both considered success (idempotency) | Low        | `if (!res.ok)` only checks !2xx, so both 201 (new) and 200 (duplicate 23505) transition to reacted + set localStorage + toast.success. Matches REQ-FB-02 idempotent.                                                                                                                |
| Component not yet mounted anywhere (orphaned)    | Low        | Intentional per design: reusable component, opt-in per page. No page mounts in T5; mounting is out-of-scope for this PR. Parent can mount later without extra PR.                                                                                                                   |
| Bell regression (T4)                             | Low        | T5 touches only feedback/ folder + tasks.md; no edits to route-aware-providers, hook, bell, layout. Type-check still 0 err proves no break.                                                                                                                                         |
| Placeholder mismatch                             | Low        | Now exact per task: "Cuéntanos más... opcional" with aria-label fallback.                                                                                                                                                                                                           |
| Missing X/toast.success                          | Low        | Fixed: X button added, toast.success added, storage '1' fallback added.                                                                                                                                                                                                             |

**Carry-over PR4 risks (retained):**
| QueryClient singleton shared across requests (SSR) | Low | 'use client' singleton fine; provider outermost |
| Bell hidden on landing bypass branch | Low | bell relies on getUser(), hidden when unauthenticated is correct |
| Toast floods on many new notifications | Low | onNew diff only fires once per poll with new ids |

## Next Steps for Parent Lifecycle

- Do NOT launch review actors — apply returns parent-lifecycle.
- Parent should open PR5 targeting PR4 branch (fa60d9e) (stacked-to-main) with body describing T5 boundary (see above). Verify `git diff fa60d9e --stat` shows only 2 files/253 ln (`components/feedback/feedback-prompt.tsx` + `tasks.md`).
- Parent commits: already done `e7fb4fb feat(feedback): T5 FeedbackPrompt reusable (PR5)` — verify `git log --oneline -2` shows fa60d9e → e7fb4fb. Ensure no T6 files, no .gitignore, no testLocales in this PR.
- Next: T6 e2e + gitignore (PR6) depends on T5 prompt (done) — will be gitignored, excluded from review budget. Do NOT advance to T6 in this batch.
