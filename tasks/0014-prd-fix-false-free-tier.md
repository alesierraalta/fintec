# Product Requirements Document: Fix "False Free" Tier Display

## 1. Introduction
Users who are correctly marked as "Premium" in the database are seeing "Free" in the application. This is caused by a silent failure in the data fetching logic where Row Level Security (RLS) policies or ID mismatches result in an empty dataset, which the system defaults to the 'free' tier.

## 2. Goals
*   **Accurate Tier Display:** Ensure the application always displays the true tier stored in the database for the authenticated user.
*   **Robust Security:** Rely on server-side session validation rather than client-provided user IDs for sensitive data fetching.
*   **Transparent Debugging:** Log failures explicitly instead of silently falling back to defaults during development/debugging.

## 3. Root Cause Analysis
*   The `getUserTier` function returns `'free'` whenever it encounters an error or receives `null` data.
*   The API route `/api/subscription/status` accepts `userId` as a query parameter but uses a cookie-authenticated Supabase client.
*   If Supabase RLS policies filter out the row (e.g., because the session ID doesn't match the query ID, or the session is missing), the query returns no data, triggering the 'free' fallback.

## 4. Functional Requirements

### 4.1. Secure API Endpoint (`app/api/subscription/status/route.ts`)
*   **Mechanism:** Do NOT use the `userId` query parameter for authorization or data fetching context.
*   **Implementation:**
    1.  Initialize the Supabase client.
    2.  Retrieve the authenticated user via `await supabase.auth.getUser()`.
    3.  If no user is found, return `401 Unauthorized`.
    4.  Use the `user.id` from the session to call `getSubscriptionByUserId(user.id)`.

### 4.2. Enhanced Data Service (`lib/supabase/subscriptions.ts`)
*   **Error Logging:** In `getUserTier`, if `data` is null or `error` is present, log a specific warning (e.g., "Subscription fetch failed for user [ID]: [Error]").
*   **No Silent Failures:** While a fallback to 'free' is acceptable for stability, the system must distinguish between "User is actually Free" and "We couldn't find the user".

### 4.3. RLS Verification
*   Verify that the `users` table policy allows `select` for the authenticated user (`auth.uid() = id`). (Existing investigation suggests this is in place, but the API change ensures we comply with it).

## 5. Success Metrics
*   The user 'alesierraalta' (and any other Premium user) sees the "Premium" badge and features immediately upon refresh.
*   Server logs show "Subscription status: Premium" instead of "Free".

## 6. Security Considerations
*   This change improves security by ignoring client-side input (`userId` param) for the critical operation of determining privileges.
