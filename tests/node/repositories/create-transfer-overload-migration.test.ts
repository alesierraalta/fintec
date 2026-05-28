import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('create_transfer overload fix migration', () => {
  it('drops overloaded create_transfer functions before recreating', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528010000_fix_create_transfer_overload.sql'
      ),
      'utf8'
    );

    // Must drop both the 8-param and 9-param versions
    expect(migration).toContain(
      'DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text)'
    );
    expect(migration).toContain(
      'DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text)'
    );
  });

  it('recreates create_transfer with p_note parameter', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528010000_fix_create_transfer_overload.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('p_note text DEFAULT NULL');
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.create_transfer'
    );
  });

  it('notifies PostgREST to reload schema cache', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260528010000_fix_create_transfer_overload.sql'
      ),
      'utf8'
    );

    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
