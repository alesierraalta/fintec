import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('account alerting migration', () => {
  it('adds minimum_balance and alert_enabled to accounts table', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260423000000_add_minimum_balance_to_accounts.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('ALTER TABLE public.accounts');
    expect(migration).toContain(
      'ADD COLUMN minimum_balance BIGINT NOT NULL DEFAULT 0'
    );
    expect(migration).toContain(
      'ADD COLUMN alert_enabled BOOLEAN NOT NULL DEFAULT FALSE'
    );
  });
});
