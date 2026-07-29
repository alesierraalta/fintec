import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('finance contracts migration', () => {
  it('protects the public RPC names, payload boundaries, locking, and ownership checks', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260726150000_finance_contracts_v1.sql'
      ),
      'utf8'
    );

    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.update_transaction_and_adjust_balance('
    );
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.delete_transaction_and_adjust_balance(transaction_id uuid)'
    );
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.add_goal_contribution_atomic('
    );
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('user_id = auth.uid()');
    expect(migration).toContain(
      'Linked account currency must match the user base currency'
    );
    expect(migration).toContain('Debt progress values cannot be negative');
    expect(migration).toContain(
      'Debt progress cannot exceed the original transaction amounts'
    );
    expect(migration).toContain(
      'Settled debt progress must equal the original transaction amount'
    );
    expect(migration).toContain('CHECK (amount_base_minor >= 0) NOT VALID');
    expect(migration).not.toContain('p_debt_paid_amount_minor bigint');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.update_transaction_and_adjust_balance(');
  });
});
