// Mappers to convert between domain models and Supabase database types

import {
  Account,
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  ExchangeRate,
  Transfer,
  User,
  AccountType,
  TransactionType,
  CategoryKind,
} from '@/types';

import {
  SupabaseAccount,
  SupabaseTransaction,
  SupabaseCategory,
  SupabaseBudget,
  SupabaseGoal,
  SupabaseExchangeRate,
  SupabaseTransfer,
  SupabaseUser,
} from './types';

// User mappers
export function mapSupabaseUserToDomain(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.name,
    baseCurrency: supabaseUser.base_currency,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
  };
}

export function mapDomainUserToSupabase(user: Partial<User>): Partial<SupabaseUser> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    base_currency: user.baseCurrency,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

// Account mappers
export function mapSupabaseAccountToDomain(supabaseAccount: SupabaseAccount): Account {
  return {
    id: supabaseAccount.id,
    userId: supabaseAccount.user_id,
    name: supabaseAccount.name,
    type: supabaseAccount.type as AccountType,
    currencyCode: supabaseAccount.currency_code,
    balance: supabaseAccount.balance,
    active: supabaseAccount.active,
    createdAt: supabaseAccount.created_at,
    updatedAt: supabaseAccount.updated_at,
  };
}

export function mapDomainAccountToSupabase(account: Partial<Account>): Partial<SupabaseAccount> {
  return {
    id: account.id,
    user_id: account.userId,
    name: account.name,
    type: account.type,
    currency_code: account.currencyCode,
    balance: account.balance,
    active: account.active,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  };
}

// Transaction mappers
export function mapSupabaseTransactionToDomain(supabaseTransaction: SupabaseTransaction): Transaction {
  return {
    id: supabaseTransaction.id,
    type: supabaseTransaction.type as TransactionType,
    accountId: supabaseTransaction.account_id,
    categoryId: supabaseTransaction.category_id,
    currencyCode: supabaseTransaction.currency_code,
    amountMinor: supabaseTransaction.amount_minor,
    amountBaseMinor: supabaseTransaction.amount_base_minor,
    exchangeRate: supabaseTransaction.exchange_rate,
    date: supabaseTransaction.date,
    description: supabaseTransaction.description,
    note: supabaseTransaction.note,
    tags: supabaseTransaction.tags,
    transferId: supabaseTransaction.transfer_id,
    createdAt: supabaseTransaction.created_at,
    updatedAt: supabaseTransaction.updated_at,
  };
}

export function mapDomainTransactionToSupabase(transaction: Partial<Transaction>): Partial<SupabaseTransaction> {
  return {
    id: transaction.id,
    type: transaction.type,
    account_id: transaction.accountId,
    category_id: transaction.categoryId,
    currency_code: transaction.currencyCode,
    amount_minor: transaction.amountMinor,
    amount_base_minor: transaction.amountBaseMinor,
    exchange_rate: transaction.exchangeRate,
    date: transaction.date,
    description: transaction.description,
    note: transaction.note,
    tags: transaction.tags,
    transfer_id: transaction.transferId,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

// Category mappers
export function mapSupabaseCategoryToDomain(supabaseCategory: SupabaseCategory): Category {
  return {
    id: supabaseCategory.id,
    name: supabaseCategory.name,
    kind: supabaseCategory.kind as CategoryKind,
    color: supabaseCategory.color,
    icon: supabaseCategory.icon,
    parentId: supabaseCategory.parent_id,
    active: supabaseCategory.active,
    createdAt: supabaseCategory.created_at,
    updatedAt: supabaseCategory.updated_at,
  };
}

export function mapDomainCategoryToSupabase(category: Partial<Category>): Partial<SupabaseCategory> {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    color: category.color,
    icon: category.icon,
    parent_id: category.parentId,
    active: category.active,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

// Budget mappers
export function mapSupabaseBudgetToDomain(supabaseBudget: SupabaseBudget): Budget {
  return {
    id: supabaseBudget.id,
    userId: '', // TODO: Get from context or join
    name: supabaseBudget.name,
    categoryId: supabaseBudget.category_id,
    monthYYYYMM: supabaseBudget.month_year,
    amountBaseMinor: supabaseBudget.amount_base_minor,
    spentMinor: supabaseBudget.spent_base_minor,
    active: supabaseBudget.active,
    createdAt: supabaseBudget.created_at,
    updatedAt: supabaseBudget.updated_at,
  };
}

export function mapDomainBudgetToSupabase(budget: Partial<Budget>): Partial<SupabaseBudget> {
  return {
    id: budget.id,
    name: budget.name,
    category_id: budget.categoryId,
    month_year: budget.monthYYYYMM,
    amount_base_minor: budget.amountBaseMinor,
    spent_base_minor: budget.spentMinor,
    active: budget.active,
    created_at: budget.createdAt,
    updated_at: budget.updatedAt,
  };
}

// Goal mappers
export function mapSupabaseGoalToDomain(supabaseGoal: SupabaseGoal): SavingsGoal {
  return {
    id: supabaseGoal.id,
    name: supabaseGoal.name,
    description: supabaseGoal.description,
    targetBaseMinor: supabaseGoal.target_base_minor,
    currentBaseMinor: supabaseGoal.current_base_minor,
    targetDate: supabaseGoal.target_date,
    accountId: supabaseGoal.account_id,
    active: supabaseGoal.active,
    createdAt: supabaseGoal.created_at,
    updatedAt: supabaseGoal.updated_at,
  };
}

export function mapDomainGoalToSupabase(goal: Partial<SavingsGoal>): Partial<SupabaseGoal> {
  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    target_base_minor: goal.targetBaseMinor,
    current_base_minor: goal.currentBaseMinor,
    target_date: goal.targetDate,
    account_id: goal.accountId,
    active: goal.active,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  };
}

// Exchange rate mappers
export function mapSupabaseExchangeRateToDomain(supabaseRate: SupabaseExchangeRate): ExchangeRate {
  return {
    id: supabaseRate.id,
    baseCurrency: supabaseRate.base_currency,
    quoteCurrency: supabaseRate.quote_currency,
    rate: supabaseRate.rate,
    date: supabaseRate.date,
    provider: supabaseRate.provider,
    createdAt: supabaseRate.created_at,
  };
}

export function mapDomainExchangeRateToSupabase(rate: Partial<ExchangeRate>): Partial<SupabaseExchangeRate> {
  return {
    id: rate.id,
    base_currency: rate.baseCurrency,
    quote_currency: rate.quoteCurrency,
    rate: rate.rate,
    date: rate.date,
    provider: rate.provider,
    created_at: rate.createdAt,
  };
}

// Transfer mappers
export function mapSupabaseTransferToDomain(supabaseTransfer: SupabaseTransfer): Transfer {
  return {
    id: supabaseTransfer.id,
    fromTransactionId: supabaseTransfer.from_transaction_id,
    toTransactionId: supabaseTransfer.to_transaction_id,
    feeMinor: supabaseTransfer.fee_minor,
    createdAt: supabaseTransfer.created_at,
  };
}

export function mapDomainTransferToSupabase(transfer: Partial<Transfer>): Partial<SupabaseTransfer> {
  return {
    id: transfer.id,
    from_transaction_id: transfer.fromTransactionId,
    to_transaction_id: transfer.toTransactionId,
    fee_minor: transfer.feeMinor,
    created_at: transfer.createdAt,
  };
}

// Utility functions for array mapping
export function mapSupabaseAccountArrayToDomain(accounts: SupabaseAccount[]): Account[] {
  return accounts.map(mapSupabaseAccountToDomain);
}

export function mapSupabaseTransactionArrayToDomain(transactions: SupabaseTransaction[]): Transaction[] {
  return transactions.map(mapSupabaseTransactionToDomain);
}

export function mapSupabaseCategoryArrayToDomain(categories: SupabaseCategory[]): Category[] {
  return categories.map(mapSupabaseCategoryToDomain);
}

export function mapSupabaseBudgetArrayToDomain(budgets: SupabaseBudget[]): Budget[] {
  return budgets.map(mapSupabaseBudgetToDomain);
}

export function mapSupabaseGoalArrayToDomain(goals: SupabaseGoal[]): SavingsGoal[] {
  return goals.map(mapSupabaseGoalToDomain);
}

export function mapSupabaseExchangeRateArrayToDomain(rates: SupabaseExchangeRate[]): ExchangeRate[] {
  return rates.map(mapSupabaseExchangeRateToDomain);
}
