# Delta Spec: feedback

New capability. Captures "¿Esto te ha servido? 👍 👎" reactions plus optional full
feedback via a `feedbacks` table, a `FeedbacksRepository`, and `POST /api/feedback`.

## ADDED Requirements

### Requirement: REQ-FB-01 Reusable inline feedback prompt

The system MUST provide a reusable client component `FeedbackPrompt` parameterized by
`target_type` and `target_id`. The component SHALL render the prompt
"¿Esto te ha servido? 👍 👎" and MUST be embeddable on any page that references a
feedback target.

#### Scenario: Prompt renders for a target

- GIVEN a page that mounts `FeedbackPrompt` with `target_type="report"` and `target_id="r-123"`
- WHEN the component renders
- THEN the "¿Esto te ha servido? 👍 👎" prompt is displayed for that target

#### Scenario: Prompt is reusable across targets

- GIVEN two pages referencing different `target_type`/`target_id` pairs
- WHEN each mounts its own `FeedbackPrompt`
- THEN each prompt is scoped to its own target and reacts independently

### Requirement: REQ-FB-02 One reaction per user+target with no re-show

The system MUST allow at most one reaction per `(user_id, target_type, target_id)`
combination. This MUST be enforced by a database unique constraint and reflected as
idempotent client behavior. The UI MUST NOT re-show the active prompt for a target the
user has already reacted to (local dismissed state, no spam).

#### Scenario: Already-reacted target hides the prompt on reload

- GIVEN a user who already submitted feedback for `target_type="report"`, `target_id="r-123"`
- WHEN the page reloads and `FeedbackPrompt` mounts for that target
- THEN the active prompt is hidden and the existing reaction state is shown instead

#### Scenario: Duplicate reaction is idempotent

- GIVEN a user who already reacted to a target
- WHEN they submit the same reaction again
- THEN the system does NOT create a second `feedbacks` row (unique constraint / idempotent)

#### Scenario: Locally dismissed prompt stays dismissed in session

- GIVEN a user dismisses the prompt locally
- WHEN the component re-renders within the same session
- THEN the prompt does not reappear for that target

### Requirement: REQ-FB-03 Thumbs up/down with optional full feedback

The system MUST support `up` and `down` sentiment reactions. Selecting either thumb
MUST allow expanding to a textarea for an optional comment, and submitting the comment
MUST persist the full feedback. A reaction with an empty comment MUST be accepted
(`comment` is nullable).

#### Scenario: Clicking 👍 records the reaction

- GIVEN a user viewing an active prompt
- WHEN they click 👍
- THEN the reaction is posted and the UI shows the recorded `up` state

#### Scenario: Expanding to comment and submitting full feedback

- GIVEN a user clicked 👍 and expanded the textarea
- WHEN they type a comment and submit
- THEN a `feedbacks` row is persisted with `sentiment="up"` and the comment text

#### Scenario: Thumbs-only submission is accepted

- GIVEN a user clicks 👎 without writing a comment
- WHEN they submit
- THEN the feedback is accepted with `sentiment="down"` and `comment` NULL

### Requirement: REQ-FB-04 POST /api/feedback with validation, RLS, and RDD receipt

The system MUST expose `POST /api/feedback`. The handler MUST validate the request body
with Zod, MUST set `user_id` server-side from the authenticated session (MUST NOT trust a
client-supplied `user_id`), MUST operate under RLS, and on success MUST return an RDD
receipt containing the created row `id` and `created_at` for lineage.

#### Scenario: Authenticated valid submission returns a receipt

- GIVEN an authenticated user
- WHEN they POST `{ target_type, target_id, sentiment, comment? }` valid per Zod
- THEN the server returns 2xx with `{ id, created_at }` of the persisted row

#### Scenario: Spoofed user_id is rejected or overwritten

- GIVEN a request that includes a `user_id` different from the session user
- WHEN the server processes it
- THEN the stored row uses `auth.uid()` and the spoofed `user_id` is NOT persisted

#### Scenario: Unauthenticated request is rejected

- GIVEN an unauthenticated request to `POST /api/feedback`
- WHEN the handler runs
- THEN it returns 401 or 403

#### Scenario: Invalid body is rejected with validation error

- GIVEN a POST with a missing `target_type` or an invalid `sentiment`
- WHEN the handler validates with Zod
- THEN it returns a 4xx response describing the validation failure
