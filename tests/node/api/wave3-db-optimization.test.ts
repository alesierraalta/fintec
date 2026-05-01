import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const rlsMigrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '202604081613_backend_resource_optimization_rls.sql'
);
const indexMigrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '202604081614_backend_resource_optimization_indexes.sql'
);

const readSql = (filePath: string) =>
  fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const getCreatePolicyStatements = (sql: string) =>
  sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [];

describe('Phase 3: Database Optimization - migration safety', () => {
  describe('Task 3.1: RLS policy rewrites', () => {
    it('rewrites the hot auth.uid policies to initplan-safe select auth.uid without changing policy intent', () => {
      const sql = readSql(rlsMigrationPath);

      const expectedPolicies = [
        'CREATE POLICY "Users can insert own profile" ON public.users\n  FOR INSERT\n  WITH CHECK (id = (select auth.uid()));',
        'CREATE POLICY "Users can view own profile" ON public.users\n  FOR SELECT\n  USING (id = (select auth.uid()));',
        'CREATE POLICY "Users can update own profile" ON public.users\n  FOR UPDATE\n  USING (id = (select auth.uid()));',
        'CREATE POLICY "Users can view own accounts" ON public.accounts\n  FOR SELECT\n  USING (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can insert own accounts" ON public.accounts\n  FOR INSERT\n  WITH CHECK (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can update own accounts" ON public.accounts\n  FOR UPDATE\n  USING (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can delete own accounts" ON public.accounts\n  FOR DELETE\n  USING (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can view own recurring transactions" ON public.recurring_transactions\n  FOR SELECT\n  USING (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can insert own recurring transactions" ON public.recurring_transactions\n  FOR INSERT\n  WITH CHECK (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can update own recurring transactions" ON public.recurring_transactions\n  FOR UPDATE\n  USING (user_id = (select auth.uid()));',
        'CREATE POLICY "Users can delete own recurring transactions" ON public.recurring_transactions\n  FOR DELETE\n  USING (user_id = (select auth.uid()));',
      ];

      expectedPolicies.forEach((policy) => {
        expect(sql).toContain(policy);
      });

      expect(sql).toContain(
        'CREATE POLICY "category_select_secure" ON public.categories'
      );
      expect(sql).toContain('((select auth.uid()) IS NOT NULL)');
      expect(sql).toContain(
        '((user_id = (select auth.uid())) AND (deleted_at IS NULL))'
      );
      expect(sql).toContain(
        'CREATE POLICY "Users can delete own transfers" ON public.transfers'
      );
      expect(sql).toContain(
        'CREATE POLICY "Users can view own transactions" ON public.transactions'
      );
    });

    it('does not weaken categories or exchange-rates security while applying the rewrite', () => {
      const sql = readSql(rlsMigrationPath);

      expect(sql).toContain(
        'WITH CHECK (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (is_default = false) AND (deleted_at IS NULL))'
      );
      expect(sql).toContain(
        'WITH CHECK (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (is_default = false) AND (deleted_at IS NOT NULL))'
      );
      expect(sql).not.toContain('Exchange rates are public');
      expect(sql).not.toContain('Admins can insert exchange rates');
    });

    it('eliminates bare auth.uid() calls from created policy bodies', () => {
      const sql = readSql(rlsMigrationPath);
      const policyStatements = getCreatePolicyStatements(sql);

      expect(policyStatements.length).toBeGreaterThan(0);

      policyStatements.forEach((statement) => {
        const withoutInitPlanPattern = statement.replaceAll(
          '(select auth.uid())',
          ''
        );

        expect(withoutInitPlanPattern).not.toMatch(/auth\.uid\(\)/i);
      });
    });
  });

  describe('Task 3.2: index migration safety', () => {
    it('creates only advisor-backed missing indexes and avoids duplicate/nonexistent-column indexes', () => {
      const sql = readSql(indexMigrationPath);

      const expectedIndexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_checkpoints_user_id',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_messages_session_id',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_orders_reviewed_by',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_orders_transaction_id',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_to_transaction_id',
      ];

      expectedIndexes.forEach((indexStatement) => {
        expect(sql).toContain(indexStatement);
      });

      expect(sql).not.toMatch(/idx_transactions_account_date_created/i);
      expect(sql).not.toMatch(
        /CREATE INDEX[\s\S]*ON public\.exchange_rates\([^)]*(base_currency|quote_currency)/i
      );
      expect(sql).not.toMatch(/idx_categories_user_active/i);
      expect(sql).not.toMatch(/idx_accounts_user_active/i);
    });

    it('keeps concurrent index creation outside an explicit transaction block', () => {
      const sql = readSql(indexMigrationPath);

      expect(sql).toMatch(/CREATE INDEX CONCURRENTLY IF NOT EXISTS/i);
      expect(sql).not.toMatch(/^BEGIN;$/im);
      expect(sql).not.toMatch(/^COMMIT;$/im);
    });

    it('refreshes planner statistics for the tables touched by new indexes', () => {
      const sql = readSql(indexMigrationPath);

      [
        'ANALYZE public.agent_checkpoints;',
        'ANALYZE public.ai_conversation_messages;',
        'ANALYZE public.payment_orders;',
        'ANALYZE public.transfers;',
      ].forEach((statement) => {
        expect(sql).toContain(statement);
      });
    });
  });
});
