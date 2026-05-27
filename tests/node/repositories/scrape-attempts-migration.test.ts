import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('scrape attempts migration', () => {
  it('creates scrape_attempts table and RLS policies', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260527000000_scrape_attempts.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE public.scrape_attempts');
    expect(migration).toContain(
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()'
    );
    expect(migration).toContain('provider TEXT NOT NULL');
    expect(migration).toContain('trigger TEXT NOT NULL');
    expect(migration).toContain('stage TEXT NOT NULL');
    expect(migration).toContain('status TEXT NOT NULL');
    expect(migration).toContain('failure_reason TEXT');
    expect(migration).toContain('started_at TIMESTAMPTZ NOT NULL');
    expect(migration).toContain('finished_at TIMESTAMPTZ');
    expect(migration).toContain('extracted_currencies TEXT[]');
    expect(migration).toContain('metadata JSONB');
    expect(migration).toContain(
      'ALTER TABLE public.scrape_attempts ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('Allow all select');
    expect(migration).toContain('Allow all insert');
  });
});
