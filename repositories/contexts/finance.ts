/**
 * Finance Bounded Context
 *
 * Groups the core financial repositories: transactions, accounts, budgets, goals.
 * This context is the primary domain for all financial data operations.
 */

import type { TransactionsRepository } from '@/repositories/contracts/transactions-repository';
import type { AccountsRepository } from '@/repositories/contracts/accounts-repository';
import type { BudgetsRepository } from '@/repositories/contracts/budgets-repository';
import type { GoalsRepository } from '@/repositories/contracts/goals-repository';

export interface FinanceContext {
  transactions: TransactionsRepository;
  accounts: AccountsRepository;
  budgets: BudgetsRepository;
  goals: GoalsRepository;
}

export interface CreateFinanceContextInput {
  transactions: TransactionsRepository;
  accounts: AccountsRepository;
  budgets: BudgetsRepository;
  goals: GoalsRepository;
}

/**
 * Factory function to create a Finance bounded context.
 *
 * @param input - Repository instances for the finance domain
 * @returns FinanceContext with grouped repository access
 */
export function createFinanceContext(input: CreateFinanceContextInput): FinanceContext {
  return {
    transactions: input.transactions,
    accounts: input.accounts,
    budgets: input.budgets,
    goals: input.goals,
  };
}
