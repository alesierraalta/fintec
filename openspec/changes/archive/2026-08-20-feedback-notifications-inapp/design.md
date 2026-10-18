# Design: Feedback & In-App Notifications ("¿Esto te ha servido?")

## Technical Approach

Approach A (per proposal + explore): reuse the orphaned `notifications` data layer as the
in-app **delivery** surface (bell + panel + toast) and add a dedicated `feedbacks` table +
`FeedbacksRepository` as the **capture** bounded context for "¿esto te ha servido?" reactions.
Clean/Hexagonal: contract → Supabase + Local impls, mirroring `NotificationsRepository`.
`RequestContext` user-scoping; thin `POST /api/feedback` built on the project's
`withErrorHandling` / `AppError` / `errorResponse` envelope; React Query polling for v1
(realtime is explicit phase 2, out of scope). All surface is editorially small: ~one new
migration, two repo impls, one route, two client components, one hook, one provider wiring.

## Gatekeeper: Spec Coverage (no drift, no scope creep)

| Spec REQ                                              | Covered by                                                                              | Notes                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| REQ-FB-01 reusable prompt (`target_type`/`target_id`) | `components/feedback/feedback-prompt.tsx`                                               | Client component, embeddable                         |
| REQ-FB-02 one reaction / user+target, no re-show      | `UNIQUE(user_id,target_type,target_id)` + route 23505 idempotency + `localStorage` hide | DB enforces; UI hides on reload                      |
| REQ-FB-03 thumbs up/down + optional comment           | `FeedbackPrompt` + `CreateFeedbackDTO`                                                  | `comment` nullable                                   |
| REQ-FB-04 POST /api/feedback (Zod, RLS, RDD receipt)  | `app/api/feedback/route.ts`                                                             | server-set `user_id`, 401/403/4xx, `{id,created_at}` |
| REQ-NT-01 bell badge polling                          | `NotificationBell` + `countUnreadByUserId` + `useUnreadPolling`                         | 30–60s interval                                      |
| REQ-NT-02 panel listing                               | `findUnreadByUserId`/`findByUserId`                                                     | newest-first, RLS-scoped                             |
| REQ-NT-03 mark read (single/all)                      | `markAsRead`/`markAllAsRead` (repo exists)                                              | wired to UI buttons                                  |
| REQ-NT-04 toast on new                                | `useUnreadPolling` `onNew` → sonner                                                     | diff vs previous poll                                |
| REQ-DB-01 `feedbacks` DDL                             | new migration                                                                           | exact columns/constraints                            |
| REQ-DB-02 RLS on `feedbacks`                          | new migration (4 policies)                                                              | `auth.uid()=user_id`                                 |
| REQ-DB-03 indexes                                     | migration `(user_id,created_at DESC)`                                                   | unique index backs idempotency                       |
| REQ-DB-04 typed `Database`                            | `repositories/supabase/types.ts`                                                        | add `feedbacks` + backfill `notifications`           |
| REQ-DB-05 baseline mirror                             | `supabase/schemas/baseline.sql`                                                         | mirror DDL only, migrations = source of truth        |

**Out of scope (verified against proposal):** realtime, feedback analytics UI, notification
preferences, moderation, editing past feedback, unified event system. None of these appear in
any REQ, so they are excluded by design.

## Architecture Overview (Clean / Hexagonal)

```
                 UI (client)                      API (route handler)
   ┌──────────────────────────────┐      ┌───────────────────────────────┐
   │ FeedbackPrompt               │      │ POST /api/feedback             │
   │   fetch('/api/feedback')      │─────▶│  withErrorHandling + Zod      │
   │                              │      │  createClient() (SSR cookies)  │
   │ NotificationBell + Panel      │      │       │                       │
   │   useUnreadPolling           │      │       ▼                       │
   │   (React Query)              │      │ FeedbacksRepository (port)    │
   └──────────┬───────────────────┘      └───────────┬───────────────────┘
              │ supabase browser client (.from)                │
              ▼                                              ▼
   ┌──────────────────────────────┐      ┌───────────────────────────────┐
   │ NotificationsRepository (port)│      │ SupabaseFeedbacksRepository    │
   │   findUnread/count/mark       │      │   requireUserId / assertScope  │
   │   (reused, orphaned→wired)    │      │   (impl)                       │
   └──────────┬───────────────────┘      └───────────┬───────────────────┘
              │                                      │
              └──────────────┬───────────────────────┘
                             ▼
                 public.notifications  (delivery)   public.feedbacks (capture)
                 RLS auth.uid()=user_id             RLS auth.uid()=user_id
```

Dependency rule: UI/route depend on the **contract** (`FeedbacksRepository`), never on the
Supabase adapter. Adapter depends on `Database` type + `RequestContext`. Local impl is an
in-memory double for tests.

## Architecture Decisions

| #   | Decision                                                                                                                                                                              | Alternatives rejected                                                         | Rationale                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| D1  | New `feedbacks` table + `FeedbacksRepository`, reuse `notifications` repo for delivery                                                                                                | B: single `in_app_messages` + realtime; C: store feedback as notification row | Two bounded contexts; queryable sentiment; smallest diff; realtime not wired today (RDD burden)                                  |
| D2  | `FeedbacksRepository.create(userId, data)` mirrors `NotificationsRepository.create`; route ALWAYS passes server-derived `authUserId`, Zod omits `user_id`                             | Repo derives user_id internally                                               | Mirrors existing pattern (low cognitive load); client cannot spoof (body has no `user_id`); `assertUserScope` = defense-in-depth |
| D3  | Idempotency via `UNIQUE(user_id,target_type,target_id)` + catch `23505` → return existing `{id,created_at}` (200)                                                                     | Upsert / application lock                                                     | DB is authority; no race; satisfies REQ-FB-02 duplicate-is-idempotent                                                            |
| D4  | React Query via `QueryClientProvider` added to `route-aware-providers.tsx`; `NotificationBell` mounted in `app/layout.tsx` inside providers, gets user from `supabase.auth.getUser()` | Put bell outside providers; add realtime                                      | React Query present but unwired; one thin provider add; decouples bell from `AuthProvider`/landing branch                        |
| D5  | Generic `useUnreadPolling` hook (queryKey/queryFn/intervalMs/onNew) used by bell                                                                                                      | Inline per-component poll                                                     | Proposal-requested; single thin hook; if no 2nd consumer later, inline (right-size)                                              |
| D6  | Already-reacted hide on reload via `localStorage` key `fb:{userId}:{target_type}:{target_id}`                                                                                         | New GET endpoint to fetch existing                                            | No extra endpoint; satisfies REQ-FB-02; user-scoped key avoids cross-user bleed                                                  |
| D7  | Add all 4 RLS policies (select/insert/update/delete) mirroring `notifications`                                                                                                        | Insert+select only (spec says update/delete optional)                         | Matches established pattern; e2e RLS-scoping test needs select under RLS; low cost                                               |

## Database Design

### Migration (new): `supabase/migrations/20260820143000_add_feedbacks.sql`

Style mirrors `20260206122730_user_scoping_budgets_goals.sql` (unquoted, `BEGIN;/COMMIT;`,
`auth.uid() = user_id`):

```sql
-- Capture "¿esto te ha servido?" reactions
BEGIN;

CREATE TABLE IF NOT EXISTS feedbacks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id   text NOT NULL,
  sentiment   text NOT NULL CHECK (sentiment IN ('up','down','neutral')),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_created
  ON feedbacks (user_id, created_at DESC);

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can insert own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can delete own feedbacks" ON feedbacks;

CREATE POLICY "Users can view own feedbacks"   ON feedbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedbacks" ON feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedbacks" ON feedbacks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedbacks" ON feedbacks FOR DELETE USING (auth.uid() = user_id);

COMMIT;
```

- `comment` nullable (spec); `neutral` allowed by CHECK but UI ships up/down (neutral reserved).
- `idx_feedbacks_user_created` satisfies REQ-DB-03; unique index backs idempotency (REQ-DB-01).
- No `updated_at`/trigger (spec DDL has none).

### `baseline.sql` mirror (REQ-DB-05)

Add `feedbacks` DDL (quoted `"public"."feedbacks"` style) after the `notifications` table
block (~line 2647), FK + RLS enable + 4 policies after their `notifications` counterparts
(FK ~3560, policies ~3724/3789/3866/3932). Migrations remain source of truth; baseline is a
consistency snapshot only.

### Typed `Database` (REQ-DB-04) — `repositories/supabase/types.ts`

Add `SupabaseFeedback` + `SupabaseNotification` interfaces and register both in `Database.public.Tables`,
so repo impls drop the `(this.client.from(...) as any)` casts. `notifications` backfill
removes the existing `as any` smell in `notifications-repository-impl.ts`.

## API Design — `app/api/feedback/route.ts`

```ts
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);

  const parsed = FeedbackSchema.safeParse(await request.json());
  if (!parsed.success)
    throw new AppError('Validation failed', 'VALIDATION_ERROR', 400, {
      issues: parsed.error.format(),
    });

  const repo = createServerFeedbacksRepository({ supabase });
  const dto = { ...parsed.data, comment: parsed.data.comment?.trim() || null };
  try {
    const fb = await repo.create(user.id, dto); // user.id = server-set, body has no user_id
    return NextResponse.json(
      successResponse({ id: fb.id, created_at: fb.created_at }),
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === '23505') {
      // duplicate → idempotent 200
      const existing = await repo.findByUserAndTarget(
        user.id,
        dto.target_type,
        dto.target_id
      );
      return NextResponse.json(
        successResponse(
          existing && { id: existing.id, created_at: existing.created_at }
        ),
        { status: 200 }
      );
    }
    throw err;
  }
});
```

- `FeedbackSchema` (Zod, in `lib/validations/schemas.ts`): `target_type:z.string().min(1)`,
  `target_id:z.string().min(1)`, `sentiment:z.enum(['up','down','neutral'])`,
  `comment:z.string().max(2000).nullable().optional()`. **No `user_id` field.**
- Envelope `{ data, error, meta }` via `successResponse`/`errorResponse`; `withErrorHandling`
  maps `AppError`→status and unknown→500.
- RDD receipt = `{ id, created_at }` for lineage (proposal + REQ-FB-04).
- Factory `createServerFeedbacksRepository({ supabase })` mirrors `createServerWaitlistRepository`.

## UI Design

**`components/feedback/feedback-prompt.tsx`** (`'use client'`): props `target_type`, `target_id`.
Discriminated-union local state:

```ts
type PromptState =
  | { status: 'prompt' }
  | { status: 'commenting'; sentiment: 'up' | 'down' }
  | { status: 'reacted'; sentiment: 'up' | 'down' };
```

Flow: thumbs click → `commenting` (textarea) → submit `fetch('/api/feedback', {method:'POST'})`
→ on 2xx set `reacted` + write `localStorage` key. On mount, read key → if present show
`reacted` (hides prompt, REQ-FB-02). Optional sonner `toast` on error.

**`components/notifications/notification-bell.tsx`** (`'use client'`): fixed bell + badge +
popover panel. Gets `userId` via `supabase.auth.getUser()` + `onAuthStateChange`. Uses
`useUnreadPolling` for badge (`countUnreadByUserId`) and panel+toast (`findUnreadByUserId`).
Panel lists newest-first (title/message/type/is_read/action_url/created_at); "mark read" and
"mark all read" call `markAsRead`/`markAllAsRead` then `queryClient.invalidateQueries`.

**`hooks/use-unread-polling.ts`**: wraps `useQuery` with `refetchInterval` (30–60s, default 45s)

- `refetchOnWindowFocus`; tracks previous id set in a ref; fires `onNew(items)` only when
  `prevIds.size>0 && fresh.length>0` (no toast on first load). One caller (bell) in v1.

**Provider wiring**: add `QueryClientProvider` (module `queryClient`, `staleTime:30s`) at top
of `route-aware-providers.tsx` (above the landing/app branch). Mount `<NotificationBell/>`
inside `<RouteAwareProviders>` in `app/layout.tsx` alongside `{children}`; keep `<Toaster/>`

- `#modal-root` outside as today.

## Smart Reuse (avoid repetition)

- **Error handling**: reuse `withErrorHandling`/`AppError`/`errorResponse` verbatim — no new envelope.
- **Polling**: single `useUnreadPolling` hook, not duplicated `useEffect`+`setInterval` per component.
- **Repo pattern**: `SupabaseFeedbacksRepository` reuses `requireUserId`/`assertUserScope`/`PGRST116`
  null handling from `notifications-repository-impl.ts` (copy the shape, drop `as any`).
- **Discriminated union** for `sentiment` and for prompt UI state — exhaustiveness-safe, no stringly flags.
- **No premature abstraction**: factory + projection only where an existing analog exists; no framework
  where a function fits (right-size).

## Interfaces / Contracts

```ts
// types/feedback.ts
export type Sentiment = 'up' | 'down' | 'neutral';
export interface Feedback {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  sentiment: Sentiment;
  comment: string | null;
  created_at: string;
}
export interface CreateFeedbackDTO {
  target_type: string;
  target_id: string;
  sentiment: Sentiment;
  comment?: string | null;
}

// repositories/contracts/feedback-repository.ts
export interface FeedbacksRepository {
  findByUserAndTarget(
    userId: string,
    targetType: string,
    targetId: string
  ): Promise<Feedback | null>;
  create(userId: string, data: CreateFeedbackDTO): Promise<Feedback>;
}
```

Wiring: add `feedbacks: FeedbacksRepository` to `AppRepository` (`contracts/index.ts`);
`SupabaseAppRepository` + `LocalAppRepository` gain `feedbacks`; export from both `index.ts`;
add `createServerFeedbacksRepository` to `repositories/factory.ts`.

## File Changes

| File                                                                       | Action | Description                                              |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `supabase/migrations/20260820143000_add_feedbacks.sql`                     | Create | DDL + RLS + index                                        |
| `supabase/schemas/baseline.sql`                                            | Modify | mirror `feedbacks` DDL/RLS (no other edits)              |
| `repositories/supabase/types.ts`                                           | Modify | add `feedbacks` + backfill `notifications` to `Database` |
| `types/feedback.ts`                                                        | Create | `Feedback`/`CreateFeedbackDTO`/`Sentiment`               |
| `repositories/contracts/feedback-repository.ts`                            | Create | port                                                     |
| `repositories/supabase/feedback-repository-impl.ts`                        | Create | Supabase impl (typed, no `as any`)                       |
| `repositories/local/feedback-repository-impl.ts`                           | Create | in-memory impl                                           |
| `repositories/contracts/index.ts` / `supabase/index.ts` / `local/index.ts` | Modify | register `feedbacks`                                     |
| `repositories/factory.ts`                                                  | Modify | `createServerFeedbacksRepository`                        |
| `lib/validations/schemas.ts`                                               | Modify | `FeedbackSchema` (Zod)                                   |
| `app/api/feedback/route.ts`                                                | Create | POST handler                                             |
| `components/feedback/feedback-prompt.tsx`                                  | Create | inline prompt                                            |
| `components/notifications/notification-bell.tsx`                           | Create | bell + panel + toast                                     |
| `hooks/use-unread-polling.ts`                                              | Create | generic polling/diff hook                                |
| `app/route-aware-providers.tsx`                                            | Modify | add `QueryClientProvider`                                |
| `app/layout.tsx`                                                           | Modify | mount `<NotificationBell/>` in providers                 |
| `.gitignore`                                                               | Modify | add `testLocales/`                                       |

## Testing & RDD Strategy

| Layer                     | What                      | Approach                                                                                                                                                                                                       |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Behavioral (prod, 1 test) | real create + RLS scoping | `tests/node/repositories/feedbacks-rls.test.ts`: insert as user A; assert user B's select returns nothing; duplicate insert → 23505. Uses real Supabase (service role setup, anon scoped).                     |
| E2E (local, gitignored)   | bombardeo real path       | `testLocales/feedback-notifications.e2e.ts` (Playwright vs real dev Supabase): submit feedback → 2xx receipt; reload hides prompt; insert notification in background → bell badge + sonner toast on next poll. |
| No excess tests           | —                         | right-size/no-excess-tests: heavy run lives in `testLocales/` (gitignored); production keeps only the 1 behavioral RLS test.                                                                                   |

RDD: every `POST /api/feedback` returns `{ id, created_at }`; real-run e2e reproduces the
submit+bell-refresh flow rather than relying on unit mocks.

## Migration / Rollout

- New migration only; `supabase db push` applies `feedbacks` + RLS. No data backfill needed
  (`feedbacks` starts empty; `notifications` already exists).
- Rollback: revert branch (git) + `supabase migration repair`/down the `feedbacks` migration.
  No production-dependent data; `feedbacks` rows non-critical; UI mount removed with branch.

## Risks & Mitigations

| Risk                          | Likelihood | Mitigation                                                              |
| ----------------------------- | ---------- | ----------------------------------------------------------------------- |
| Type drift (`as any`)         | Med        | add tables to `Database`, regenerate types; behavioral test compiles    |
| React Query unwired           | Low        | add `QueryClientProvider` in `route-aware-providers.tsx` (design above) |
| RLS spoofed `user_id`         | Low        | route sets `user_id` from session; Zod omits it; `assertUserScope`      |
| Realtime correctness          | n/a        | phase 2 only; not built                                                 |
| `testLocales/` not gitignored | Low        | add to `.gitignore` (File Changes)                                      |

## Open Questions

- [ ] Which `target_type` literals ship in v1 (`report`/`transaction`/`ai-answer`)? UI is generic; surfaces opt in later. (Non-blocking — component is parameterized.)
- [ ] Bell placement on landing branch: currently bell relies on `supabase.auth.getUser()` (no `AuthProvider`); confirm acceptable to skip bell on `/landing`. (Non-blocking.)
