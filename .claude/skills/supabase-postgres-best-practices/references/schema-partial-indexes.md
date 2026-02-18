# schema-partial-indexes

## Why It Matters

Partial indexes reduce index size and improve selectivity for common filters.

## Incorrect

```sql
CREATE INDEX events_created_at_idx ON events (created_at);
```

Explanation: Indexes all rows even if most are filtered out.

## Correct

```sql
CREATE INDEX events_active_created_at_idx
  ON events (created_at)
  WHERE deleted_at IS NULL;
```

Explanation: Index only the active rows used by most queries.

## EXPLAIN (Optional)

```
EXPLAIN (ANALYZE, BUFFERS) SELECT ...
```

## Supabase Notes

- Use partial indexes with RLS filters where applicable.

## Additional Context

- Re-evaluate partial index predicates as product requirements change.
