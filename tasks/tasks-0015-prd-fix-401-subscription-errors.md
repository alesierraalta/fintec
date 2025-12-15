# Task List: Fix 401 Subscription Errors (PRD-0015)

This task list addresses the persistent 401 Unauthorized errors caused by missing middleware for Supabase SSR session management.

## Relevant Files
- `middleware.ts` - New file required to handle session refreshing.
- `lib/supabase/middleware.ts` - New helper file for middleware logic.
- `hooks/use-subscription.ts` - Client hook calling the API.

## Tasks
- [ ] 1.0 Middleware Implementation
  - [ ] 1.1 Create `lib/supabase/middleware.ts`:
    - [ ] 1.1.1 Import `createServerClient` and `NextRequest`, `NextResponse`.
    - [ ] 1.1.2 Implement `updateSession(request: NextRequest)` function.
    - [ ] 1.1.3 Configure cookie handling (get/set/remove) to sync request/response cookies.
    - [ ] 1.1.4 Call `supabase.auth.getUser()` to trigger session refresh.
  - [ ] 1.2 Create `middleware.ts` in the project root:
    - [ ] 1.2.1 Import `updateSession`.
    - [ ] 1.2.2 Export the `middleware` function calling `updateSession`.
    - [ ] 1.2.3 Configure `config` matcher to exclude static assets, images, etc.

- [ ] 2.0 Frontend Refinement (Optional but Recommended)
  - [ ] 2.1 Update `hooks/use-subscription.ts`:
    - [ ] 2.1.1 Add logic to catch 401 errors specifically.
    - [ ] 2.1.2 If 401 occurs, retry once after a short delay OR silently set status to 'free' without error state (depending on preference). (Recommendation: Just rely on middleware fix first).

- [ ] 3.0 Verification
  - [ ] 3.1 Restart dev server (middleware often requires restart).
  - [ ] 3.2 Log in and verify console logs are clean of 401s.
  - [ ] 3.3 Verify `/api/subscription/status` returns 200 OK.
