import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RPC_MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260706120100_create_debt_with_deduction_rpc.sql'
);

function readMigration(): string {
  return readFileSync(RPC_MIGRATION_PATH, 'utf8');
}

describe('create_debt_with_deduction RPC migration', () => {
  it('exists at the canonical path', () => {
    expect(existsSync(RPC_MIGRATION_PATH)).toBe(true);
  });

  it('declares create_debt_with_deduction as SECURITY INVOKER', () => {
    const migration = readMigration();
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.create_debt_with_deduction/i
    );
    expect(migration).toMatch(/SECURITY INVOKER/i);
  });

  it('accepts the debt payload, deduct toggle, and source account parameters', () => {
    const migration = readMigration();
    // p_deduct is a boolean toggle and p_source_account_id is a uuid;
    // the source category id is needed for the linked EXPENSE.
    expect(migration).toMatch(/p_deduct\s+boolean/i);
    expect(migration).toMatch(/p_source_account_id\s+uuid/i);
    expect(migration).toMatch(/p_source_category_id\s+uuid/i);
  });

  it('inserts the debt honoring the skip flag inside one transaction', () => {
    const migration = readMigration();
    // The RPC must call the existing create_transaction_and_adjust_balance
    // (or equivalent) so the skip guard is reused — no duplicated logic.
    expect(migration).toMatch(/create_transaction_and_adjust_balance/i);
  });

  it('only creates the linked EXPENSE when p_deduct is true', () => {
    const migration = readMigration();
    expect(migration).toMatch(/IF\s+p_deduct\s+THEN/i);
  });

  it('tags the linked EXPENSE so it can be traced back to the debt', () => {
    const migration = readMigration();
    // tags must include a debt-linked marker AND a back-reference to the
    // debt id so the dashboard / reports can join them deterministically.
    expect(migration).toMatch(/'debt-linked'/i);
    expect(migration).toMatch(/'debt:'/i);
  });

  it('returns both debt and linked expense identifiers', () => {
    const migration = readMigration();
    // Return shape: json with debt_id and (when deducted) expense_id.
    expect(migration).toMatch(/debt_id/i);
    expect(migration).toMatch(/expense_id/i);
  });

  it('validates source account currency matches the debt currency', () => {
    const migration = readMigration();
    expect(migration).toMatch(
      /SELECT user_id, currency_code\s+INTO v_owner, v_source_currency_code/i
    );
    expect(migration).toMatch(
      /v_source_currency_code\s+IS DISTINCT FROM\s+p_currency_code/i
    );
    expect(migration).toMatch(
      /Source account currency must match debt currency/i
    );
  });

  it('validates debt and source category ownership on the server', () => {
    const migration = readMigration();
    expect(migration).toMatch(/WHERE id = p_category_id/i);
    expect(migration).toMatch(/Category not found or unauthorized/i);
    expect(migration).toMatch(/WHERE id = p_source_category_id/i);
    expect(migration).toMatch(/Source category not found or unauthorized/i);
    expect(migration).toMatch(/is_default/i);
    expect(migration).toMatch(/auth\.uid\(\)/i);
  });
});
