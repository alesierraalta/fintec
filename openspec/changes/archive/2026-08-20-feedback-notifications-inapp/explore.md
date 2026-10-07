# Exploration: Feedback & In-App Notifications ("¿Esto te ha servido?")

Change: `feedback-notifications-inapp`
Mode: investigate only (no proposal/spec yet)
Date: 2026-08-20

## Current State

The project already has a **generic notifications data layer** that is partially built but **orphaned**:

- `supabase/schemas/baseline.sql:2633` defines `public.notifications`
  (id, user_id, title, message, type VARCHAR(20), is_read, action_url,
  created_at, updated_at) with RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
  at `:4079`) and 4 policies (select/insert/update/delete) scoped to
  `auth.uid() = user_id`.
- `type` is constrained by a CHECK: only `success|info|warning|error`.
- `types/notifications.ts` defines `Notification`, `CreateNotificationDTO`,
  `UpdateNotificationDTO`.
- `repositories/contracts/notifications-repository.ts` defines the
  `NotificationsRepository` interface (findByUserId, findUnreadByUserId,
  countUnreadByUserId, findById, create, markAsRead, markAllAsRead, delete,
  deleteAllRead, deleteByUserId).
- Two implementations exist:
  - `repositories/supabase/notifications-repository-impl.ts`
    (browser `supabase` client + `RequestContext` user-scoping, uses `as any`
    casts because the typed `Database` interface omits `notifications`).
  - `repositories/local/notifications-repository-impl.ts` (in-memory mock).
- Registered in `repositories/supabase/index.ts` and `repositories/local/index.ts`.
- **Grep confirms zero consumers** of `.notifications.` / `useNotifications` /
  `OperationsContext` outside the repo files themselves. The layer is dead
  code today — there is **no UI** (no bell, no panel, no hook) and **no realtime**.

`sonner` (^2.0.7) is a dependency and `<Toaster position="top-right" richColors />`
is already mounted in `app/layout.tsx`. `@tanstack/react-query` (^5.90.5) is
available. There is **no user-feedback system** of any kind (the "feedback"
search only matched currency _rate_ display code).

## Affected Areas

- `supabase/migrations/` — add a NEW migration file for the `feedbacks` table
  (do NOT edit `baseline.sql`; migrations are the source of truth per
  `supabase/AGENTS.md`).
- `supabase/schemas/baseline.sql` — mirror the new `feedbacks` DDL so baseline
  stays consistent.
- `repositories/supabase/types.ts` (`Database` interface) — MUST add `feedbacks`
  (and ideally backfill `notifications`) to avoid `as any` casts; run
  `supabase gen types` to refresh.
- `types/` — add `feedback.ts` (`Feedback`, `CreateFeedbackDTO`).
- `repositories/contracts/feedback-repository.ts` — new interface (Clean/Hex
  contract).
- `repositories/supabase/feedback-repository-impl.ts` + `repositories/local/…`
  — mirror the notifications pattern (RequestContext scoping + local mock).
- `repositories/supabase/index.ts` + `repositories/local/index.ts` — register.
- `app/api/feedback/route.ts` — new POST handler using `lib/api-middleware.ts`
  `withErrorHandling` + `AppError`/`errorResponse` envelope + server-side
  Supabase client + RLS.
- `app/layout.tsx` or `(app)` layout — mount a `NotificationBell` + panel
  (client component) alongside existing `<Toaster/>`.
- `components/feedback/feedback-prompt.tsx` — inline "¿Esto te ha servido?"
  thumbs up/down + optional full feedback (client component, sonner toasts).

## Approaches

### A — Reuse notifications for delivery + new `feedbacks` table for capture (RECOMMENDED)

Reuse the existing (orphaned) `notifications` repository as the **in-app
notification delivery** layer (bell + panel + toast). Add a distinct `feedbacks`
table + `FeedbacksRepository` (Clean/Hexagonal, mirroring the notifications
pattern) for the **capture** of "¿esto te ha servido?" responses
(target_type, target_id, sentiment up/down, optional comment, user_id,
created_at). Feedback prompt is an inline client component posting to
`POST /api/feedback`. Notification delivery uses **React Query polling**
(`findUnreadByUserId`, refetch 30–60s) + sonner toast on new rows.

- Pros: reuses existing infra (no rebuild), clean bounded contexts, smallest
  diff, fully testable repository layer, satisfies right-size.
- Cons: two tables; feedback prompts are not "live-pushed" (polling latency of
  tens of seconds — acceptable for this UX).
- Effort: Medium.

### B — Unified event-driven system (single `in_app_messages` table + realtime broadcast)

One table with a `kind` enum (notification | feedback_prompt); a single realtime
channel; feedback submissions generate messages.

- Pros: one realtime subscription, unified model.
- Cons: over-engineers two distinct contexts; realtime is **not wired anywhere
  today** so it must be built + verified from scratch (RDD burden); broadcast
  needs an edge fn/trigger to publish; higher risk. Violates right-size.
- Effort: High.

### C — Polling-only, no new table (reuse notifications, add `feedback` to type CHECK)

Store feedback as notification rows of a new `feedback` type.

- Pros: zero new schema.
- Cons: must ALTER the strict `type` CHECK; conflates delivery vs capture;
  cannot query/aggregate sentiment cleanly; messy analytics. Wrong model.
- Effort: Low but incorrect.

## Recommendation

**Approach A.** The generic `notifications` layer already does delivery
(title/message/is_read/action_url) — wire it to a bell+panel instead of
rebuilding. Model feedback as its own bounded context (`feedbacks` table +
repository) so sentiment is queryable and RLS-scoped. Ship delivery as
**polling** (React Query) in v1; treat realtime (`postgres_changes` filtered by
`user_id=eq.${userId}`) as an explicit phase-2 enhancement once the base flow
passes real-run e2e. This keeps the diff small, testable, and verifiable.

## Risks

- **Type drift**: `repositories/supabase/types.ts` `Database` omits
  `notifications`; new `feedbacks` must be added or it repeats the `as any`
  smell. Mitigation: add table to `Database`, regenerate types.
- **Orphaned layer**: notifications repo has no consumer/coverage tests
  ("⚠️ no covering tests found"). Wiring the bell/panel is net-new surface area.
- **RLS correctness**: `feedbacks` policies must be `auth.uid() = user_id` and
  inserts must reject spoofed `user_id` (server sets it from session). Reuse the
  repo's `assertUserScope` pattern.
- **Realtime verification gap**: if phase-2 realtime is added, `postgres_changes`
  authorizes per-subscriber (Context7: 100 subs = 100 checks, single-threaded);
  for one-sub-per-user it is fine, but it must be proven by real-run e2e, not
  assumed.
- **Over-engineering pressure**: B/C temptations (unification, realtime day-1).
  Guard with right-size: abstract only on the 3rd repeat; no framework where a
  function fits.

## Dependencies & Integrations

- **Supabase**: RLS, migrations folder, `RequestContext` user-scoping pattern,
  server-side client (`createServerClient`) for the API route.
- **Next.js App Router**: client components for interactive UI; `Toaster` already
  in root layout; `withErrorHandling`/`AppError` envelope for API routes.
- **Gentle AI 4R + RDD**: feedback rows can later feed the `priority1-ai`
  verification/review loop (`lib/ai/`), but this is OPTIONAL and out of core
  scope. RDD: every `POST /api/feedback` returns a receipt (created id +
  timestamp) for lineage; real-run e2e "bombards" the submit + bell-refresh
  path rather than relying on repo unit tests.
- **Testing policy**: no excessive repo unit tests; one behavioral test of the
  real path (create + RLS scoping). Heavy local e2e (Playwright) against a real
  Supabase dev instance.

## Next (do NOT proceed to propose until orchestrator confirms)

1. Confirm with user: which surfaces show the prompt (global banner vs inline
   per-section) and what `target_type`s are in scope (transaction result? report?
   AI answer?).
2. Confirm v1 delivery = polling (no realtime) — recommended.
3. Then advance to `sdd-propose` → spec → design → tasks.
