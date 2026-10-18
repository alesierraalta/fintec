# Proposal: Feedback & In-App Notifications ("¿Esto te ha servido?")

## Intent

Give users a lightweight way to react to app outputs ("¿Esto te ha servido? 👍 👎" + optional full feedback) and surface system messages through an in-app notification center. We reuse the orphaned `notifications` data layer for delivery and add a dedicated `feedbacks` table for capture — two clean bounded contexts, minimal new surface.

## Scope

### In Scope

- `feedbacks` table (new migration + `baseline.sql` mirror) + RLS `auth.uid() = user_id`; unique `(user_id, target_type, target_id)`.
- `types/feedback.ts`, `FeedbacksRepository` (contract + Supabase + Local impl), mirroring the existing `notifications` pattern.
- `POST /api/feedback` with `withErrorHandling` + Zod validation + server-set `user_id` + RDD receipt (created id + timestamp).
- Reusable `FeedbackPrompt` component (target_type + target_id); one reaction per target+user via unique constraint + dismissed local state (no spam).
- `NotificationBell` (badge + panel + sonner toast) using React Query polling (`findUnreadByUserId`/`countUnreadByUserId`).
- Type `Database` correctly: add `feedbacks` (and backfill `notifications`) to remove `as any` casts.
- Real-run e2e in `testLocales/` + one behavioral test of the real path (create + RLS scoping).

### Out of Scope

- Realtime push (`postgres_changes`) — explicit phase 2.
- Unified event/message system (rejected approach B).
- Feedback analytics dashboard / sentiment aggregation UI.
- Gentle AI verification-loop feeding feedback into `priority1-ai` (optional, out of core).
- External/push/email, notification preferences, feedback moderation, editing past feedback.

## Approach

Approach A (explore): reuse `notifications` for delivery, new `feedbacks` for capture. Clean/Hexagonal: contract → Supabase/Local impls; `RequestContext` user-scoping; thin API route. Polling in v1, realtime later.

## Capabilities

### New Capabilities

- `feedback`: capture "¿esto te ha servido?" responses (thumbs + comment) via `feedbacks` + repo + `POST /api/feedback`.
- `notifications-inapp`: in-app delivery (bell, badge, panel, toast) reusing the `notifications` repo + React Query polling.

### Modified Capabilities

- `database`: add `feedbacks` table (+ backfill `notifications`) to typed schema / baseline / migration.

## Affected Areas

| Area                                                | Impact   | Description                     |
| --------------------------------------------------- | -------- | ------------------------------- |
| `supabase/migrations/`                              | New      | `feedbacks` DDL + RLS           |
| `supabase/schemas/baseline.sql`                     | Modified | mirror `feedbacks`              |
| `repositories/supabase/types.ts`                    | Modified | add `feedbacks`/`notifications` |
| `types/feedback.ts`                                 | New      | domain types                    |
| `repositories/.../feedback*`                        | New      | contract + 2 impls              |
| `app/api/feedback/route.ts`                         | New      | POST handler                    |
| `components/feedback/`, `components/notifications/` | New      | UI                              |
| `app/layout.tsx`                                    | Modified | mount `NotificationBell`        |

## Risks

| Risk                    | Likelihood | Mitigation                                 |
| ----------------------- | ---------- | ------------------------------------------ |
| Type drift (`as any`)   | Med        | add tables to `Database`, regenerate types |
| Orphaned layer untested | Med        | wire bell/panel; e2e bombards real path    |
| RLS spoofed `user_id`   | Low        | server sets `user_id` from session         |
| Realtime correctness    | n/a        | phase 2; prove by real-run e2e             |

## Rollback Plan

Revert the change branch (git). Drop the `feedbacks` migration (`supabase migration repair`/down). No dependent production data; `feedbacks` rows are non-critical. UI mount removed with branch revert.

## Dependencies

Existing `notifications` repo + RLS, `RequestContext`, `withErrorHandling`/`AppError`, sonner `<Toaster/>`, React Query, Playwright (e2e), `supabase gen types`.

## Success Criteria

- [ ] User can react + submit feedback; unique per target+user enforced (no spam).
- [ ] Bell shows unread badge; panel lists; toast fires on poll.
- [ ] `POST /api/feedback` returns RDD receipt; RLS blocks cross-user writes.
- [ ] Real-run e2e in `testLocales/` passes; zero `as any` casts remain.
- [ ] Gentle AI 4R review + strict `pr-review` at close.
