# Query indexes

Match indexes to measured `WHERE`, RLS, `JOIN`, and `ORDER BY` predicates. For the current transaction query, validate an account-leading design such as:

```sql
-- Validate with EXPLAIN before retaining or changing it.
CREATE INDEX transactions_account_date_created_idx
  ON transactions (account_id, date DESC, created_at DESC);
```

The relevant shape is `account_id IN (...) ORDER BY date, created_at`; confirm direction, selectivity, and actual plan with `EXPLAIN (ANALYZE, BUFFERS)`. Check `pg_stat_statements` and table statistics. Do not add overlapping indexes, and remove redundancy only with usage and plan evidence.

## References

- https://supabase.com/docs/guides/database/query-optimization
- https://www.postgresql.org/docs/current/indexes-multicolumn.html
