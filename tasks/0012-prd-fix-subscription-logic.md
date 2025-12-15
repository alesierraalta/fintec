# Product Requirements Document: Subscription Logic Remediation

## 1. Introduction
This document outlines the requirements to fix the subscription logic issues where users on the "premium" plan are incorrectly prompted to upgrade. Following the removal of the external payment provider (Paddle), the current system defaults all users to the 'free' tier. This task involves re-implementing a database-driven source of truth for user tiers.

## 2. Goals
*   **Correct Tier Detection:** Ensure users are recognized as 'premium' or 'base' based on their actual status in the database.
*   **Persist Subscription State:** Use Supabase as the definitive source for subscription data.
*   **Remove False Upgrade Prompts:** Eliminate "Upgrade" banners and feature blocks for users who already have the required tier.

## 3. User Stories
*   As a **premium user**, I want to access AI features and advanced reports without being asked to upgrade.
*   As an **admin**, I want to manually update a user's tier in the database and have the application reflect this change immediately.
*   As a **developer**, I want a centralized and reliable way to check user permissions that doesn't rely on third-party APIs.

## 4. Functional Requirements

### 4.1. Database Schema Update
*   **Source of Truth:** The `profiles` (or `users`) table in Supabase must have a `tier` column.
*   **Migration:** Create a migration to add `tier` (enum: 'free', 'base', 'premium') and `subscription_status` columns if they don't exist or are currently unused. Default `tier` should be 'free'.

### 4.2. Backend Logic Update (`lib/subscriptions`)
*   **Refactor `getUserTier`:** Update the mock implementation in `lib/subscriptions/check-limit.ts` (and related files) to fetch the real tier from the Supabase `profiles` table.
*   **Refactor `getUserUsage`:** Ensure usage tracking (transaction counts, AI requests) is also fetched from the database (`usage_tracking` table or similar), not mocked to zero.

### 4.3. Frontend State
*   **Context/Hook:** Update the global user context or subscription hook to fetch and cache the tier on login.
*   **UI Updates:** Ensure feature gates (e.g., `<FeatureGate feature="ai_advice">`) correctly resolve the tier against the new database value.

## 5. Non-Goals
*   **Payment Processing:** This task is **not** about adding a new payment gateway (Stripe, etc.). It is strictly about managing the *state* of the subscription.
*   **Self-Service Checkout:** Users will not be able to buy a subscription through the UI yet (since there is no payment processor). Upgrades will be manual/admin-driven for now.

## 6. Success Metrics
*   Premium users see "Premium" badge in settings/profile.
*   Premium users can access locked features (AI, unlimited exports) without interruptions.
*   Database `tier` changes are reflected in the app after a refresh.

## 7. Technical Considerations
*   **Caching:** To prevent excessive DB reads, the user's tier should be cached in the session or local storage, or fetched once per session reload.
*   **RLS (Row Level Security):** Ensure users can read their own tier but cannot write/update it (only admins/service role can update).

## 8. Open Questions
*   Do we need a dedicated `subscriptions` table, or is a column on `profiles` sufficient? (Recommendation: Start with a column on `profiles` for simplicity if no complex billing history is needed yet).
