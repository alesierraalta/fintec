# Product Requirements Document: Switch to Bearer Token Authentication for Subscription API

## 1. Introduction
Despite implementing server-side middleware, the application continues to experience 401 Unauthorized errors when fetching subscription status. This suggests persistent issues with cookie propagation or synchronization between the client and server. To resolve this definitively, we will switch the `/api/subscription/status` endpoint to use **Bearer Token Authentication** explicitly passed from the client's active session.

## 2. Goals
*   **Immediate Stability:** Eliminate 401 errors by explicitly proving identity with the access token.
*   **Bypass Cookie Issues:** Remove reliance on implicit cookie handling for this critical data fetch.
*   **Maintain Security:** Ensure the token is verified server-side using Supabase's `getUser` with the provided token.

## 3. Functional Requirements

### 3.1. Frontend Update (`hooks/use-subscription.ts`)
*   **Retrieve Token:** Access the `session.access_token` from the `useAuth` hook.
*   **Pass Header:** Modify the `fetch` call to include `Authorization: Bearer <token>` in the headers.
*   **Dependency:** Ensure `fetchSubscription` only runs when `session` (and its token) is available.

### 3.2. Backend Update (`app/api/subscription/status/route.ts`)
*   **Extract Token:** Read the `Authorization` header from the incoming request.
*   **Verify User:** Instead of just `supabase.auth.getUser()` (which looks for cookies), configure the client or explicitly call `getUser(token)` (if supported) or rely on `supabase` client initialized with the access token.
*   **Implementation Detail:**
    *   Create a Supabase client that uses the passed `access_token` instead of (or in addition to) cookies.
    *   This is often done by passing the token to `supabase.auth.getUser(token)` or setting the session on the client instance.

## 4. Success Metrics
*   `/api/subscription/status` returns 200 OK.
*   Console logs are free of 401 errors.
*   Premium status loads immediately.

## 5. Security Considerations
*   The Bearer token is a standard, secure way to transmit identity.
*   The server must still validate the token against Supabase Auth to ensure it hasn't expired or been revoked.
