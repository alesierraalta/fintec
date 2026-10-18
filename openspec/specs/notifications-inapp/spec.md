# Delta Spec: notifications-inapp

New capability. Surfaces system notifications through an in-app center, reusing the
existing (orphaned) `notifications` repository and React Query polling (v1; realtime is
explicit phase 2, out of scope).

## ADDED Requirements

### Requirement: REQ-NT-01 Notification bell with unread badge (polling)

The system MUST render a `NotificationBell` containing an unread-count badge. The badge
MUST be refreshed via React Query polling of `countUnreadByUserId` at an interval between
30 and 60 seconds.

#### Scenario: Badge reflects unread count

- GIVEN a user with unread notifications
- WHEN the bell polls `countUnreadByUserId`
- THEN the badge displays the current unread count

#### Scenario: Badge clears when read

- GIVEN a user whose notifications are all read
- WHEN the bell polls again
- THEN the badge shows zero / is hidden

### Requirement: REQ-NT-02 Notification panel listing

The system MUST render a panel that lists the user's notifications via
`findUnreadByUserId`/`findByUserId`, showing title, message, type, is_read, action_url,
and created_at, ordered by recency (newest first).

#### Scenario: Panel lists notifications on open

- GIVEN a user opens the notification panel
- WHEN the list loads
- THEN notifications are shown newest-first with title, message, type, and read state

#### Scenario: Panel respects user scoping

- GIVEN a user opens the panel
- WHEN data loads under RLS
- THEN only that user's notifications are listed (no other users' rows)

### Requirement: REQ-NT-03 Mark as read (single and all)

The system MUST allow marking a single notification read (`markAsRead`) and marking all
unread notifications read (`markAllAsRead`).

#### Scenario: Single notification marked read

- GIVEN an unread notification in the panel
- WHEN the user marks it read
- THEN it becomes read and the unread badge count decrements

#### Scenario: Mark all read clears the badge

- GIVEN multiple unread notifications
- WHEN the user marks all as read
- THEN all become read and the badge clears

### Requirement: REQ-NT-04 Sonner toast on newly detected notifications

The system MUST display a sonner toast when a poll detects new/unread notifications that
were not present in the previous poll. No toast MUST be shown when no new notifications
are detected.

#### Scenario: Toast fires on newly inserted notification

- GIVEN a notification is inserted in the background
- WHEN the next poll detects it as new
- THEN a sonner toast is shown to the user

#### Scenario: No toast when nothing is new

- GIVEN no new notifications since the last poll
- WHEN the poll runs
- THEN no toast is displayed
