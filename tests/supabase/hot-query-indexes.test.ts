import { readFileSync } from 'fs';
import { join } from 'path';

describe('hot query indexes migration', () => {
  let migrationSql: string;

  beforeAll(() => {
    const migrationPath = join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260528120000_add_hot_query_indexes.sql'
    );
    migrationSql = readFileSync(migrationPath, 'utf-8');
  });

  it('should exist', () => {
    expect(migrationSql).toBeDefined();
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it('should create index for transactions(user_id, created_at)', () => {
    expect(migrationSql).toContain('idx_transactions_user_created');
    expect(migrationSql).toContain('transactions(user_id, created_at DESC)');
  });

  it('should create index for accounts(user_id, created_at)', () => {
    expect(migrationSql).toContain('idx_accounts_user_created');
    expect(migrationSql).toContain('accounts(user_id, created_at DESC)');
  });

  it('should create index for transfers(user_id, created_at)', () => {
    expect(migrationSql).toContain('idx_transfers_user_created');
    expect(migrationSql).toContain('transfers(user_id, created_at DESC)');
  });

  it('should create index for budgets(user_id, created_at)', () => {
    expect(migrationSql).toContain('idx_budgets_user_created');
    expect(migrationSql).toContain('budgets(user_id, created_at DESC)');
  });

  it('should create index for goals(user_id, created_at)', () => {
    expect(migrationSql).toContain('idx_goals_user_created');
    expect(migrationSql).toContain('goals(user_id, created_at DESC)');
  });

  it('should use CONCURRENTLY for non-blocking creation', () => {
    expect(migrationSql).toContain('CREATE INDEX CONCURRENTLY IF NOT EXISTS');
  });

  it('should analyze tables after index creation', () => {
    expect(migrationSql).toContain('ANALYZE public.transactions');
    expect(migrationSql).toContain('ANALYZE public.accounts');
    expect(migrationSql).toContain('ANALYZE public.transfers');
    expect(migrationSql).toContain('ANALYZE public.budgets');
    expect(migrationSql).toContain('ANALYZE public.goals');
  });

  it('should be idempotent (IF NOT EXISTS)', () => {
    const indexCount = (migrationSql.match(/IF NOT EXISTS/g) || []).length;
    expect(indexCount).toBeGreaterThanOrEqual(5);
  });
});
