import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('bcv rate precision migration', () => {
  it('alters bcv_rate_history to NUMERIC(12,8) for 8-decimal precision', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528000000_bcv_rate_precision_8decimals.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('ALTER TABLE public.bcv_rate_history');
    expect(migration).toContain('usd TYPE NUMERIC(12, 8)');
    expect(migration).toContain('eur TYPE NUMERIC(12, 8)');
  });

  it('alters exchange_rates to NUMERIC(12,8) for snapshot precision', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528000000_bcv_rate_precision_8decimals.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('ALTER TABLE public.exchange_rates');
    expect(migration).toContain('usd_ves TYPE NUMERIC(12, 8)');
    expect(migration).toContain('usdt_ves TYPE NUMERIC(12, 8)');
    expect(migration).toContain('sell_rate TYPE NUMERIC(12, 8)');
    expect(migration).toContain('buy_rate TYPE NUMERIC(12, 8)');
  });

  it('notifies PostgREST to reload schema cache', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528000000_bcv_rate_precision_8decimals.sql'
      ),
      'utf8'
    );

    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
