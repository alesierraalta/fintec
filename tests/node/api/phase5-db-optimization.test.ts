import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const phase5MigrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '202604091125_backend_optimization_phase5_trgm_gin.sql'
);

const readSql = (filePath: string) =>
  fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

describe('Phase 5: Database Optimization - migration safety', () => {
  it('enables the pg_trgm extension if not exists', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  });

  it('creates text search indexes using GIN and trigram ops', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_description_trgm'
    );
    expect(sql).toContain('USING gin (description gin_trgm_ops)');
    expect(sql).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_note_trgm'
    );
    expect(sql).toContain('USING gin (note gin_trgm_ops)');
    expect(sql).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_trgm'
    );
    expect(sql).toContain('USING gin (name gin_trgm_ops)');
  });

  it('creates the composite index for transactions listing with dates', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_account_date_created'
    );
    expect(sql).toContain(
      'ON public.transactions(account_id, date DESC, created_at DESC)'
    );
  });

  it('creates the composite index for categories listing', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_user_active_default'
    );
    expect(sql).toContain('ON public.categories(user_id, active, is_default)');
    expect(sql).toContain('WHERE deleted_at IS NULL');
  });

  it('keeps concurrent index creation outside an explicit transaction block', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).not.toMatch(/^BEGIN;$/im);
    expect(sql).not.toMatch(/^COMMIT;$/im);
  });

  it('refreshes planner statistics for the tables touched', () => {
    const sql = readSql(phase5MigrationPath);
    expect(sql).toContain('ANALYZE public.transactions;');
    expect(sql).toContain('ANALYZE public.categories;');
  });
});
