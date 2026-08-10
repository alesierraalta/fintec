import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Issue #45 regression tests for the SECURITY DEFINER financial RPC hardening.
 *
 * The four RPCs below were granted to `anon` and carried the default PUBLIC
 * EXECUTE, so the public anonymous key alone could mint transactions, adjust
 * any account balance, forge transfers, execute any recurring transaction and
 * approve any payment order. The forward migration revokes PUBLIC + anon (and
 * authenticated for approve_payment_order) and adds auth.uid() ownership guards
 * that preserve service-role operation (auth.uid() IS NULL for service_role).
 *
 * Each assertion names the real regression it catches: reverting a REVOKE, a
 * grant, a guard, or letting the baseline and the migration drift apart.
 */
describe('financial RPC authorization hardening (issue #45)', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260810120000_harden_financial_rpc_authorization.sql'
    ),
    'utf8'
  );
  const baseline = readFileSync(
    join(process.cwd(), 'supabase/schemas/baseline.sql'),
    'utf8'
  );

  // Full argument signatures as used by the migration (unquoted) and by the
  // baseline dump (double-quoted, pg_dump style).
  const rpcs = [
    {
      name: 'approve_payment_order',
      migrationSignature: 'public.approve_payment_order(uuid, uuid, uuid)',
      baselineSignature:
        '"public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid")',
      ownerGuard: 'only the service role can approve payment orders',
      authenticatedRevoked: true,
    },
    {
      name: 'create_transaction_and_adjust_balance (integer overload)',
      migrationSignature:
        'public.create_transaction_and_adjust_balance(uuid, uuid, text, text, integer, integer, numeric, date, text, text, text[])',
      baselineSignature:
        '"public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[])',
      ownerGuard: 'v_caller uuid := auth.uid();',
      authenticatedRevoked: false,
    },
    {
      name: 'create_transaction_and_adjust_balance (bigint overload)',
      migrationSignature:
        'public.create_transaction_and_adjust_balance(uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamp with time zone)',
      baselineSignature:
        '"public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone)',
      ownerGuard: 'WHERE id = p_account_id AND user_id = auth.uid()',
      authenticatedRevoked: false,
    },
    {
      name: 'create_transfer',
      migrationSignature:
        'public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text)',
      baselineSignature:
        '"public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text")',
      ownerGuard: 'p_user_id <> auth.uid()',
      authenticatedRevoked: false,
    },
    {
      name: 'execute_due_recurring_transaction',
      migrationSignature:
        'public.execute_due_recurring_transaction(uuid, bigint, numeric, date, date)',
      baselineSignature:
        '"public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date")',
      ownerGuard: "cannot execute another user''s recurring transaction",
      authenticatedRevoked: false,
    },
  ];

  const revokeFrom = (file: string, signature: string, role: string) =>
    file.includes(`REVOKE ALL ON FUNCTION ${signature} FROM ${role};`);
  const grantTo = (file: string, signature: string, role: string) =>
    file.includes(`GRANT ALL ON FUNCTION ${signature} TO ${role};`);

  describe('migration revokes anonymous EXECUTE (incl. PUBLIC, which anon inherits)', () => {
    for (const rpc of rpcs) {
      it(rpc.name, () => {
        expect(revokeFrom(migration, rpc.migrationSignature, 'PUBLIC')).toBe(
          true
        );
        expect(revokeFrom(migration, rpc.migrationSignature, 'anon')).toBe(
          true
        );
      });
    }
  });

  describe('migration revokes authenticated EXECUTE only from approve_payment_order', () => {
    for (const rpc of rpcs) {
      it(rpc.name, () => {
        expect(
          revokeFrom(migration, rpc.migrationSignature, 'authenticated')
        ).toBe(rpc.authenticatedRevoked);
      });
    }
  });

  describe('migration keeps the legitimate paths granted', () => {
    for (const rpc of rpcs) {
      it(`${rpc.name}: service_role granted, authenticated ${rpc.authenticatedRevoked ? 'revoked' : 'granted'}`, () => {
        expect(grantTo(migration, rpc.migrationSignature, 'service_role')).toBe(
          true
        );
        expect(
          grantTo(migration, rpc.migrationSignature, 'authenticated')
        ).toBe(!rpc.authenticatedRevoked);
      });
    }
  });

  describe('migration adds auth.uid() ownership guards to every RPC body', () => {
    for (const rpc of rpcs) {
      it(rpc.name, () => {
        expect(migration.includes(rpc.ownerGuard)).toBe(true);
      });
    }

    it('guard only fires for authenticated callers; service-role (auth.uid() IS NULL) is preserved', () => {
      expect(migration).toContain('auth.uid() IS NULL for service_role');
    });
  });

  describe('baseline stays synchronized with the migration (same hardening)', () => {
    for (const rpc of rpcs) {
      it(rpc.name, () => {
        expect(revokeFrom(baseline, rpc.baselineSignature, 'PUBLIC')).toBe(
          true
        );
        expect(revokeFrom(baseline, rpc.baselineSignature, '"anon"')).toBe(
          true
        );
        expect(grantTo(baseline, rpc.baselineSignature, '"service_role"')).toBe(
          true
        );
        expect(baseline.includes(rpc.ownerGuard)).toBe(true);
      });
    }

    it('approve_payment_order: authenticated revoked in baseline too', () => {
      expect(
        revokeFrom(baseline, rpcs[0].baselineSignature, '"authenticated"')
      ).toBe(true);
    });
  });

  it('notifies PostgREST to reload the schema cache', () => {
    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
