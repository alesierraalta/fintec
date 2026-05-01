import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('backend resource optimization migrations', () => {
  it('references 202604081613_backend_resource_optimization_rls.sql and rewrites policies to initplan-safe auth.uid()', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/202604081613_backend_resource_optimization_rls.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE POLICY');
    expect(migration).toContain('(select auth.uid())');
    expect(migration).toContain('"Users can view own accounts"');
    expect(migration).toContain('"Users can view own transactions"');
    expect(migration).toContain('"category_select_secure"');
    expect(migration).toContain('"Users can view own transfers"');
    expect(migration).toContain('"Users can view own recurring transactions"');
  });

  it('references 202604081614_backend_resource_optimization_indexes.sql and adds missing FK indexes concurrently', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/202604081614_backend_resource_optimization_indexes.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE INDEX CONCURRENTLY IF NOT EXISTS');
    expect(migration).toContain('idx_agent_checkpoints_user_id');
    expect(migration).toContain('idx_ai_conversation_messages_session_id');
    expect(migration).toContain('idx_payment_orders_reviewed_by');
    expect(migration).toContain('idx_payment_orders_transaction_id');
    expect(migration).toContain('idx_transfers_to_transaction_id');
    expect(migration).toContain('ANALYZE public.agent_checkpoints;');
  });

  it('references 202604091125_backend_optimization_phase5_trgm_gin.sql and adds trigram GIN indexes', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/202604091125_backend_optimization_phase5_trgm_gin.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    expect(migration).toContain('gin_trgm_ops');
    expect(migration).toContain('idx_transactions_description_trgm');
    expect(migration).toContain('idx_transactions_note_trgm');
    expect(migration).toContain('idx_categories_name_trgm');
    expect(migration).toContain('idx_transactions_account_date_created');
    expect(migration).toContain('idx_categories_user_active_default');
    expect(migration).toContain('ANALYZE public.transactions;');
  });
});
