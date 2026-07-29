import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const enabled = process.env.RUN_FINANCE_SUPABASE_CONTRACTS === '1';
const describeIfEnabled = enabled ? describe : describe.skip;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function projectRef(value: string): string {
  return new URL(value).hostname.split('.')[0];
}

function allowedProject(value: string): boolean {
  const allowlist = (
    process.env.FINANCE_TEST_SUPABASE_PROJECT_REF_ALLOWLIST ?? ''
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return allowlist.includes(projectRef(value));
}

function expectNoError<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

describeIfEnabled('finance Supabase contract', () => {
  jest.setTimeout(30_000);

  let admin: SupabaseClient;
  let userA: SupabaseClient;
  let userB: SupabaseClient;
  let userAId = '';
  let userBId = '';
  let accountA = '';
  let accountB = '';
  let categoryId = '';
  let goalId = '';
  const password = `FinanceContract-${randomUUID()}-Aa1!`;

  beforeAll(async () => {
    if (!url || !anonKey || !serviceRoleKey) {
      throw new Error(
        'Finance contract tests require Supabase URL, anon key, and service role key'
      );
    }
    if (!allowedProject(url)) {
      throw new Error(
        'Refusing finance mutations: project ref is not in FINANCE_TEST_SUPABASE_PROJECT_REF_ALLOWLIST'
      );
    }

    admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const suffix = randomUUID();
    const users = await Promise.all(
      [
        `finance-contract-a-${suffix}@example.test`,
        `finance-contract-b-${suffix}@example.test`,
      ].map((email) =>
        admin.auth.admin.createUser({ email, password, email_confirm: true })
      )
    );
    userAId = expectNoError(users[0]).user.id;
    userBId = expectNoError(users[1]).user.id;

    userA = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    userB = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expectNoError(
      await userA.auth.signInWithPassword({
        email: `finance-contract-a-${suffix}@example.test`,
        password,
      })
    );
    expectNoError(
      await userB.auth.signInWithPassword({
        email: `finance-contract-b-${suffix}@example.test`,
        password,
      })
    );

    const category = expectNoError(
      await admin
        .from('categories')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .single()
    );
    categoryId = category.id;
    accountA = expectNoError(
      await admin
        .from('accounts')
        .insert({
          user_id: userAId,
          name: 'Finance contract A',
          type: 'CASH',
          currency_code: 'USD',
          balance: 100000,
          active: true,
        })
        .select('id')
        .single()
    ).id;
    accountB = expectNoError(
      await admin
        .from('accounts')
        .insert({
          user_id: userBId,
          name: 'Finance contract B',
          type: 'CASH',
          currency_code: 'USD',
          balance: 100000,
          active: true,
        })
        .select('id')
        .single()
    ).id;
  });

  afterAll(async () => {
    if (!admin) return;
    try {
      if (goalId) await admin.from('goals').delete().eq('id', goalId);
      if (accountA) await admin.from('accounts').delete().eq('id', accountA);
      if (accountB) await admin.from('accounts').delete().eq('id', accountB);
    } finally {
      if (userAId) await admin.auth.admin.deleteUser(userAId);
      if (userBId) await admin.auth.admin.deleteUser(userBId);
    }
  });

  it('covers ordinary transaction create, read, atomic update, and delete', async () => {
    const created = expectNoError(
      await userA.rpc('create_transaction_and_adjust_balance', {
        p_account_id: accountA,
        p_category_id: categoryId,
        p_type: 'EXPENSE',
        p_currency_code: 'USD',
        p_amount_minor: 1250,
        p_amount_base_minor: 1250,
        p_exchange_rate: 1,
        p_date: '2026-07-26',
        p_description: 'Contract grocery transaction',
        p_is_debt: false,
      })
    );
    const transactionId = created.id;
    expectNoError(
      await userA
        .from('transactions')
        .select('id')
        .eq('id', transactionId)
        .single()
    );
    expectNoError(
      await userA.rpc('update_transaction_and_adjust_balance', {
        p_transaction_id: transactionId,
        p_account_id: accountA,
        p_category_id: categoryId,
        p_type: 'INCOME',
        p_currency_code: 'USD',
        p_amount_minor: 2000,
        p_amount_base_minor: 2000,
        p_exchange_rate: 1,
        p_date: '2026-07-26',
        p_description: 'Contract updated transaction',
        p_note: null,
        p_tags: null,
        p_is_debt: false,
        p_debt_direction: null,
        p_debt_status: null,
        p_debt_paid_amount_minor: 0,
        p_debt_paid_amount_base_minor: 0,
        p_counterparty_name: null,
        p_settled_at: null,
      })
    );
    expectNoError(
      await userA.rpc('delete_transaction_and_adjust_balance', {
        transaction_id: transactionId,
      })
    );
    expect(
      (await userA.from('transactions').select('id').eq('id', transactionId))
        .data
    ).toHaveLength(0);
  });

  it('covers deducted debt, settlement, and cross-user transaction RLS failure', async () => {
    const debt = expectNoError(
      await userA.rpc('create_debt_with_deduction', {
        p_account_id: accountA,
        p_category_id: categoryId,
        p_type: 'EXPENSE',
        p_currency_code: 'USD',
        p_amount_minor: 3000,
        p_amount_base_minor: 3000,
        p_exchange_rate: 1,
        p_date: '2026-07-26',
        p_description: 'Contract debt',
        p_debt_direction: 'OWED_TO_ME',
        p_deduct: true,
        p_source_account_id: accountA,
        p_source_category_id: categoryId,
      })
    );
    expectNoError(
      await userA.rpc('settle_debt_partial', {
        p_debt_id: debt.debt_id,
        p_account_id: accountA,
        p_category_id: categoryId,
        p_amount_minor: 3000,
        p_date: '2026-07-26',
      })
    );
    const crossUser = await userA.rpc('create_transaction_and_adjust_balance', {
      p_account_id: accountB,
      p_category_id: categoryId,
      p_type: 'EXPENSE',
      p_currency_code: 'USD',
      p_amount_minor: 100,
      p_amount_base_minor: 100,
      p_exchange_rate: 1,
      p_date: '2026-07-26',
      p_description: 'Unauthorized transaction',
      p_is_debt: false,
    });
    expect(crossUser.error).not.toBeNull();
  });

  it('covers atomic goal contribution add/remove and contribution RLS failure', async () => {
    goalId = expectNoError(
      await userA
        .from('goals')
        .insert({
          user_id: userAId,
          name: 'Contract goal',
          target_base_minor: 10000,
          current_base_minor: 0,
          active: true,
        })
        .select('id')
        .single()
    ).id;
    expectNoError(
      await userA.rpc('add_goal_contribution_atomic', {
        p_goal_id: goalId,
        p_delta_base_minor: 2500,
        p_note: 'Contract add',
      })
    );
    expectNoError(
      await userA.rpc('add_goal_contribution_atomic', {
        p_goal_id: goalId,
        p_delta_base_minor: -500,
        p_note: 'Contract remove',
      })
    );
    const crossUser = await userB.rpc('add_goal_contribution_atomic', {
      p_goal_id: goalId,
      p_delta_base_minor: 100,
      p_note: 'Unauthorized contribution',
    });
    expect(crossUser.error).not.toBeNull();
  });
});
