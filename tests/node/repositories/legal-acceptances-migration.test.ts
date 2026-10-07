import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('legal acceptances migration', () => {
  it('creates the ledger with versioned consent, identity link, and RLS', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260805120000_legal_acceptances.sql'
      ),
      'utf8'
    );

    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.legal_acceptances'
    );
    // Consent must be traceable to an auth user and to concrete versions.
    expect(migration).toContain(
      'user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE'
    );
    expect(migration).toContain('legal_version text NOT NULL');
    expect(migration).toContain('terms_version text NOT NULL');
    expect(migration).toContain('privacy_version text NOT NULL');
    expect(migration).toContain(
      "CHECK (source IN ('signup', 'oauth', 're-consent'))"
    );
    // Re-submitting the same version is idempotent per user.
    expect(migration).toContain('legal_acceptances_user_version_idx');
    expect(migration).toContain('(user_id, legal_version)');

    expect(migration).toContain(
      'ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('USING (auth.uid() = user_id)');
    expect(migration).toContain('WITH CHECK (auth.uid() = user_id)');
  });

  it('keeps acceptances immutable for account owners (no update/delete policy)', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260805120000_legal_acceptances.sql'
      ),
      'utf8'
    );

    // An erasable consent record proves nothing: the ledger must not grant
    // UPDATE or DELETE to account owners. Erasure happens only through the
    // elevated-privilege account deletion path.
    expect(migration).not.toContain('FOR UPDATE');
    expect(migration).not.toContain('FOR DELETE');
  });
});
