import type { SupabaseClient } from '@supabase/supabase-js';
import { runBackfill } from '@/scripts/backfill-embeddings';

export interface GoldenLabel {
  caseId: string;
  transactionId: string;
  description: string;
  amountBaseMinor: number;
}

export interface SeedEvalDatasetResult {
  userId: string;
  transactionIds: string[];
  goldenLabels: GoldenLabel[];
}

export interface SeedEvalDatasetOptions {
  /**
   * Distinguishes independent fixture identities (e.g. two isolated users
   * for a cross-user RLS test). Defaults to a single canonical fixture
   * identity, which is what makes repeated calls with the same key
   * idempotent.
   */
  userKey?: string;
}

interface GoldenCaseDefinition {
  caseId: string;
  description: string;
  note: string;
  amountMinor: number;
  currencyCode: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

/**
 * Fixed golden dataset. Amounts are already in the account's currency
 * (USD) minor units; `amountBaseMinor` mirrors `amountMinor` 1:1 since the
 * fixture account and the fixture user's base currency are both USD.
 */
const GOLDEN_CASES: GoldenCaseDefinition[] = [
  {
    caseId: 'groceries-1',
    description: 'Grocery shopping at the supermarket',
    note: 'weekly groceries run',
    amountMinor: 4550,
    currencyCode: 'USD',
    type: 'EXPENSE',
    date: '2026-01-05',
  },
  {
    caseId: 'salary-1',
    description: 'Monthly salary deposit',
    note: 'salary payment',
    amountMinor: 250000,
    currencyCode: 'USD',
    type: 'INCOME',
    date: '2026-01-01',
  },
  {
    caseId: 'rent-1',
    description: 'Apartment rent payment',
    note: 'monthly rent',
    amountMinor: 120000,
    currencyCode: 'USD',
    type: 'EXPENSE',
    date: '2026-01-03',
  },
];

const FIXTURE_PASSWORD = 'EvalFixture123!';
const EVAL_ACCOUNT_NAME = 'Eval Fixture Account';
const EVAL_CATEGORY_EXPENSE = 'Eval Fixture Expense';
const EVAL_CATEGORY_INCOME = 'Eval Fixture Income';

/** Deterministic fixture password shared by every seeded fixture user. */
export const EVAL_FIXTURE_PASSWORD = FIXTURE_PASSWORD;

/** Deterministic fixture email for a given user key. */
export function fixtureEmail(userKey: string): string {
  return `eval-fixture-${userKey}@fintec.local`;
}

async function getOrCreateFixtureUser(
  client: SupabaseClient,
  userKey: string
): Promise<string> {
  const email = fixtureEmail(userKey);

  const { data: listData, error: listError } =
    await client.auth.admin.listUsers();
  if (listError) {
    throw new Error(
      `seedEvalDataset: failed to list users: ${listError.message}`
    );
  }
  const existing = listData.users.find((u) => u.email === email);

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: FIXTURE_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(
        `seedEvalDataset: failed to create fixture user ${email}: ${error?.message}`
      );
    }
    userId = data.user.id;
  }

  // The baseline dump ships `public.handle_new_user()` but does not wire a
  // `CREATE TRIGGER ... ON auth.users` to invoke it (verified: no such
  // trigger exists in supabase/schemas/baseline.sql). Out of scope for
  // this task to fix the schema — create/repair the `public.users`
  // profile row explicitly instead of relying on a trigger that never
  // fires. Always upserted (not just on the create branch) so a fixture
  // user left over from a prior interrupted run still gets its profile
  // row repaired.
  const { error: profileError } = await client.from('users').upsert(
    {
      id: userId,
      email,
      name: email.split('@')[0],
    },
    { onConflict: 'id' }
  );
  if (profileError) {
    throw new Error(
      `seedEvalDataset: failed to create fixture user profile ${email}: ${profileError.message}`
    );
  }

  return userId;
}

async function getOrCreateAccount(
  client: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing, error: findError } = await client
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', EVAL_ACCOUNT_NAME)
    .maybeSingle();
  if (findError) {
    throw new Error(
      `seedEvalDataset: failed to look up fixture account: ${findError.message}`
    );
  }
  if (existing) {
    return existing.id as string;
  }

  const { data, error } = await client
    .from('accounts')
    .insert({
      user_id: userId,
      name: EVAL_ACCOUNT_NAME,
      type: 'BANK',
      currency_code: 'USD',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(
      `seedEvalDataset: failed to create fixture account: ${error?.message}`
    );
  }
  return data.id as string;
}

async function getOrCreateCategory(
  client: SupabaseClient,
  userId: string,
  name: string,
  kind: 'INCOME' | 'EXPENSE'
): Promise<string> {
  const { data: existing, error: findError } = await client
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .maybeSingle();
  if (findError) {
    throw new Error(
      `seedEvalDataset: failed to look up fixture category "${name}": ${findError.message}`
    );
  }
  if (existing) {
    return existing.id as string;
  }

  const { data, error } = await client
    .from('categories')
    .insert({
      user_id: userId,
      name,
      kind,
      color: '#4F46E5',
      icon: 'tag',
      is_default: false,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(
      `seedEvalDataset: failed to create fixture category "${name}": ${error?.message}`
    );
  }
  return data.id as string;
}

async function getOrCreateTransaction(
  client: SupabaseClient,
  accountId: string,
  categoryId: string,
  golden: GoldenCaseDefinition
): Promise<string> {
  const { data: existing, error: findError } = await client
    .from('transactions')
    .select('id')
    .eq('account_id', accountId)
    .eq('description', golden.description)
    .maybeSingle();
  if (findError) {
    throw new Error(
      `seedEvalDataset: failed to look up fixture transaction "${golden.description}": ${findError.message}`
    );
  }
  if (existing) {
    return existing.id as string;
  }

  const { data, error } = await client
    .from('transactions')
    .insert({
      type: golden.type,
      account_id: accountId,
      category_id: categoryId,
      currency_code: golden.currencyCode,
      amount_minor: golden.amountMinor,
      amount_base_minor: golden.amountMinor,
      date: golden.date,
      description: golden.description,
      note: golden.note,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(
      `seedEvalDataset: failed to insert fixture transaction "${golden.description}": ${error?.message}`
    );
  }
  return data.id as string;
}

/**
 * Seeds a deterministic evaluation dataset: one fixture GoTrue user, one
 * fixture account, two fixture categories (income/expense), and a fixed
 * set of golden transactions. Embedding generation reuses `runBackfill`
 * (scripts/backfill-embeddings.ts) — there is no second embedding call
 * path; the transport it flows through is whatever `getRagTransport()`
 * currently resolves to (production or a fixture set via
 * `setRagTransport`).
 *
 * Idempotent: every entity is looked up before insert, so a second call
 * with the same `userKey` reuses the existing user/account/categories/
 * transactions instead of erroring or duplicating rows.
 */
export async function seedEvalDataset(
  client: SupabaseClient,
  options: SeedEvalDatasetOptions = {}
): Promise<SeedEvalDatasetResult> {
  const userKey = options.userKey ?? 'default';

  const userId = await getOrCreateFixtureUser(client, userKey);
  const accountId = await getOrCreateAccount(client, userId);
  const expenseCategoryId = await getOrCreateCategory(
    client,
    userId,
    EVAL_CATEGORY_EXPENSE,
    'EXPENSE'
  );
  const incomeCategoryId = await getOrCreateCategory(
    client,
    userId,
    EVAL_CATEGORY_INCOME,
    'INCOME'
  );

  const transactionIds: string[] = [];
  const goldenLabels: GoldenLabel[] = [];

  for (const golden of GOLDEN_CASES) {
    const categoryId =
      golden.type === 'INCOME' ? incomeCategoryId : expenseCategoryId;
    const transactionId = await getOrCreateTransaction(
      client,
      accountId,
      categoryId,
      golden
    );

    transactionIds.push(transactionId);
    goldenLabels.push({
      caseId: golden.caseId,
      transactionId,
      description: golden.description,
      amountBaseMinor: golden.amountMinor,
    });
  }

  // Reuse the production backfill path for embedding generation — no
  // second embedding path. Only rows with a NULL embedding are processed,
  // so re-seeding never re-embeds or duplicates work.
  await runBackfill({ client, batchSize: 50, dryRun: false });

  return { userId, transactionIds, goldenLabels };
}
