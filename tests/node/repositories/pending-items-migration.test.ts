import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('pending items migration', () => {
  it('creates table, indexes, and RLS policies', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20261005120000_add_pending_items.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS pending_items');
    expect(migration).toContain(
      "kind                     text NOT NULL CHECK (kind IN ('purchase', 'payment'))"
    );
    expect(migration).toContain('amount_base_minor        bigint');
    expect(migration).toContain(
      'converted_transaction_id uuid REFERENCES transactions(id)'
    );
    expect(migration).toContain('idx_pending_items_user_done_created');
    // FK index: converted_transaction_id must be indexed so deletes on
    // transactions never scan pending_items (tsp finding f-01, fixed).
    expect(migration).toContain('idx_pending_items_converted_transaction');
    expect(migration).toContain(
      'ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('Users can view own pending items');
    expect(migration).toContain('Users can insert own pending items');
    expect(migration).toContain('Users can update own pending items');
    expect(migration).toContain('Users can delete own pending items');
  });
});
