import { createClient } from '@supabase/supabase-js';
import {
  seedEvalDataset,
  EVAL_FIXTURE_PASSWORD,
  fixtureEmail,
} from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import {
  createServiceRoleClient,
  createUserSessionClient,
} from './support/auth-client';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './support/env';

/**
 * Issues #47/#48 live RLS proof against the real local Supabase stack
 * (supabase/migrations/20260810160000_harden_rate_history_scrape_attempts_rls.sql,
 * see also supabase/schemas/baseline.sql).
 *
 * Previously the public anon key could INSERT/UPDATE official
 * `bcv_rate_history` / `binance_rate_history` rows and INSERT/SELECT
 * `scrape_attempts`. The migration:
 *   * keeps public SELECT on published rate history (anon read still works),
 *   * restricts rate-history INSERT to service_role,
 *   * removes anonymous INSERT and SELECT on scrape_attempts, scoping SELECT
 *     to authenticated.
 *
 * Uses REAL clients per role: anon key (unauthenticated), a real
 * GoTrue-signed-in user (`createUserSessionClient`), and the service-role
 * client ONLY for seeding/teardown (it bypasses RLS by design, so it can
 * never prove a rejection).
 */
describe('rate-history and scrape-attempts RLS enforcement (issues #47/#48)', () => {
  const serviceClient = createServiceRoleClient();
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let fixtureUserId: string;

  const seededDate = '2026-08-10';

  beforeAll(async () => {
    const fixture = await seedEvalDataset(serviceClient, {
      userKey: 'rls-rates-owner',
    });
    fixtureUserId = fixture.userId;

    // Seed one published BCV rate + one scrape attempt via service-role.
    const { error: rateError } = await serviceClient
      .from('bcv_rate_history')
      .upsert(
        {
          date: seededDate,
          usd: 150.25,
          eur: 172.5,
          timestamp: new Date().toISOString(),
          source: 'BCV',
        },
        { onConflict: 'date' }
      );
    if (rateError) {
      throw new Error(
        `rates RLS test: failed to seed BCV rate: ${rateError.message}`
      );
    }

    const { error: attemptError } = await serviceClient
      .from('scrape_attempts')
      .insert({
        attempt_id: 'rls-proof-attempt',
        provider: 'bcv',
        trigger: 'on-demand',
        stage: 'persist',
        status: 'success',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
    if (attemptError) {
      throw new Error(
        `rates RLS test: failed to seed scrape attempt: ${attemptError.message}`
      );
    }
  });

  afterAll(async () => {
    await serviceClient
      .from('scrape_attempts')
      .delete()
      .eq('attempt_id', 'rls-proof-attempt');
    await serviceClient
      .from('bcv_rate_history')
      .delete()
      .eq('date', seededDate);
    await teardownEvalDataset(serviceClient, fixtureUserId);
  });

  it('anon CANNOT INSERT into bcv_rate_history', async () => {
    const { data, error } = await anonClient.from('bcv_rate_history').insert({
      date: '2026-08-11',
      usd: 999,
      eur: 999,
      timestamp: new Date().toISOString(),
      source: 'BCV',
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('anon CANNOT UPDATE bcv_rate_history', async () => {
    const { data, error } = await anonClient
      .from('bcv_rate_history')
      .update({ usd: 1 })
      .eq('date', seededDate);

    // RLS violation surfaces either as an error or as 0 rows updated.
    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('anon CAN SELECT published rate history (preserved public read)', async () => {
    const { data, error } = await anonClient
      .from('bcv_rate_history')
      .select('date, usd')
      .eq('date', seededDate)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.usd).toBe(150.25);
  });

  it('anon CANNOT INSERT into scrape_attempts', async () => {
    const { data, error } = await anonClient.from('scrape_attempts').insert({
      attempt_id: 'anon-poisoned',
      provider: 'bcv',
      trigger: 'on-demand',
      stage: 'persist',
      status: 'success',
      started_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('anon CANNOT SELECT scrape_attempts (operational monitoring is not public)', async () => {
    const { data, error } = await anonClient
      .from('scrape_attempts')
      .select('attempt_id')
      .eq('attempt_id', 'rls-proof-attempt');

    expect(error).not.toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('an authenticated user CAN SELECT scrape_attempts', async () => {
    const userClient = await createUserSessionClient(
      fixtureEmail('rls-rates-owner'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await userClient
      .from('scrape_attempts')
      .select('attempt_id')
      .eq('attempt_id', 'rls-proof-attempt')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.attempt_id).toBe('rls-proof-attempt');
  });

  it('service-role CAN write rate history and scrape attempts', async () => {
    const { error: rateError } = await serviceClient
      .from('binance_rate_history')
      .upsert(
        {
          date: seededDate,
          usd: 155,
          timestamp: new Date().toISOString(),
          source: 'Binance',
        },
        { onConflict: 'date' }
      );
    expect(rateError).toBeNull();

    const { error: attemptError } = await serviceClient
      .from('scrape_attempts')
      .insert({
        attempt_id: 'rls-proof-service-write',
        provider: 'binance',
        trigger: 'cron',
        stage: 'persist',
        status: 'success',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
    expect(attemptError).toBeNull();

    await serviceClient
      .from('scrape_attempts')
      .delete()
      .eq('attempt_id', 'rls-proof-service-write');
    await serviceClient
      .from('binance_rate_history')
      .delete()
      .eq('date', seededDate);
  });
});
