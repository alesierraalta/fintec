import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('orders migration', () => {
  it('creates orders table, indexes, and RLS policies', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260401153000_create_orders_for_manual_binance_checkout.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.orders');
    expect(migration).toContain(
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()'
    );
    expect(migration).toContain(
      'user_id UUID NOT NULL REFERENCES auth.users(id)'
    );
    expect(migration).toContain('service_name TEXT NOT NULL');
    expect(migration).toContain('amount NUMERIC NOT NULL');
    expect(migration).toContain('sender_reference TEXT NOT NULL');
    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'pending'");
    expect(migration).toContain('idx_orders_user_id_created_at');
    expect(migration).toContain('idx_orders_user_id_status');
    expect(migration).toContain(
      'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('Users can view own orders');
    expect(migration).toContain('Users can insert own orders');
    expect(migration).toContain('supabase_realtime');
    expect(migration).toContain('ADD TABLE public.orders');
  });
});
