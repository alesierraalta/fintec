/**
 * Integration test: settle_debt_partial RPC — JSON return integrity.
 * Authenticated Supabase JS against staging. Guards: RUN_SUPABASE_INTEGRATION=1,
 * exact hostname bfxkcmoccqgvkrrkkdju.supabase.co. Fixture: auth user →
 * account → USD debt (10k minor). Cleanup: afterAll discovers settlement IDs
 * from debt_settlements, deletes child-to-parent.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const RUN = process.env.RUN_SUPABASE_INTEGRATION === '1';
const describeIfLive = RUN ? describe : describe.skip;
let _realFetch: typeof globalThis.fetch | undefined;

describeIfLive('settle_debt_partial RPC', () => {
  jest.setTimeout(30_000);
  const tag = `srpc-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const ids: { userId?: string; accountId?: string; debtTxId?: string } = {};
  let anon: SupabaseClient, svc: SupabaseClient;

  const d = () => new Date().toISOString().split('T')[0];
  const CL = { auth: { autoRefreshToken: false, persistSession: false } };

  beforeAll(async () => {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    try {
      const u = new URL(rawUrl);
      if (u.hostname !== 'bfxkcmoccqgvkrrkkdju.supabase.co') throw 0;
    } catch {
      throw new Error(
        `REFUSING: NEXT_PUBLIC_SUPABASE_URL must target bfxkcmoccqgvkrrkkdju.supabase.co, got "${rawUrl}"`
      );
    }
    if (!_realFetch) {
      const undici = await import('undici');
      _realFetch = globalThis.fetch;
      (globalThis as any).fetch = undici.fetch;
    }
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!anonKey || !svcKey)
      throw new Error('Missing anon or service-role key');
    svc = createClient(rawUrl, svcKey, CL);
    anon = createClient(rawUrl, anonKey, CL);
    const pw = `pw-${randomBytes(4).toString('hex')}!`;

    // prettier-ignore
    const { data: ud, error: ue } = await svc.auth.admin.createUser({ email: `${tag}@example.com`, password: pw, email_confirm: true });
    if (ue || !ud?.user) throw new Error(`Create user: ${ue?.message}`);
    ids.userId = ud.user.id;

    // prettier-ignore
    const { error: sie } = await anon.auth.signInWithPassword({ email: `${tag}@example.com`, password: pw });
    if (sie) throw new Error(`Sign in: ${sie.message}`);

    // prettier-ignore
    const { data: ad, error: ae } = await svc.from('accounts').insert({ user_id: ids.userId, name: tag, type: 'CASH', currency_code: 'USD', balance: 100_000, active: true }).select('id').single();
    if (ae || !ad) throw new Error(`Account: ${ae?.message}`);
    ids.accountId = ad.id;

    // prettier-ignore
    const { data: dd, error: de } = await svc.from('transactions').insert({ type: 'EXPENSE', account_id: ids.accountId, currency_code: 'USD', amount_minor: 10_000, amount_base_minor: 10_000, exchange_rate: 1, date: d(), description: tag, is_debt: true, debt_direction: 'OWE', debt_status: 'OPEN', debt_paid_amount_minor: 0, debt_paid_amount_base_minor: 0 }).select('id').single();
    if (de || !dd) throw new Error(`Debt: ${de?.message}`);
    ids.debtTxId = dd.id;
  });

  afterAll(async () => {
    // prettier-ignore
    if (_realFetch) { (globalThis as any).fetch = _realFetch; _realFetch = undefined; }
    const c = svc as SupabaseClient | undefined;
    if (!c) return;
    const errs: string[] = [],
      settleIds: string[] = [];
    if (ids.debtTxId) {
      // prettier-ignore
      const { data: rows, error: discErr } = await c.from('debt_settlements').select('settlement_transaction_id').eq('debt_transaction_id', ids.debtTxId);
      if (discErr) errs.push(`discovery: ${discErr.message}`);
      if (rows)
        for (const r of rows) settleIds.push(r.settlement_transaction_id);
    }
    for (const sid of settleIds) {
      // prettier-ignore
      const { error: dse } = await c.from('debt_settlements').delete().eq('settlement_transaction_id', sid);
      if (dse) errs.push(`ds:${dse.message}`);
      // prettier-ignore
      const { error: ste } = await c.from('transactions').delete().eq('id', sid);
      if (ste) errs.push(`stx:${ste.message}`);
    }
    // prettier-ignore
    if (ids.debtTxId) { const { error: e } = await c.from('transactions').delete().eq('id', ids.debtTxId); if (e) errs.push(`dtx:${e.message}`); }
    // prettier-ignore
    if (ids.accountId) { const { error: e } = await c.from('accounts').delete().eq('id', ids.accountId); if (e) errs.push(`act:${e.message}`); }
    if (ids.userId) {
      // prettier-ignore
      await c.from('users').delete().eq('id', ids.userId).maybeSingle();
      const { error: e } = await c.auth.admin.deleteUser(ids.userId);
      if (e) errs.push(`usr:${e.message}`);
    }
    if (errs.length)
      throw new Error(`Cleanup (${errs.length}): ${errs.join('; ')}`);
  });

  it('returns valid structured JSON (would fail 22P02 if RECORD→JSON defect present)', async () => {
    // prettier-ignore
    const { data: p, error: pe } = await anon.rpc('settle_debt_partial', { p_debt_id: ids.debtTxId!, p_account_id: ids.accountId!, p_amount_minor: 4_000, p_date: d() });
    expect(pe).toBeNull();
    expect(typeof p).toBe('object');
    expect(p.id).toBe(ids.debtTxId);
    expect(p.is_debt).toBe(true);
    expect(p.debt_status).toBe('OPEN');
    expect(p.debt_paid_amount_minor).toBe(4_000);
    expect(p.debt_remaining_amount_minor).toBe(6_000);

    // prettier-ignore
    const { data: f, error: fe } = await anon.rpc('settle_debt_partial', { p_debt_id: ids.debtTxId!, p_account_id: ids.accountId!, p_amount_minor: 6_000, p_date: d() });
    expect(fe).toBeNull();
    expect(f.debt_status).toBe('SETTLED');
    expect(f.debt_paid_amount_minor).toBe(10_000);
    expect(f.debt_remaining_amount_minor).toBe(0);
    expect(f.settled_at).toBeDefined();

    // prettier-ignore
    const { data: fd, error: fde } = await anon.rpc('settle_debt_partial', { p_debt_id: ids.debtTxId!, p_account_id: ids.accountId!, p_amount_minor: 1, p_date: d() });
    expect(fd).toBeNull();
    expect(fde).toBeDefined();
    expect(fde!.message).toMatch(/already settled/i);
  });
});
