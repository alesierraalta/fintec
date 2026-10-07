# Delta Spec: database

Modified capability. Adds the `feedbacks` table (capture) to the typed schema / migration /
baseline, and backfills `notifications` into the generated `Database` type to remove
`as any` casts. RLS follows the existing `auth.uid() = user_id` pattern.

## ADDED Requirements

### Requirement: REQ-DB-01 `feedbacks` table DDL

The schema MUST define a `feedbacks` table with:
`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`,
`user_id uuid REFERENCES auth.users(id) NOT NULL`,
`target_type text`,
`target_id text`,
`sentiment text CHECK (sentiment IN ('up','down','neutral'))`,
`comment text NULL`,
`created_at timestamptz DEFAULT now()`,
and a `UNIQUE (user_id, target_type, target_id)` constraint.

#### Scenario: Duplicate (user, target) insert is rejected

- GIVEN the `feedbacks` table exists with the unique constraint
- WHEN an insert duplicates an existing `(user_id, target_type, target_id)`
- THEN the insert is rejected by the unique constraint

#### Scenario: Invalid sentiment is rejected

- GIVEN the `sentiment` CHECK constraint
- WHEN an insert supplies a value outside `up|down|neutral`
- THEN the insert is rejected

### Requirement: REQ-DB-02 RLS on `feedbacks`

RLS MUST be enabled on `feedbacks`. Policies MUST allow `SELECT` and `INSERT` scoped to
`auth.uid() = user_id` (`WITH CHECK` on insert). `UPDATE`/`DELETE` scoped the same way
SHOULD be added when the capture surface needs them (optional for v1).

#### Scenario: User sees only their own rows

- GIVEN user A is authenticated
- WHEN they query `feedbacks`
- THEN only rows with `user_id = A` are returned

#### Scenario: Cross-user insert is blocked

- GIVEN user A is authenticated
- WHEN they attempt an insert with `user_id = B`
- THEN RLS rejects the insert (WITH CHECK `auth.uid() = user_id`)

### Requirement: REQ-DB-03 Supporting indexes

The schema SHOULD include an index supporting per-user chronological listing (e.g.
`(user_id, created_at DESC)`). The unique constraint already provides the lookup index
backing idempotency.

#### Scenario: Listing queries are indexed

- GIVEN the `feedbacks` table is populated
- WHEN a per-user ordered query runs
- THEN it uses the `(user_id, created_at)` index rather than a full scan

### Requirement: REQ-DB-04 Typed `Database` includes `feedbacks` and backfills `notifications`

The Supabase-generated `Database` type MUST include `feedbacks` and SHOULD backfill
`notifications` so repositories can reference both without `as any` casts. Type-check MUST
pass with zero `as any` casts on these tables.

#### Scenario: Repositories type-check without `as any`

- GIVEN the regenerated `Database` type
- WHEN `feedbacks`/`notifications` repositories are compiled
- THEN no `as any` cast is required and `type-check` passes

### Requirement: REQ-DB-05 `baseline.sql` mirrors `feedbacks`

`supabase/schemas/baseline.sql` MUST mirror the `feedbacks` DDL so baseline stays
consistent with the migration (migrations remain the source of truth).

#### Scenario: Baseline matches migration

- GIVEN the new migration and `baseline.sql`
- WHEN their `feedbacks` DDL is compared
- THEN the definitions match
