// Repository contracts
export * from './base-repository';
export * from './accounts-repository';
export * from './transactions-repository';
export * from './categories-repository';
export * from './budgets-repository';
export * from './goals-repository';
export * from './exchange-rates-repository';
export * from './notifications-repository';

// Main repository interface that combines all repositories
import { AccountsRepository } from './accounts-repository';
import { TransactionsRepository } from './transactions-repository';
import { CategoriesRepository } from './categories-repository';
import { BudgetsRepository } from './budgets-repository';
import { GoalsRepository } from './goals-repository';
import { ExchangeRatesRepository } from './exchange-rates-repository';
import { NotificationsRepository } from './notifications-repository';
import { Repository } from './base-repository';

export interface AppRepository extends Repository {
  accounts: AccountsRepository;
  transactions: TransactionsRepository;
  categories: CategoriesRepository;
  budgets: BudgetsRepository;
  goals: GoalsRepository;
  exchangeRates: ExchangeRatesRepository;
  notifications: NotificationsRepository;
}
