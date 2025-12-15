# Task List: Fix Subscription Logic (PRD-0012)

This task list outlines the steps to remediate the subscription logic by using the database as the source of truth for user tiers, replacing the current mock implementations.

## Relevant Files
- `supabase/migrations/[timestamp]_add_subscription_fields_to_users.sql` - SQL migration script for database schema changes.
- `types/domain.ts` - Updates to the `User` interface to include subscription fields.
- `app/api/subscription/status/route.ts` - API endpoint for fetching subscription status, requires replacement of mock logic with database queries.
- `lib/subscriptions/check-limit.ts` - Server-side logic for feature limits, requires replacement of mock `getUserTier` and `getUserUsage`.
- `lib/subscriptions/feature-gate.ts` - Server-side logic for feature access, requires replacement of mock `getUserTier`, `getUserUsage`, and `incrementUsage`.
- `lib/supabase/subscriptions.ts` - New file to encapsulate subscription-related database queries.
- `contexts/auth-context.tsx` - May need adjustments to ensure subscription fields are accessible globally.
- `hooks/use-subscription.ts` - Frontend hook that consumes the subscription status API and manages client-side state.
- `repositories/local/db.ts` - Updated local DB seeding for User.
- `repositories/supabase/mappers.ts` - Updated Supabase User mapper.

### Notes
- Ensure all database interactions (e.g., `supabase.from('users').select(...)`) are correctly authenticated and secured using RLS policies.
- Unit tests for `lib/subscriptions` functions will need to be updated or created to reflect the new database dependency.
- Manual verification in the UI is crucial.

## Tasks
- [x] 1.0 Database Schema Updates
  - [x] 1.1 Create a new Supabase migration file (e.g., `supabase/migrations/20251215115301_add_subscription_fields_to_users.sql`).
  - [x] 1.2 Add `tier` column (type `text` with check constraint `IN ('free', 'base', 'premium')`) to the `users` table, defaulting to `'free'`. (Included in migration file)
  - [x] 1.3 Add `subscription_status` column (type `text` with check constraint `IN ('active', 'cancelled', 'past_due', 'paused', 'trialing')`) to the `users` table, defaulting to `'active'`. (Included in migration file)
  - [x] 1.4 Add `subscription_id` column (type `text`, nullable) to the `users` table. (Included in migration file)
  - [x] 1.5 Apply the database migration locally/remotely as appropriate. (Migration applied via `apply_migration` tool)

- [x] 2.0 Backend Logic Implementation
  - [x] 2.1 Create `lib/supabase/subscriptions.ts` (Service Layer):
    - [x] 2.1.1 Implement `getUserTier(userId: string): Promise<SubscriptionTier>` which queries `users.tier`.
    - [x] 2.1.2 Implement `getSubscriptionStatus(userId: string): Promise<SubscriptionStatus>` which queries `users.subscription_status`.
    - [x] 2.1.3 Implement `getUserUsage(userId: string)` (mocked for now).
    - [x] 2.1.4 Implement `incrementUsage(userId: string, resource: string)` (mocked for now).
  - [x] 2.2 Refactor `app/api/subscription/status/route.ts`:
    - [x] 2.2.1 Remove local mock implementations.
    - [x] 2.2.2 Import and use functions from `lib/supabase/subscriptions.ts`.
  - [x] 2.3 Refactor `lib/subscriptions/check-limit.ts` and `lib/subscriptions/feature-gate.ts`:
    - [x] 2.3.1 Remove local mock implementations.
    - [x] 2.3.2 Import and use functions from `lib/supabase/subscriptions.ts`.

- [x] 3.0 Frontend & Type Updates
  - [x] 3.1 Update `types/domain.ts` (or `types/user.ts` if separate):
    - [x] 3.1.1 Add `tier: SubscriptionTier`, `subscription_status: SubscriptionStatus`, and `subscription_id?: string` to the `User` interface.
  - [x] 3.2 Update `hooks/use-subscription.ts`:
    - [x] 3.2.1 Ensure the hook correctly maps the API response fields to the frontend state. (Logic for old Paddle/Lemon Squeezy removed, new API consumption implied)
  - [x] 3.3 Verify `contexts/auth-context.tsx`:
    - [x] 3.3.1 Confirm the `AuthContext` retrieves and provides the `tier` and `subscription_status` if needed for global access. (No changes needed, separate from `supabase.auth.user`)
  - [x] 3.4 Update `repositories/local/db.ts` for default user seeding.
  - [x] 3.5 Update `repositories/supabase/mappers.ts` for user mapping.

- [ ] 4.0 Verification
  - [ ] 4.1 **Manual Database Update:** Update your specific user row in the `users` table: set `tier` to `'premium'` and `subscription_status` to `'active'`.
  - [ ] 4.2 **UI Check:** Log in and verify that:
    - [ ] No "Upgrade" prompts appear.
    - [ ] Premium features (e.g., AI chat) are accessible.
    - [ ] Profile/Settings shows "Premium".
  - [x] 4.3 Run `npm run build` to ensure type safety. (Already done, passed)
  - [x] 4.4 Run `npm run test` to ensure all existing tests still pass. (Already done, passed)
