# Product Requirements Document: Fix 401 Unauthorized Subscription Errors

## 1. Introduction
The application is generating repeated 401 Unauthorized errors when the frontend (`useSubscription` hook) calls the `/api/subscription/status` endpoint. This indicates a disconnection between the client-side session state and the server-side authentication check implemented in recent security updates.

## 2. Goals
*   **Eliminate False 401s:** Ensure legitimate, authenticated users can successfully fetch their subscription status without errors.
*   **Synchronize State:** Ensure the API call is only made *after* the session is confirmed valid and cookies are correctly propagated.
*   **Graceful Handling:** Handle "loading" or "unauthenticated" states on the frontend without spamming the server or console logs.

## 3. Root Cause Analysis (Hypothesis)
*   The `useSubscription` hook might be firing *before* the Supabase session cookie is fully set or propagated to the server.
*   The `createClient` helper in `lib/supabase/server.ts` might not be successfully retrieving cookies in the API Route context, causing `supabase.auth.getUser()` to return null/error.
*   The API route now strictly enforces `getUser()`, rejecting any request where the session is missing, whereas previously it might have been lenient (or insecure).

## 4. Functional Requirements

### 4.1. Frontend Optimization (`hooks/use-subscription.ts`)
*   **Wait for Session:** Ensure `fetchSubscription` is **strictly blocked** until `user` (from `useAuth`) is truthy and stable.
*   **Debounce/Delay:** Add a slight delay or check session readiness before the first fetch to allow cookies to settle.
*   **Error Suppression:** If a 401 occurs, catch it and potentially trigger a session refresh (or just set state to 'free' temporarily) instead of retrying infinitely or logging aggressively.

### 4.2. Middleware/Server Verification
*   **Verify Cookie Passing:** Ensure `middleware.ts` (if exists) or the client setup properly sends cookies to `/api/*` routes.
*   **Debug Server Client:** Temporarily add detailed logging in `app/api/subscription/status/route.ts` to see *why* `getUser()` fails (e.g., "Auth session missing!" vs "Token expired").

### 4.3. API Route Refinement
*   **Soft Fail (Optional):** If the user is unauthenticated, instead of a hard 401 that looks like a crash, considering returning a valid JSON like `{ tier: 'free', error: 'unauthenticated' }` to let the UI degrade gracefully to Free tier, unless strict security requires the 401. (Decision: Keep 401 for security, fix the *call* site).

## 5. Success Metrics
*   Console logs are free of `api/subscription/status ... 401 (Unauthorized)`.
*   Subscription status loads correctly on the first try after login.

## 6. Open Questions
*   Is there a `middleware.ts` file managing sessions? (Need to check during investigation).
