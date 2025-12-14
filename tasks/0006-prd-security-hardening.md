# Product Requirements Document (PRD): Security Hardening & Vulnerability Remediation

## 1. Introduction
This document outlines the requirements for addressing critical and high-priority security vulnerabilities identified in the recent codebase audit. The focus is on securing administrative endpoints, enforcing proper authentication/authorization via middleware and Row Level Security (RLS), preventing secret leakage, and standardizing input validation.

## 2. Goals
*   **Secure All Endpoints:** Ensure no API route is accessible without proper authentication or a valid API secret (for cron jobs).
*   **Enforce RLS:** Refactor database interactions in API routes to use authenticated clients, relying on Supabase Row Level Security rather than fragile manual filtering.
*   **Prevent Secret Leaks:** Architecturally prevent server-side keys (Service Role) from being bundled into client-side code.
*   **Defense in Depth:** Implement global middleware to reject unauthenticated requests to API routes by default.
*   **Robust Validation:** Eliminate invalid input handling by implementing strict schema validation using Zod.

## 3. User Stories
*   **As an Administrator**, I want to ensure that sensitive system actions (like database initialization or forcing rate updates) can only be triggered by me or authorized automated systems (cron jobs).
*   **As a Developer**, I want the application to automatically reject unauthenticated API requests so that I don't accidentally expose a new route.
*   **As a Developer**, I want to use a database client that automatically applies the current user's security context so that I don't have to manually filter data by `user_id` in every query.
*   **As a User**, I want my inputs (like transfer amounts) to be strictly validated to prevent errors or security exploits.

## 4. Functional Requirements

### 4.1. Global Middleware Protection
*   **Requirement:** Create a `middleware.ts` file in the project root (or `src` if applicable).
*   **Behavior:** Intercept all requests to `/api/*`.
*   **Logic:**
    *   Allow requests to public endpoints (e.g., `/api/auth/*`, `/api/webhooks/*`).
    *   For all other endpoints, verify the presence of a valid Supabase Session or a valid `CRON_SECRET` header.
    *   Return `401 Unauthorized` if validation fails.

### 4.2. Secure Admin & Utility Endpoints
*   **Target Routes:** `app/api/init-database`, `app/api/force-update`, `app/api/debug-binance`.
*   **Requirement:** Implement a dual-check security mechanism.
    *   **Mechanism A (User):** Verify the user is authenticated AND has an 'admin' role (if roles exist) or specific allowed user ID.
    *   **Mechanism B (System):** Verify the request headers contain a valid secret key (e.g., `x-admin-secret` or `Authorization: Bearer <CRON_SECRET>`) matching the server environment variable.

### 4.3. Refactor Database Access (RLS Support)
*   **Target Routes:** `app/api/transfers`, `app/api/payment-orders`, and other user-facing APIs.
*   **Current State:** Uses `supabaseAnonKey` client and manually filters `.eq('accounts.user_id', userId)`.
*   **Requirement:** Replace the anonymous client creation with an **Authenticated Client**.
    *   Extract the JWT (`Authorization` header) from the incoming request.
    *   Create a Supabase client configured with this token.
    *   Remove redundant manual `user_id` checks where RLS policies handle them (verify RLS policies exist/work).

### 4.4. Secure Service Client Architecture
*   **Requirement:** Split the existing `repositories/supabase/client.ts`.
*   **Action:**
    *   Keep `lib/supabase/client.ts` for the public/anonymous client (client-side safe).
    *   Create `lib/supabase/server.ts` for the `createSupabaseServiceClient`.
    *   Add `import 'server-only'` to the new server file to prevent build-time leakage of the `SUPABASE_SERVICE_ROLE_KEY` into client bundles.

### 4.5. Input Validation with Zod
*   **Requirement:** Install `zod` (`npm install zod`).
*   **Action:** Define schemas for write operations (POST/PUT) in `transfers` and `payment-orders`.
    *   Validate fields like `amount` (positive number), `description` (string, max length), `accountId` (uuid).
    *   Replace manual `if (!body.field)` checks with `Schema.parse(body)`.

## 5. Non-Goals
*   Writing the actual SQL RLS policies in the database (assuming they exist or are managed separately, though the code must *support* using them).
*   Complete rewrite of the authentication system (we are hardening the existing one).

## 6. Technical Considerations
*   **Libraries:** `zod`, `@supabase/supabase-js`, `server-only`.
*   **Environment Variables:** Ensure `CRON_SECRET` or `ADMIN_SECRET` is defined in `.env.local`.
*   **Testing:** Verify that accessing `/api/transfers` without a token now returns 401 (via middleware) even before hitting the route handler.

## 7. Success Metrics
*   0 critical or high vulnerabilities found in subsequent security scans.
*   All API routes return 401/403 for unauthenticated access.
*   No `SUPABASE_SERVICE_ROLE_KEY` present in client-side build chunks.
