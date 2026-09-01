# Partial indexes

Use a partial index only when its predicate matches a frequent, selective query and the planner can prove that predicate. Validate with `EXPLAIN (ANALYZE, BUFFERS)` and current statistics.

```sql
-- Example matching an existing FinTec query family; validate before adding.
CREATE INDEX transactions_open_debt_idx
  ON transactions (account_id, date DESC)
  WHERE is_debt = true
    AND COALESCE(debt_status, 'OPEN') = 'OPEN';
```

Do not assume a partial index helps RLS or every query. Check policy predicates, filter/join/order leading keys, workload, and overlap with existing indexes. Reassess after schema or product changes; remove indexes only with usage and plan evidence.

## Reference

- https://supabase.com/docs/guides/database/query-optimization
- https://www.postgresql.org/docs/current/indexes-partial.html
