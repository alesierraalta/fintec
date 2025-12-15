# Task List: Fix "False Free" Tier Display (PRD-0014)

This task list addresses the issue where Premium users are shown as Free due to insecure API practices and silent failures interacting with RLS policies.

## Relevant Files
- `app/api/subscription/status/route.ts` - Primary target for security fix.
- `lib/supabase/subscriptions.ts` - Target for improved error logging.
- `lib/supabase/server.ts` - Helper for auth client.

## Tasks
- [ ] 1.0 Secure API Implementation
  - [ ] 1.1 Refactor `app/api/subscription/status/route.ts`:
    - [ ] 1.1.1 Initialize `createClient`.
    - [ ] 1.1.2 Authenticate via `supabase.auth.getUser()`.
    - [ ] 1.1.3 Return 401 if unauthorized.
    - [ ] 1.1.4 Use `user.id` from session for queries.

- [ ] 2.0 Service Layer Resilience
  - [ ] 2.1 Update `lib/supabase/subscriptions.ts`:
    - [ ] 2.1.1 Add explicit error logging in data fetchers.
    - [ ] 2.1.2 Log fallbacks to 'free'.

- [ ] 3.0 Verification
  - [ ] 3.1 Verify Premium status in UI.
  - [ ] 3.2 Verify 401 for unauthenticated requests.
