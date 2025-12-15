# Task List: Switch to Bearer Token Authentication (PRD-0016)

This task list outlines the steps to implement Bearer Token authentication for the subscription API, bypassing cookie-based 401 errors.

## Relevant Files
- `hooks/use-subscription.ts` - Client hook needs to send `Authorization` header.
- `lib/supabase/server.ts` - Server client helper needs to forward headers.
- `app/api/subscription/status/route.ts` - Endpoint to verify.

## Tasks
- [ ] 1.0 Frontend Auth Update
  - [ ] 1.1 Update `hooks/use-subscription.ts`:
    - [ ] 1.1.1 Destructure `session` from `useAuth()`.
    - [ ] 1.1.2 In `fetchSubscription`, check if `session?.access_token` exists.
    - [ ] 1.1.3 Add `Authorization: Bearer ${session.access_token}` to the fetch headers.
    - [ ] 1.1.4 Ensure `fetchSubscription` dependency array includes `session?.access_token`.

- [ ] 2.0 Backend Client Update
  - [ ] 2.1 Update `lib/supabase/server.ts`:
    - [ ] 2.1.1 Import `headers` from `next/headers`.
    - [ ] 2.1.2 In `createClient`, await `headers()`.
    - [ ] 2.1.3 Extract `Authorization` header.
    - [ ] 2.1.4 Pass `global: { headers: { Authorization: authHeader } }` to `createServerClient` options (if header exists).

- [ ] 3.0 Verification
  - [ ] 3.1 Restart dev server.
  - [ ] 3.2 Log in and check network tab.
  - [ ] 3.3 Verify `/api/subscription/status` request has Authorization header.
  - [ ] 3.4 Verify response is 200 OK and subscription data loads.
