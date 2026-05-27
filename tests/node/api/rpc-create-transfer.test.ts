/**
 * Integration test: create_transfer RPC availability
 *
 * Calls rpc('create_transfer', ...) via a real Supabase client
 * to verify the RPC is registered in PostgREST's schema cache.
 * Gated behind RUN_LIVE_SUPABASE_TESTS=1 env var.
 *
 * Per project convention: describeIf with env-var gating
 * (see tests/node/scrapers/bcv-scraper.node.test.ts for pattern)
 */

import { createClient } from '@supabase/supabase-js';

const RUN_LIVE_SUPABASE_TESTS = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const describeIfLive = RUN_LIVE_SUPABASE_TESTS ? describe : describe.skip;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describeIfLive('create_transfer RPC availability', () => {
  jest.setTimeout(15000);

  beforeAll(() => {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.'
      );
    }
  });

  it('should be registered in PostgREST schema (no "Node cannot be found" error)', async () => {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await client.rpc('create_transfer', {
      p_user_id: '',
      p_from_account_id: '',
      p_to_account_id: '',
      p_amount_major: 0,
      p_description: 'integration-test',
      p_date: new Date().toISOString().split('T')[0],
      p_exchange_rate: 1,
      p_rate_source: null,
    });

    // The RPC should be registered — we expect a controlled business error
    // (e.g., "Source account not found") instead of a schema error.
    if (error) {
      expect(error.message).not.toContain('Node cannot be found');
    }
  });
});
