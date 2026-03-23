import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('goal contributions migration', () => {
  it('creates table, indexes, and RLS policies', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260323220000_add_goal_contributions.sql'
      ),
      'utf8'
    );

    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS goal_contributions'
    );
    expect(migration).toContain('delta_base_minor BIGINT NOT NULL');
    expect(migration).toContain(
      'related_transaction_id UUID REFERENCES transactions(id)'
    );
    expect(migration).toContain('idx_goal_contributions_goal_created_at');
    expect(migration).toContain('idx_goal_contributions_user_created_at');
    expect(migration).toContain(
      'ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('Users can view own goal contributions');
    expect(migration).toContain('Users can insert own goal contributions');
    expect(migration).toContain('Users can delete own goal contributions');
  });
});
