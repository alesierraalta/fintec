---
name: supabase-postgres-best-practices
description: >
  Supabase Postgres best practices for performance optimization, query tuning, and schema design.
  Contains rules across 8 categories, prioritized by impact to guide automated optimization.
  Trigger: Writing SQL queries, designing schemas, or optimizing Postgres performance in Supabase.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke:
    - 'Writing SQL queries or designing schemas'
    - 'Implementing indexes or query optimization'
    - 'Reviewing database performance issues'
    - 'Configuring connection pooling or scaling'
    - 'Optimizing for Postgres-specific features'
    - 'Working with Row-Level Security (RLS)'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

---

## Critical Patterns

- Start with query performance and indexing before schema or feature tweaks.
- Use EXPLAIN (ANALYZE, BUFFERS) to validate changes.
- Keep transactions short and avoid idle-in-transaction connections.
- Align indexes with WHERE, JOIN, ORDER BY, and LIMIT patterns.
- Enforce RLS by default and validate policies with real queries.
- Prefer Postgres-native features (partial indexes, GIN/BRIN, generated columns).

---

## Rule Categories by Priority

| Priority | Category                 | Impact      | Prefix    |
| -------- | ------------------------ | ----------- | --------- |
| 1        | Query Performance        | CRITICAL    | query-    |
| 2        | Connection Management    | CRITICAL    | conn-     |
| 3        | Security & RLS           | CRITICAL    | security- |
| 4        | Schema Design            | HIGH        | schema-   |
| 5        | Concurrency & Locking    | MEDIUM-HIGH | lock-     |
| 6        | Data Access Patterns     | MEDIUM      | data-     |
| 7        | Monitoring & Diagnostics | LOW-MEDIUM  | monitor-  |
| 8        | Advanced Features        | LOW         | advanced- |

---

## How to Use

Read individual rule files for detailed explanations and SQL examples:

- references/query-missing-indexes.md
- references/schema-partial-indexes.md
- references/\_sections.md
- references/external-links.md

Each rule file contains:

- Brief explanation of why it matters
- Incorrect SQL example with explanation
- Correct SQL example with explanation
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

---

## Commands

```bash
# Inspect a query plan
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT ..."

# Check active connections
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity;"
```

---

## Resources

- **References**: `references/`
