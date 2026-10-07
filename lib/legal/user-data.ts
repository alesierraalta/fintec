import type { SupabaseClient } from '@supabase/supabase-js';
import type { Budget, SavingsGoal } from '@/types';
import { createServerAppRepository } from '@/repositories/factory';
import { logger } from '@/lib/utils/logger';

/**
 * Data-subject request support.
 *
 * The Privacy Policy promises access, portability and erasure. These helpers
 * are what make those promises executable instead of decorative.
 */

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  profile: {
    id: string;
    email: string | undefined;
    createdAt: string | undefined;
  };
  accounts: unknown[];
  transactions: unknown[];
  budgets: unknown[];
  goals: unknown[];
  categories: unknown[];
  legalAcceptances: unknown[];
}

/**
 * Collects every record tied to a user in a portable, structured format
 * (GDPR art. 15 access and art. 20 portability).
 */
export async function collectUserData(
  supabase: SupabaseClient<any>,
  userId: string,
  profile: { email?: string; createdAt?: string }
): Promise<UserDataExport> {
  const repository = createServerAppRepository({ supabase });

  const accounts = await repository.accounts.findByUserId(userId);
  const accountIds = accounts.map((account) => account.id);

  const allTransactions = await repository.transactions.findAll();
  const transactions = allTransactions.filter((transaction) =>
    accountIds.includes(transaction.accountId)
  );

  const allBudgets = await repository.budgets.findAll();
  const budgets = allBudgets.filter(
    (budget: Budget) => budget.userId === userId
  );

  const allGoals = await repository.goals.findAll();
  const goals = allGoals.filter((goal: SavingsGoal) =>
    goal.accountId ? accountIds.includes(goal.accountId) : true
  );

  const categories = await repository.categories.findAll();

  const { data: legalAcceptances } = await supabase
    .from('legal_acceptances')
    .select(
      'legal_version, terms_version, privacy_version, accepted_at, source'
    )
    .eq('user_id', userId);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    profile: {
      id: userId,
      email: profile.email,
      createdAt: profile.createdAt,
    },
    accounts,
    transactions,
    budgets,
    goals,
    categories,
    legalAcceptances: legalAcceptances ?? [],
  };
}

export interface PurgeCounts {
  transactions: number;
  budgets: number;
  goals: number;
  accounts: number;
}

/**
 * Deletes every financial record owned by the user, in foreign-key-safe
 * order. Shared by the "clear data" action and account erasure so both paths
 * can never drift apart.
 */
export async function purgeUserData(
  supabase: SupabaseClient<any>,
  userId: string
): Promise<PurgeCounts> {
  const repository = createServerAppRepository({ supabase });
  const counts: PurgeCounts = {
    transactions: 0,
    budgets: 0,
    goals: 0,
    accounts: 0,
  };

  const accounts = await repository.accounts.findByUserId(userId);
  const accountIds = accounts.map((account) => account.id);

  const allTransactions = await repository.transactions.findAll();
  const userTransactions = allTransactions.filter((transaction) =>
    accountIds.includes(transaction.accountId)
  );
  if (userTransactions.length > 0) {
    await repository.transactions.deleteMany(userTransactions.map((t) => t.id));
    counts.transactions = userTransactions.length;
  }

  const allBudgets = await repository.budgets.findAll();
  const userBudgets = allBudgets.filter(
    (budget: Budget) => budget.userId === userId
  );
  if (userBudgets.length > 0) {
    await repository.budgets.deleteMany(
      userBudgets.map((budget: Budget) => budget.id)
    );
    counts.budgets = userBudgets.length;
  }

  const allGoals = await repository.goals.findAll();
  const userGoals = allGoals.filter((goal: SavingsGoal) =>
    goal.accountId ? accountIds.includes(goal.accountId) : true
  );
  if (userGoals.length > 0) {
    await repository.goals.deleteMany(
      userGoals.map((goal: SavingsGoal) => goal.id)
    );
    counts.goals = userGoals.length;
  }

  if (accountIds.length > 0) {
    await repository.accounts.deleteMany(accountIds);
    counts.accounts = accountIds.length;
  }

  try {
    await repository.notifications.deleteByUserId(userId);
  } catch (error) {
    // The notifications table is optional in some environments.
    logger.info('Notifications deletion skipped', { userId, error });
  }

  return counts;
}
