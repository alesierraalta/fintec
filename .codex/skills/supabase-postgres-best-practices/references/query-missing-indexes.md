# query-missing-indexes

## Why It Matters

Missing indexes cause sequential scans, higher latency, and avoidable load.

## Incorrect

```sql
SELECT *
FROM transactions
WHERE user_id = $1
ORDER BY created_at DESC;
```

Explanation: No matching index for the filter and sort.

## Correct

```sql
CREATE INDEX CONCURRENTLY transactions_user_id_created_at_idx
  ON transactions (user_id, created_at DESC);
```

Explanation: Aligns index keys with the filter and sort order.

## EXPLAIN (Optional)

```
EXPLAIN (ANALYZE, BUFFERS) SELECT ...
```

## Supabase Notes

- Ensure auth.uid() filters are supported by matching indexes.

## Additional Context

- Check for redundant or overlapping indexes before adding new ones.
