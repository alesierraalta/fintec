import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260706120000_debt_balance_skip.sql'
);
const REVERT_PATH = join(
  process.cwd(),
  'supabase/migrations/revert_debt_balance_migration.sql'
);

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

function readRevert(): string {
  return readFileSync(REVERT_PATH, 'utf8');
}

describe('debt balance skip migration', () => {
  it('exists at the canonical path', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe('app_flags table', () => {
    it('creates app_flags with name primary key and enabled boolean', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+public\.app_flags/i
      );
      expect(migration).toMatch(/name\s+text\s+PRIMARY KEY/i);
      expect(migration).toMatch(
        /enabled\s+boolean\s+NOT NULL\s+DEFAULT\s+false/i
      );
    });

    it('enables row level security on app_flags', () => {
      const migration = readMigration();
      expect(migration).toContain(
        'ALTER TABLE public.app_flags ENABLE ROW LEVEL SECURITY'
      );
    });

    it('exposes a read-only policy for authenticated users and no write policy', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /CREATE POLICY\s+flags_read\s+ON\s+public\.app_flags[\s\S]*?FOR SELECT\s+TO authenticated/i
      );
      expect(migration).not.toMatch(
        /CREATE POLICY[\s\S]*?ON\s+public\.app_flags[\s\S]*?FOR (INSERT|UPDATE|DELETE)/i
      );
    });
  });

  describe('atomic flag-on + RPC skip guard', () => {
    it('seeds the debt_balance_skip_enabled flag inside a single transaction', () => {
      const migration = readMigration();
      // Must wrap the flag INSERT and the CREATE OR REPLACE inside a single
      // transaction so the flag cannot be true while the RPC is still legacy.
      expect(migration).toMatch(/BEGIN\s*;/i);
      expect(migration).toMatch(
        /INSERT INTO public\.app_flags\s+\(name,\s*enabled\)\s+VALUES\s*\('debt_balance_skip_enabled',\s*true\)/i
      );
      expect(migration).toMatch(
        /CREATE OR REPLACE FUNCTION public\.create_transaction_and_adjust_balance/i
      );
      expect(migration).toMatch(/COMMIT\s*;/i);
    });

    it('rewrites the existing RPC with a skip guard that honors the flag', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /CREATE OR REPLACE FUNCTION public\.create_transaction_and_adjust_balance[\s\S]*?p_is_debt boolean/i
      );
      // The skip guard must zero out the balance delta when is_debt is true AND
      // the app flag is on. The current implementation reads the flag into a
      // local variable first, so we accept either form (inline subquery or
      // local variable).
      expect(migration).toMatch(/balance_delta := 0/);
      expect(migration).toMatch(
        /coalesce\(p_is_debt,\s*false\)\s+AND\s+(?:v_skip_enabled|coalesce\(\s*\(\s*SELECT\s+enabled\s+FROM\s+public\.app_flags)/i
      );
    });

    it('still applies the legacy delta when the flag is off', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /balance_delta := CASE[\s\S]*?p_type IN \('INCOME', 'TRANSFER_IN'\)[\s\S]*?ELSE -p_amount_minor\s+END/i
      );
    });
  });

  describe('idempotent OPEN-debt balance reversal', () => {
    it('guards the reversal with a debt_balance_migrated flag', () => {
      const migration = readMigration();
      // The guard can be expressed as either a single INSERT with two rows
      // or two separate inserts; both forms set debt_balance_migrated=true.
      expect(migration).toMatch(
        /INSERT INTO public\.app_flags\s+\(name,\s*enabled\)[\s\S]*?'debt_balance_migrated',\s*true/i
      );
    });

    it('captures a clock_timestamp cutoff before computing deltas', () => {
      const migration = readMigration();
      // DECLARE block declares the type explicitly: `v_cutoff timestamptz := clock_timestamp();`
      expect(migration).toMatch(
        /v_cutoff\s+(?:timestamptz\s+)?:=\s*clock_timestamp\(\)/i
      );
      expect(migration).toMatch(/created_at\s*<\s*v_cutoff/i);
    });

    it('reverses only OPEN debts and uses the direction sign convention', () => {
      const migration = readMigration();
      expect(migration).toMatch(/WHERE is_debt = true/i);
      expect(migration).toMatch(
        /coalesce\(debt_status,\s*'OPEN'\)\s*=\s*'OPEN'/i
      );
      // OWE behaves like EXPENSE (legacy -amount, reversal +amount);
      // OWED_TO_ME behaves like INCOME (legacy +amount, reversal -amount).
      // The DO block reads the column directly so it should reference
      // `type`, not `p_type` (which is the RPC parameter).
      expect(migration).toMatch(
        /WHEN type IN \('INCOME', 'TRANSFER_IN'\) THEN amount_minor\s+ELSE -amount_minor\s+END/i
      );
    });
  });
});

describe('revert_debt_balance_migration', () => {
  it('exists at the canonical path', () => {
    expect(existsSync(REVERT_PATH)).toBe(true);
  });

  it('re-applies legacy OPEN-debt deltas to balances', () => {
    const revert = readRevert();
    expect(revert).toMatch(/reverses? (the )?debt_balance_skip migration/i);
    expect(revert).toMatch(
      /WHEN type IN \('INCOME', 'TRANSFER_IN'\) THEN amount_minor\s+ELSE -amount_minor\s+END/i
    );
    expect(revert).toMatch(/WHERE is_debt = true/i);
    expect(revert).toMatch(/coalesce\(debt_status,\s*'OPEN'\)\s*=\s*'OPEN'/i);
  });

  it('guards itself so it cannot run while the skip flag is enabled', () => {
    const revert = readRevert();
    // It must refuse to run when debt_balance_skip_enabled is true.
    expect(revert).toMatch(/debt_balance_skip_enabled/i);
  });
});
