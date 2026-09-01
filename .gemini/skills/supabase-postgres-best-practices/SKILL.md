---
name: supabase-postgres-best-practices
description: "Supabase Postgres performance, RLS, indexes, pooling, diagnostics, schema, and freshness. Trigger: SQL queries, query plans, indexes, RLS policies, Postgres tuning, Supavisor, database performance."
license: Apache-2.0
metadata:
  author: gentleman-programmer
  version: "1.0"
  scope: [root]
  auto_invoke:
    - 'Writing SQL queries or designing schemas'
    - 'Implementing indexes or query optimization'
    - 'Reviewing database performance issues'
    - 'Configuring connection pooling or scaling'
    - 'Optimizing for Postgres-specific features'
    - 'Working with Row-Level Security (RLS)'
---

## Activation Contract

Activate for FinTec Supabase/Postgres query, schema, RLS, connection, locking, or performance work. Read the narrow reference needed; use evidence, not assumptions.

## Hard Rules

- Measure with `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements`, and current table statistics before and after changes.
- Index RLS, filter, join, and order columns with correct leading keys. The transaction shape is `account_id IN (...) ORDER BY date, created_at`; design and validate indexes against that shape.
- Wrap row-independent auth helpers as `(select auth.uid())`; verify policy behavior with representative queries.
- Use Supavisor transaction pooling for temporary/serverless workloads; use session pooling or direct connections where session state or appropriate long-lived access requires it.
- Keep transactions short and avoid idle-in-transaction sessions.
- Remove redundant or overlapping indexes only with usage/plan evidence and a safe rollback path.
- Inspect client/framework caches and invalidation before attributing stale results to Postgres; Realtime signals require authoritative refetch and reconnect/resync.

## Decision Gates

| Situation | Action |
| --- | --- |
| Slow query | Capture plan, stats, cardinality, and workload first |
| RLS query | Optimize policy expression and supporting leading-key indexes |
| Serverless/temporary connection | Supavisor transaction pooling |
| Session state or long-lived connection | Session pooling or direct mode |
| Proposed index removal | Require evidence of redundancy and low usage |

## Execution Steps

1. Record exact query, RLS policy, parameters, workload, and freshness layer.
2. Inspect plan, `pg_stat_statements`, and statistics.
3. Apply the smallest evidence-backed SQL/design change.
4. Re-measure, test policy isolation, and check cache invalidation and transaction duration.

## Output Contract

Report evidence, query/index or policy change, pool mode, validation results, freshness implications, and residual risk. Do not claim improvement without measurements.

## References

- `references/query-missing-indexes.md`
- `references/schema-partial-indexes.md`
- `references/transaction-freshness.md`
- `references/external-links.md`
