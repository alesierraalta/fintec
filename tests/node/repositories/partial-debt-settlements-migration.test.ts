import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260707023350_partial_debt_settlements.sql'
);

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf8');
}

describe('partial debt settlements migration', () => {
  it('exists at the canonical path', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  describe('debt progress columns', () => {
    it('adds paid and generated remaining columns to transactions', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /ADD COLUMN debt_paid_amount_minor BIGINT NOT NULL DEFAULT 0/i
      );
      expect(migration).toMatch(
        /ADD COLUMN debt_paid_amount_base_minor BIGINT NOT NULL DEFAULT 0/i
      );
      expect(migration).toMatch(
        /debt_remaining_amount_minor BIGINT GENERATED ALWAYS AS \(/i
      );
      expect(migration).toMatch(
        /debt_remaining_amount_base_minor BIGINT GENERATED ALWAYS AS \(/i
      );
    });

    it('constrains paid amounts to be non-negative and not exceed original debt', () => {
      const migration = readMigration();
      expect(migration).toMatch(/check_debt_paid_positive/i);
      expect(migration).toMatch(/check_debt_paid_max/i);
      expect(migration).toMatch(/check_non_debt_paid_zero/i);
    });

    it('backfills existing debts without rewriting historical balances', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /SET\s+debt_paid_amount_minor = CASE WHEN debt_status = 'SETTLED' THEN amount_minor ELSE 0 END/i
      );
    });
  });

  describe('debt_settlements ledger', () => {
    it('creates the ledger table with references and indexes', () => {
      const migration = readMigration();
      expect(migration).toMatch(/CREATE TABLE debt_settlements \(/i);
      expect(migration).toMatch(
        /debt_transaction_id UUID NOT NULL REFERENCES transactions\(id\)/i
      );
      expect(migration).toMatch(
        /settlement_transaction_id UUID NOT NULL REFERENCES transactions\(id\)/i
      );
      expect(migration).toMatch(/CREATE INDEX idx_debt_settlements_debt_id/i);
      expect(migration).toMatch(/CREATE INDEX idx_debt_settlements_user_id/i);
    });

    it('enables RLS and only allows SELECT, never direct INSERT', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /ALTER TABLE debt_settlements ENABLE ROW LEVEL SECURITY/i
      );
      expect(migration).toMatch(
        /CREATE POLICY "Users can view own debt settlements"/i
      );
      // The permissive INSERT policy must be commented out, not active.
      const lines = migration.split('\n');
      const insertPolicyLine = lines.find((l) =>
        /CREATE POLICY[\s\S]*?ON debt_settlements[\s\S]*?FOR INSERT/i.test(
          l.trim()
        )
      );
      // If such a line exists, it must be a SQL comment.
      if (insertPolicyLine !== undefined) {
        expect(insertPolicyLine.trim().startsWith('--')).toBe(true);
      }
      // The active (non-commented) INSERT policy must be absent.
      const activeInsert = lines.filter(
        (l) =>
          !l.trim().startsWith('--') &&
          /CREATE POLICY[\s\S]*?ON debt_settlements[\s\S]*?FOR INSERT/i.test(l)
      );
      expect(activeInsert.length).toBe(0);
    });
  });

  describe('settle_debt_partial RPC', () => {
    it('uses the correct parameter names p_debt_id and p_account_id', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /CREATE OR REPLACE FUNCTION settle_debt_partial\(/i
      );
      expect(migration).toMatch(/p_debt_id UUID/i);
      expect(migration).toMatch(/p_account_id UUID/i);
    });

    it('validates active account, currency match, and default/user-owned category', () => {
      const migration = readMigration();
      expect(migration).toMatch(/IF NOT v_account_row\.active THEN/i);
      expect(migration).toMatch(
        /v_account_row\.currency_code != v_debt_row\.currency_code/i
      );
      expect(migration).toMatch(
        /c\.user_id = v_user_id OR c\.is_default = true/i
      );
    });

    it('rejects non-positive and overpayment amounts', () => {
      const migration = readMigration();
      expect(migration).toMatch(/IF p_amount_minor <= 0 THEN/i);
      expect(migration).toMatch(
        /IF p_amount_minor > v_debt_row\.debt_remaining_amount_minor THEN/i
      );
    });

    it('is defined with SECURITY DEFINER and a fixed search_path', () => {
      const migration = readMigration();
      expect(migration).toMatch(
        /\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public/i
      );
    });
  });
});
