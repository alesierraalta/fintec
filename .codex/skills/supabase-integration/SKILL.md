---
name: supabase-integration
description: "Supabase integration, Auth, Database, RLS, Storage, Realtime, freshness, repository patterns. Trigger: Supabase, authentication, database queries, RLS, storage, Realtime, cache invalidation."
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: "1.0"
  scope: [root]
  auto_invoke: 'Using Supabase, authentication, database queries, RLS, storage, or realtime'
---

## Activation Contract

Activate for FinTec Supabase Auth, database, RLS, Storage, Realtime, repository, or freshness work. Treat this file as a runtime contract; inspect local references before complex changes.

## Hard Rules

- Client components use the browser repository through `RepositoryProvider`; never create a server client in browser code.
- Server routes use the cookie-aware server Supabase client.
- Transactions are account-scoped: use `transactions.account_id`; never assume `transactions.user_id`.
- Create transactions through synchronous `create_transaction_and_adjust_balance` RPC; preserve its atomic balance update.
- RLS is mandatory. For row-independent helpers, write `(select auth.uid())` to enable an init plan.
- Inspect framework/client caches before blaming Supabase. Current `useOptimizedData`/localStorage freshness is 2 minutes for transactions and 10 minutes for accounts.
- Every mutation invalidates or reloads affected transaction, account, and derived views. Realtime is an update signal followed by authoritative refetch, with reconnect/resync; it is not the source of truth.

## Decision Gates

| Situation | Action |
| --- | --- |
| Browser component | Browser repository via `RepositoryProvider` |
| Server route | Cookie-aware server client |
| Transaction write | Synchronous RPC, then invalidate/refetch |
| Stale data | Check cache TTL and invalidation before backend diagnosis |
| Cross-client updates | Optional Realtime signal plus authoritative refetch and resync |

## Execution Steps

1. Identify execution boundary, repository, account scope, RLS, and cache layers.
2. Read the relevant reference files.
3. Implement the smallest change, preserving atomic writes.
4. Invalidate/reload all affected views and verify reconnect behavior.

## Output Contract

Report changed files, boundary/repository choice, RLS and freshness handling, validation, unresolved risks, and whether registry refresh remains pending.

## References

- `../supabase-postgres-best-practices/references/transaction-freshness.md`
- `../supabase-postgres-best-practices/references/external-links.md`
